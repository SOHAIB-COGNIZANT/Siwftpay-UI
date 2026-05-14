import React, { useEffect, useMemo, useState } from 'react'
import { formatIST, formatISTDate, formatISTTime } from '../../utils/date'
import { remittancesAPI } from '../../api/remittances'
import { customersAPI } from '../../api/customers'
import { beneficiariesAPI } from '../../api/beneficiaries'
import { documentsAPI } from '../../api/documents'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import Table from '../../components/common/Table'
import Modal from '../../components/common/Modal'
import StatusBadge from '../../components/common/StatusBadge'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import {
  CheckCircle, XCircle, RefreshCw, Filter, Eye, ShieldAlert, Clock, Users, FileText,
} from 'lucide-react'

// Pre-payout statuses an agent should review. Paid / Cancelled / Refunded are terminal.
const REVIEWABLE_STATUSES = new Set([
  'Draft', 'AwaitingDocuments', 'PendingCompliance', 'Validated',
  'ComplianceHold', 'Routing', 'Queued',
])

const FILTERS = ['Pending Review', 'All', 'Paid', 'Cancelled', 'Refunded']

export default function AgentApprovals() {
  const [remits, setRemits] = useState([])
  const [customersById, setCustomersById] = useState({})
  const [bensById, setBensById] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Pending Review')

  // Selection / detail
  const [selected, setSelected] = useState(null)        // currently-open remit
  const [reviewOpen, setReviewOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [acting, setActing] = useState(false)

  // Supporting documents for the open remittance
  const [remitDocs, setRemitDocs] = useState([])
  const [remitDocsLoading, setRemitDocsLoading] = useState(false)
  const [viewingDocId, setViewingDocId] = useState(null)

  const normalizeRemit = (r) => ({
    ...r,
    remitId:       r.remitId       ?? r.remitID,
    customerId:    r.customerId    ?? r.customerID,
    beneficiaryId: r.beneficiaryId ?? r.beneficiaryID,
  })

  const load = async () => {
    setLoading(true)
    try {
      const r = await remittancesAPI.getAll()
      const payload = r.data ?? r
      const list = (Array.isArray(payload) ? payload : []).map(normalizeRemit)
      setRemits(list)

      // Hydrate referenced customers + beneficiaries for nicer rendering.
      const uniqCustIds = Array.from(new Set(list.map((x) => x.customerId).filter(Boolean)))
      const cMap = {}
      await Promise.allSettled(uniqCustIds.map(async (cid) => {
        try {
          const c = await customersAPI.getById(cid)
          cMap[cid] = c.data ?? c
        } catch { /* ignore */ }
      }))
      setCustomersById(cMap)

      const uniqBenIds = Array.from(new Set(list.map((x) => x.beneficiaryId).filter(Boolean)))
      const bMap = {}
      await Promise.allSettled(uniqBenIds.map(async (bid) => {
        try {
          const b = await beneficiariesAPI.getById(bid)
          bMap[bid] = b.data ?? b
        } catch { /* ignore */ }
      }))
      setBensById(bMap)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load remittances')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const visible = useMemo(() => {
    if (filter === 'All') return remits
    if (filter === 'Pending Review') return remits.filter((r) => REVIEWABLE_STATUSES.has(r.status))
    return remits.filter((r) => r.status === filter)
  }, [remits, filter])

  const counts = useMemo(() => ({
    pending:   remits.filter((r) => REVIEWABLE_STATUSES.has(r.status)).length,
    paid:      remits.filter((r) => r.status === 'Paid').length,
    cancelled: remits.filter((r) => r.status === 'Cancelled').length,
    refunded:  remits.filter((r) => r.status === 'Refunded').length,
  }), [remits])

  const openReview = async (r) => {
    setSelected(r)
    setRemitDocs([])
    setReviewOpen(true)
    if (!r.remitId) return
    setRemitDocsLoading(true)
    try {
      const res = await documentsAPI.getByRemittance(r.remitId)
      const list = res.data ?? res
      setRemitDocs(Array.isArray(list) ? list.map((d) => ({ ...d, fileURI: d.fileURI ?? d.fileUri })) : [])
    } catch {
      setRemitDocs([])
    } finally {
      setRemitDocsLoading(false)
    }
  }
  const openReject = () => { setRejectReason(''); setRejectOpen(true) }

  const openRemittanceDocument = (doc) => {
    const uri = doc.fileURI
    if (!uri) { toast.error('No file attached to this document'); return }
    if (uri.startsWith('data:')) {
      const tab = window.open('about:blank', '_blank')
      if (!tab) { toast.error('Allow popups to view documents'); return }
      const [header, b64] = uri.split(',')
      const mimeMatch = header.match(/data:([^;]+)/)
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
      const binary = atob(b64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: mime })
      const url = URL.createObjectURL(blob)
      tab.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 30000)
    } else {
      window.open(uri, '_blank', 'noreferrer')
    }
    setViewingDocId(null)
  }

  const handleApprove = async () => {
    if (!selected?.remitId) return
    setActing(true)
    try {
      await remittancesAPI.approve(selected.remitId)
      toast.success(`Remittance #${selected.remitId} approved & marked Paid. Customer notified.`)
      setReviewOpen(false)
      await load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed')
    } finally {
      setActing(false)
    }
  }

  const handleReject = async () => {
    if (!selected?.remitId) return
    if (!rejectReason.trim()) { toast.error('Provide a reason'); return }
    setActing(true)
    try {
      const res = await remittancesAPI.reject(selected.remitId, rejectReason.trim())
      const refundId = res.data?.refundId ?? res.data?.data?.refundId
      toast.success(`Remittance #${selected.remitId} rejected${refundId ? `, refund #${refundId} initiated` : ''}.`)
      setRejectOpen(false)
      setReviewOpen(false)
      await load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rejection failed')
    } finally {
      setActing(false)
    }
  }

  const columns = [
    { key: 'remitId',     label: 'ID',     render: (v) => <span className="font-mono">#{v}</span> },
    { key: 'customerId',  label: 'Customer', render: (v) => <span className="font-mono">#{v}</span> },
    { key: 'fromCurrency',label: 'From' },
    { key: 'sendAmount',  label: 'Amount', render: (v, r) => {
        const amt = v ?? r.amount
        return amt != null ? `${r.fromCurrency} ${parseFloat(amt).toFixed(2)}` : '—'
      }
    },
    { key: 'toCurrency',  label: 'To' },
    { key: 'status',      label: 'Status', render: (v) => <StatusBadge status={v} /> },
    { key: 'createdDate', label: 'Submitted (IST)', render: (v) => formatIST(v) },
    { key: 'remitId',     label: 'Action',
      render: (_, row) => (
        REVIEWABLE_STATUSES.has(row.status) ? (
          <button onClick={() => openReview(row)} className="btn-secondary text-xs py-1 px-3 flex items-center gap-1">
            <Eye size={12} /> Review
          </button>
        ) : <span className="text-xs text-gray-400">— closed —</span>
      )
    },
  ]

  if (loading) return <Layout><Loader center /></Layout>

  const cust = selected ? customersById[selected.customerId] : null
  const ben  = selected ? bensById[selected.beneficiaryId] : null

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Approvals Queue</h1>
            <p className="text-gray-500 text-sm">Review customer-submitted remittances and confirm or reject the payment</p>
          </div>
          <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><Clock size={18} className="text-amber-600" /></div>
            <p className="text-2xl font-bold text-gray-900">{counts.pending}</p>
            <p className="text-sm text-gray-500">Pending Review</p>
          </div>
          <div className="stat-card">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center"><CheckCircle size={18} className="text-green-600" /></div>
            <p className="text-2xl font-bold text-gray-900">{counts.paid}</p>
            <p className="text-sm text-gray-500">Paid</p>
          </div>
          <div className="stat-card">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><XCircle size={18} className="text-red-600" /></div>
            <p className="text-2xl font-bold text-gray-900">{counts.cancelled}</p>
            <p className="text-sm text-gray-500">Cancelled</p>
          </div>
          <div className="stat-card">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center"><Users size={18} className="text-orange-600" /></div>
            <p className="text-2xl font-bold text-gray-900">{counts.refunded}</p>
            <p className="text-sm text-gray-500">Refunded</p>
          </div>
        </div>

        <Card>
          <div className="flex items-center gap-3 mb-4">
            <Filter size={14} className="text-gray-400" />
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-xs rounded-full ${filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <Table columns={columns} data={visible} loading={false} emptyMessage="No remittances in this view" />
        </Card>
      </div>

      {/* Review modal */}
      <Modal open={reviewOpen} onClose={() => setReviewOpen(false)}
        title={selected ? `Review Remittance #${selected.remitId}` : 'Review Remittance'} size="lg">
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide">Status</p>
                <StatusBadge status={selected.status} />
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide">Submitted</p>
                <p>{formatIST(selected.createdDate)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide">From</p>
                <p className="font-semibold">
                  {selected.fromCurrency} {parseFloat(selected.sendAmount ?? selected.amount ?? 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide">To</p>
                <p className="font-semibold">{selected.toCurrency} {selected.receiverAmount != null ? parseFloat(selected.receiverAmount).toFixed(2) : '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide">Rate Applied</p>
                <p>{selected.rateApplied ?? '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide">Fee</p>
                <p>{selected.feeApplied ?? '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide">Purpose</p>
                <p>{selected.purposeCode || '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide">Source of Funds</p>
                <p>{selected.sourceOfFunds || '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-xs font-semibold text-gray-700 uppercase mb-1">Customer</p>
                <p className="font-mono text-xs text-gray-500">#{selected.customerId}</p>
                {cust ? (
                  <>
                    <p className="text-xs text-gray-600 mt-1">User #{cust.userID ?? cust.userId}</p>
                    <p className="text-xs text-gray-600">Risk: {cust.riskRating ?? '—'}</p>
                    <p className="text-xs text-gray-600">{cust.nationality || '—'}</p>
                  </>
                ) : <p className="text-xs text-gray-400">Loading…</p>}
              </div>
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-xs font-semibold text-gray-700 uppercase mb-1">Beneficiary</p>
                <p className="font-mono text-xs text-gray-500">#{selected.beneficiaryId}</p>
                {ben ? (
                  <>
                    <p className="text-sm font-medium text-gray-900 mt-1">{ben.name}</p>
                    <p className="text-xs text-gray-600">{ben.bankName} • {ben.country}</p>
                    <p className="text-xs text-gray-600 font-mono">{ben.accountOrWalletNo}</p>
                    <p className="text-xs text-gray-600">{ben.payoutMode}</p>
                  </>
                ) : <p className="text-xs text-gray-400">Loading…</p>}
              </div>
            </div>

            {/* Supporting documents */}
            <div>
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                Supporting Documents ({remitDocs.length})
              </p>
              {remitDocsLoading ? <Loader size="sm" /> : remitDocs.length === 0 ? (
                <div className="text-center py-5 bg-gray-50 rounded-xl">
                  <FileText size={24} className="text-gray-300 mx-auto mb-1" />
                  <p className="text-xs text-gray-400">No supporting documents uploaded</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {remitDocs.map((d) => (
                    <li key={d.documentId ?? d.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                      <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                        <FileText size={14} className="text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-xs">{d.documentType || d.docType || 'Document'}</p>
                        <p className="text-xs text-gray-400 truncate">{(d.fileURI || '').startsWith('data:') ? 'Uploaded file' : d.fileURI || '—'}</p>
                      </div>
                      <button
                        type="button"
                        disabled={viewingDocId === (d.documentId ?? d.id)}
                        onClick={() => { setViewingDocId(d.documentId ?? d.id); openRemittanceDocument(d) }}
                        className="p-1.5 hover:bg-blue-50 rounded text-blue-600 disabled:opacity-40"
                        title="View document">
                        <Eye size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Compliance gate banner — shown when status is not Validated */}
            {selected?.status === 'PendingCompliance' && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-800">
                <ShieldAlert size={14} className="mt-0.5 flex-shrink-0" />
                <span><strong>Awaiting Compliance Review.</strong> A compliance analyst must review and approve this remittance before it can be processed. You can reject it if needed.</span>
              </div>
            )}
            {selected?.status === 'ComplianceHold' && (
              <div className="bg-red-50 border border-red-300 rounded-xl p-3 flex items-start gap-2 text-xs text-red-800">
                <ShieldAlert size={14} className="mt-0.5 flex-shrink-0" />
                <span><strong>Compliance Hold.</strong> This remittance has been flagged by the compliance team. It cannot be approved until compliance resolves the hold. You can reject it.</span>
              </div>
            )}
            {selected?.status === 'Draft' && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-start gap-2 text-xs text-gray-700">
                <ShieldAlert size={14} className="mt-0.5 flex-shrink-0" />
                <span><strong>Not yet validated.</strong> This remittance is still in Draft. Run validation first before approving.</span>
              </div>
            )}
            {selected?.status === 'Validated' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-800">
                <ShieldAlert size={14} className="mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Approving</strong> marks this transfer as <strong>Paid</strong>; the customer is notified that their payment is complete.
                  <br />
                  <strong>Rejecting</strong> cancels the transfer and auto-creates a refund record for the full send amount; the customer is notified.
                </span>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={() => setReviewOpen(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={openReject} disabled={acting} className="btn-danger flex-1 flex items-center justify-center gap-2">
                <XCircle size={15} /> Reject
              </button>
              <button onClick={handleApprove}
                disabled={acting || selected?.status !== 'Validated'}
                title={selected?.status !== 'Validated' ? 'Remittance must be Validated (compliance cleared) before approval' : ''}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                <CheckCircle size={15} /> {acting ? 'Approving…' : 'Approve & Pay'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject modal */}
      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)}
        title={selected ? `Reject Remittance #${selected.remitId}` : 'Reject Remittance'}>
        <form onSubmit={(e) => { e.preventDefault(); handleReject() }} className="space-y-4">
          <p className="text-sm text-gray-500">
            This will mark the remittance as <strong>Cancelled</strong> and automatically create a
            refund record for the full send amount. The customer will receive an in-app notification
            with this reason.
          </p>
          <div>
            <label className="form-label">Reason for rejection *</label>
            <textarea required minLength={3} rows={4}
              value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              className="form-input"
              placeholder="e.g. Beneficiary details look suspicious / Sanctions match / Amount inconsistent with declared source of funds…" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setRejectOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={acting} className="btn-danger flex-1 flex items-center justify-center gap-2">
              <XCircle size={15} /> {acting ? 'Rejecting…' : 'Confirm Reject + Refund'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}
