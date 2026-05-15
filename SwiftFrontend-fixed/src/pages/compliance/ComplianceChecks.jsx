import React, { useEffect, useState, useCallback } from 'react'
import { formatISTDate } from '../../utils/date'
import { remittancesAPI } from '../../api/remittances'
import { complianceAPI } from '../../api/compliance'
import { documentsAPI } from '../../api/documents'
import { useAuth } from '../../context/AuthContext'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import Table from '../../components/common/Table'
import Modal from '../../components/common/Modal'
import StatusBadge from '../../components/common/StatusBadge'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import { CheckCircle, AlertTriangle, Clock, XCircle, Search, RefreshCw, Info, FileText, Eye } from 'lucide-react'

// Statuses compliance can act on
const ACTIONABLE = new Set(['PendingCompliance', 'ComplianceHold'])

// What each decision does to the remittance status (mirrors backend logic)
const DECISION_OUTCOME = {
  Approve: { label: 'Approve',  icon: CheckCircle,    color: 'border-green-500 bg-green-50 text-green-700',   outcome: '→ Validated (agent can now approve)' },
  Hold:    { label: 'Hold',     icon: Clock,          color: 'border-amber-500 bg-amber-50 text-amber-700',   outcome: '→ ComplianceHold (blocks agent approval)' },
  Reject:  { label: 'Reject',   icon: XCircle,        color: 'border-red-500 bg-red-50 text-red-700',         outcome: '→ Cancelled + RefundRef created' },
}

export default function ComplianceChecks() {
  const { user } = useAuth()
  const [remittances, setRemittances] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRemit, setSelectedRemit] = useState(null)
  const [decisions, setDecisions] = useState([])
  const [decisionForm, setDecisionForm] = useState({ decision: 'Approve', notes: '' })
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Pending')

  const [remitDocs, setRemitDocs] = useState([])
  const [remitDocsLoading, setRemitDocsLoading] = useState(false)
  const [viewingDocId, setViewingDocId] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    remittancesAPI.getAll()
      .then((r) => setRemittances(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const openDecision = async (remit) => {
    setSelectedRemit(remit)
    setRemitDocs([])
    try {
      const r = await complianceAPI.getDecisionsByRemit(remit.remitId)
      setDecisions(Array.isArray(r.data) ? r.data : [])
    } catch { setDecisions([]) }
    setDecisionForm({ decision: 'Approve', notes: '' })
    setModalOpen(true)
    if (remit.remitId) {
      setRemitDocsLoading(true)
      try {
        const res = await documentsAPI.getByRemittance(remit.remitId)
        const list = res.data ?? res
        setRemitDocs(Array.isArray(list) ? list.map((d) => ({ ...d, fileURI: d.fileURI ?? d.fileUri })) : [])
      } catch {
        setRemitDocs([])
      } finally {
        setRemitDocsLoading(false)
      }
    }
  }

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

  const handleDecision = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await complianceAPI.createDecision({
        remitId:    String(selectedRemit.remitId),
        analystId:  String(user?.userId ?? ''),
        decision:   decisionForm.decision,
        notes:      decisionForm.notes,
      })
      const outcome = DECISION_OUTCOME[decisionForm.decision]
      toast.success(`Decision recorded: ${decisionForm.decision} ${outcome.outcome}`)
      setModalOpen(false)
      load() // Reload so status update is reflected immediately in the table
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record decision')
    } finally {
      setSaving(false)
    }
  }

  // Filter tabs
  const tabs = [
    { key: 'Pending',  label: 'Needs Review', filter: (r) => ACTIONABLE.has(r.status) },
    { key: 'All',      label: 'All',          filter: () => true },
    { key: 'Cleared',  label: 'Cleared',      filter: (r) => r.status === 'Validated' },
    { key: 'Rejected', label: 'Rejected',     filter: (r) => r.status === 'Cancelled' },
  ]
  const activeTab = tabs.find((t) => t.key === statusFilter)
  const filtered = remittances
    .filter(activeTab?.filter ?? (() => true))
    .filter((r) => !search || `${r.remitId} ${r.status} ${r.fromCurrency} ${r.toCurrency} ${r.purposeCode ?? ''}`.toLowerCase().includes(search.toLowerCase()))

  const stats = [
    { label: 'Needs Review', value: remittances.filter((r) => ACTIONABLE.has(r.status)).length, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'On Hold',      value: remittances.filter((r) => r.status === 'ComplianceHold').length, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Cleared',      value: remittances.filter((r) => r.status === 'Validated').length, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Rejected',     value: remittances.filter((r) => r.status === 'Cancelled').length, color: 'text-gray-600', bg: 'bg-gray-50' },
  ]

  const columns = [
    { key: 'remitId',     label: 'ID',       render: (v) => <span className="font-mono">#{v}</span> },
    { key: 'createdDate', label: 'Date',     render: (v) => formatISTDate(v) },
    { key: 'fromCurrency',label: 'Corridor', render: (_, r) => `${r.fromCurrency}→${r.toCurrency}` },
    { key: 'sendAmount',  label: 'Amount',   render: (v, r) => `${r.fromCurrency} ${v?.toFixed(2)}` },
    { key: 'purposeCode', label: 'Purpose' },
    { key: 'status',      label: 'Status',   render: (v) => <StatusBadge status={v} /> },
    { key: 'remitId',     label: 'Action',
      render: (_, row) =>
        ACTIONABLE.has(row.status) ? (
          <button onClick={() => openDecision(row)} className="btn-secondary text-xs py-1 px-3">
            Review
          </button>
        ) : (
          <span className="text-xs text-gray-400">— {row.status === 'Validated' ? 'cleared' : row.status === 'Cancelled' ? 'rejected' : 'closed'} —</span>
        )
    },
  ]

  if (loading) return <Layout><Loader center /></Layout>

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Compliance Checks</h1>
            <p className="text-gray-500 text-sm">AML / PEP / Sanctions review — your decisions drive remittance status</p>
          </div>
          <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="stat-card">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg}`}>
                <AlertTriangle size={18} className={s.color} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        <Card>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search by ID, corridor, purpose..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="form-input pl-9" />
            </div>
            <div className="flex gap-2">
              {tabs.map((t) => (
                <button key={t.key} onClick={() => setStatusFilter(t.key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${statusFilter === t.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <Table columns={columns} data={filtered} loading={false} emptyMessage="No remittances in this category" />
        </Card>
      </div>

      {/* Decision Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={`Compliance Review — Remittance #${selectedRemit?.remitId}`} size="lg">
        {selectedRemit && (
          <div className="space-y-4">

            {/* Remittance summary */}
            <div className="grid grid-cols-3 gap-3 bg-gray-50 rounded-xl p-3 text-sm">
              <div><p className="text-gray-400 text-xs uppercase">Corridor</p><p className="font-semibold">{selectedRemit.fromCurrency} → {selectedRemit.toCurrency}</p></div>
              <div><p className="text-gray-400 text-xs uppercase">Send Amount</p><p className="font-semibold">{selectedRemit.fromCurrency} {selectedRemit.sendAmount?.toFixed(2)}</p></div>
              <div><p className="text-gray-400 text-xs uppercase">Current Status</p><StatusBadge status={selectedRemit.status} /></div>
              <div><p className="text-gray-400 text-xs uppercase">Purpose</p><p>{selectedRemit.purposeCode ?? '—'}</p></div>
              <div><p className="text-gray-400 text-xs uppercase">Source of Funds</p><p>{selectedRemit.sourceOfFunds ?? '—'}</p></div>
              <div><p className="text-gray-400 text-xs uppercase">Receiver Gets</p><p className="font-semibold text-green-700">{selectedRemit.toCurrency} {selectedRemit.receiverAmount?.toFixed(2) ?? '—'}</p></div>
            </div>

            {/* Supporting documents */}
            <div>
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                Supporting Documents ({remitDocs.length})
              </p>
              {remitDocsLoading ? <Loader size="sm" /> : remitDocs.length === 0 ? (
                <div className="text-center py-4 bg-gray-50 rounded-xl">
                  <FileText size={22} className="text-gray-300 mx-auto mb-1" />
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

            {/* Previous decisions */}
            {decisions.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Previous Decisions</p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {decisions.map((d) => (
                    <div key={d.decisionId} className="flex items-center gap-3 bg-gray-50 rounded-lg p-2.5 text-sm">
                      {d.decision === 'Approve' || d.decision === 1
                        ? <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                        : d.decision === 'Hold' || d.decision === 2
                          ? <Clock size={14} className="text-amber-500 flex-shrink-0" />
                          : <XCircle size={14} className="text-red-500 flex-shrink-0" />}
                      <span className="font-medium w-14">{d.decision}</span>
                      <span className="text-gray-500 flex-1 text-xs">{d.notes}</span>
                      <span className="text-xs text-gray-400">{formatISTDate(d.decisionDate)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleDecision} className="space-y-4">
              <div>
                <label className="form-label">Your Decision *</label>
                <div className="flex gap-3">
                  {Object.entries(DECISION_OUTCOME).map(([key, meta]) => {
                    const Icon = meta.icon
                    return (
                      <button key={key} type="button"
                        onClick={() => setDecisionForm((f) => ({ ...f, decision: key }))}
                        className={`flex-1 py-2.5 rounded-xl border-2 font-medium text-sm transition-all flex flex-col items-center gap-1 ${decisionForm.decision === key ? meta.color : 'border-gray-200 text-gray-400'}`}>
                        <Icon size={16} />
                        {meta.label}
                      </button>
                    )
                  })}
                </div>
                {/* Show what will happen */}
                <div className="mt-2 flex items-start gap-2 bg-blue-50 rounded-lg p-2.5 text-xs text-blue-700">
                  <Info size={13} className="mt-0.5 flex-shrink-0" />
                  <span><strong>{decisionForm.decision}</strong> will change remittance status: <strong>{DECISION_OUTCOME[decisionForm.decision]?.outcome}</strong></span>
                </div>
              </div>

              <div>
                <label className="form-label">Notes * <span className="text-gray-400 font-normal">(required — will be sent to customer)</span></label>
                <textarea required value={decisionForm.notes}
                  onChange={(e) => setDecisionForm((f) => ({ ...f, notes: e.target.value }))}
                  className="form-input" rows={3} placeholder={
                    decisionForm.decision === 'Approve' ? 'Transaction passed AML/sanctions screening.' :
                    decisionForm.decision === 'Hold'    ? 'Additional documentation required: ...' :
                    'Transaction rejected due to: ...'
                  } />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving}
                  className={`flex-1 btn-primary flex items-center justify-center gap-2 ${decisionForm.decision === 'Reject' ? '!bg-red-600 hover:!bg-red-700' : decisionForm.decision === 'Hold' ? '!bg-amber-500 hover:!bg-amber-600' : ''}`}>
                  {saving ? 'Recording...' : `Record ${decisionForm.decision}`}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </Layout>
  )
}
