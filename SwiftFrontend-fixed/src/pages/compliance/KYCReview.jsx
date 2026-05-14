import React, { useEffect, useState } from 'react'
import { formatIST, formatISTDate, formatISTTime } from '../../utils/date'
import { kycAPI } from '../../api/kyc'
import { kycDocumentsAPI, openKycDocument } from '../../api/kycdocuments'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import Table from '../../components/common/Table'
import Modal from '../../components/common/Modal'
import StatusBadge from '../../components/common/StatusBadge'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import { KYC_DOC_LABELS, KYC_REQUIRED_DOCS } from '../../utils/kyc'
import { CheckCircle, XCircle, Search, FileText, Check, X as XIcon, Eye } from 'lucide-react'

const STATUS_TABS = ['All', 'Pending', 'Verified', 'Rejected']

export default function KYCReview() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedKyc, setSelectedKyc] = useState(null)
  const [docs, setDocs] = useState([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [decision, setDecision] = useState({ verificationStatus: 'Verified', notes: '' })
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Pending')

  const load = () => {
    setLoading(true)
    kycAPI.getAll()
      // .NET camelCase: KYCID->kYCID, KYCLevel->kYCLevel; normalize for consistent access
      .then((r) => setRecords(Array.isArray(r.data) ? r.data.map((x) => ({
        ...x,
        kycId:    x.kycId    ?? x.kYCID   ?? x.kycID,
        kycLevel: x.kycLevel ?? x.kYCLevel,
        userId:   x.userId   ?? x.userID,
      })) : []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  // KYCRecord JSON serializes `KYCID` -> `kYCID` (.NET camelCase: only first char lowercased).
  // Some endpoints may also return kycId, kycID, or kycid. Handle every casing.
  const recordKey = (r) => r.kycId ?? r.kYCID ?? r.kycID ?? r.kycid

  const handleReview = async (kyc) => {
    setSelectedKyc(kyc)
    setDecision({ verificationStatus: 'Verified', notes: '' })
    setModalOpen(true)
    const id = recordKey(kyc)
    if (!id) { setDocs([]); return }
    setDocsLoading(true)
    try {
      const r = await kycDocumentsAPI.getByKyc(id)
      // .NET camelCase: KYCDocumentId->kYCDocumentId; normalize
      setDocs(Array.isArray(r.data) ? r.data.map((d) => ({ ...d, kycDocumentId: d.kycDocumentId ?? d.kYCDocumentId, fileURI: d.fileURI ?? d.fileUri })) : [])
    } catch {
      setDocs([])
    } finally {
      setDocsLoading(false)
    }
  }

  const handleVerifyDoc = async (docId, status) => {
    try {
      await kycDocumentsAPI.verify(docId, { verificationStatus: status })
      toast.success(`Document ${status.toLowerCase()}`)
      const id = recordKey(selectedKyc)
      const r = await kycDocumentsAPI.getByKyc(id)
      setDocs(Array.isArray(r.data) ? r.data.map((d) => ({ ...d, kycDocumentId: d.kycDocumentId ?? d.kYCDocumentId, fileURI: d.fileURI ?? d.fileUri })) : [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    }
  }

  const [viewingDocId, setViewingDocId] = useState(null)
  const handleViewDoc = async (docId) => {
    setViewingDocId(docId)
    try {
      await openKycDocument(docId)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not open document')
    } finally {
      setViewingDocId(null)
    }
  }

  const handleSubmitDecision = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const id = recordKey(selectedKyc)
      await kycAPI.updateStatus(id, {
        verificationStatus: decision.verificationStatus,
        notes: decision.notes,
      })
      toast.success(`KYC ${decision.verificationStatus}`)
      setModalOpen(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const filtered = records.filter((r) => {
    const matchStatus = filter === 'All' || r.verificationStatus === filter
    const matchSearch = !search || `${recordKey(r)} ${r.kycLevel} ${r.userID ?? r.userId}`.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const columns = [
    { key: 'kycid',              label: 'KYC ID',   render: (_, row) => <span className="font-mono">#{recordKey(row)}</span> },
    { key: 'userID',             label: 'User',     render: (v, row) => <span className="font-mono">#{v ?? row.userId}</span> },
    // .NET camelCase: KYCLevel -> kYCLevel; normalize both in render
    { key: 'kYCLevel',          label: 'Level',    render: (v, row) => {
        const level = v ?? row.kycLevel
        return <span className="text-sm font-medium">{level || '—'}</span>
      }
    },
    { key: 'verificationStatus', label: 'Status',   render: (v) => <StatusBadge status={v} /> },
    { key: 'createdAt',          label: 'Submitted',render: (v) => v ? formatISTDate(v) : '—' },
    { key: 'action',             label: 'Action',
      render: (_, row) => (
        <button onClick={() => handleReview(row)} className="btn-secondary text-xs py-1 px-3">
          Review
        </button>
      )
    },
  ]

  const requiredForLevel = selectedKyc ? (KYC_REQUIRED_DOCS[selectedKyc.kycLevel ?? selectedKyc.kYCLevel] || []) : []
  const uploadedTypes = new Set(docs.map((d) => d.docType))
  const allRequiredUploaded = requiredForLevel.every((t) => uploadedTypes.has(t))

  return (
    <Layout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KYC Review</h1>
          <p className="text-gray-500 text-sm">Review customer KYC submissions and verify supporting documents</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {STATUS_TABS.map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === s ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
              }`}>
              {s} {s !== 'All' && (
                <span className="ml-1 text-xs opacity-70">
                  ({records.filter((r) => r.verificationStatus === s).length})
                </span>
              )}
            </button>
          ))}
        </div>

        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search by KYC / user / level..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="form-input pl-9" />
            </div>
          </div>
          <Table columns={columns} data={filtered} loading={loading} emptyMessage="No KYC records" />
        </Card>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={`KYC Review — #${selectedKyc ? recordKey(selectedKyc) : ''}`} size="xl">
        {selectedKyc && (
          <div className="space-y-5">
            {/* KYC Info */}
            <div className="bg-gray-50 rounded-xl p-4 text-sm grid grid-cols-3 gap-4">
              <div>
                <p className="text-gray-400 text-xs uppercase">User</p>
                <p className="font-mono">#{selectedKyc.userID ?? selectedKyc.userId}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase">Level</p>
                <p className="font-semibold">{selectedKyc.kycLevel ?? selectedKyc.kYCLevel}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase">Current Status</p>
                <StatusBadge status={selectedKyc.verificationStatus} />
              </div>
              {selectedKyc.notes && (
                <div className="col-span-3">
                  <p className="text-gray-400 text-xs uppercase">Customer Notes</p>
                  <p className="text-gray-700 text-sm">{selectedKyc.notes}</p>
                </div>
              )}
            </div>

            {/* Required documents checklist */}
            <div>
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Required documents for {selectedKyc.kycLevel ?? selectedKyc.kYCLevel}</p>
              <div className="grid grid-cols-2 gap-2">
                {requiredForLevel.map((t) => (
                  <div key={t} className={`flex items-center gap-2 text-xs p-2 rounded-lg ${uploadedTypes.has(t) ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                    {uploadedTypes.has(t) ? <CheckCircle size={12} /> : <XIcon size={12} />}
                    <span>{KYC_DOC_LABELS[t]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Submitted documents */}
            <div>
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Submitted documents ({docs.length})</p>
              {docsLoading ? <Loader center /> : docs.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <FileText size={28} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No documents uploaded yet</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {docs.map((d) => {
                    const isBase64 = (d.fileURI || '').startsWith('data:')
                    const ext = isBase64
                      ? (d.fileURI.startsWith('data:image') ? 'jpg' : 'pdf')
                      : null
                    return (
                      <li key={d.kycDocumentId} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                        <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                          <FileText size={16} className="text-primary-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">
                            {KYC_DOC_LABELS[d.docType] || d.docType}
                          </p>
                          <p className="text-xs text-gray-500">{isBase64 ? `Uploaded file (.${ext})` : d.fileURI}</p>
                          {d.notes && <p className="text-xs text-gray-400 mt-0.5">{d.notes}</p>}
                        </div>
                        <StatusBadge status={d.verificationStatus || 'Pending'} />
                        <div className="flex gap-1">
                          <button type="button"
                            disabled={viewingDocId === d.kycDocumentId}
                            onClick={() => handleViewDoc(d.kycDocumentId)}
                            className="p-1.5 hover:bg-blue-50 rounded text-blue-600 disabled:opacity-40"
                            title="View document">
                            <Eye size={13} />
                          </button>
                          <button type="button" onClick={() => handleVerifyDoc(d.kycDocumentId, 'Verified')}
                            className="p-1.5 hover:bg-green-50 rounded text-green-600" title="Approve">
                            <Check size={13} />
                          </button>
                          <button type="button" onClick={() => handleVerifyDoc(d.kycDocumentId, 'Rejected')}
                            className="p-1.5 hover:bg-red-50 rounded text-red-500" title="Reject">
                            <XIcon size={13} />
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Final decision */}
            <form onSubmit={handleSubmitDecision} className="space-y-4 border-t border-gray-100 pt-4">
              {!allRequiredUploaded && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                  Customer hasn't uploaded all required documents. You can still reject with a reason.
                </div>
              )}
              <div>
                <label className="form-label">Final Decision *</label>
                <div className="flex gap-3">
                  {['Verified', 'Rejected'].map((v) => (
                    <button key={v} type="button"
                      onClick={() => setDecision((f) => ({ ...f, verificationStatus: v }))}
                      className={`flex-1 py-3 rounded-xl border-2 font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                        decision.verificationStatus === v
                          ? v === 'Verified' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {v === 'Verified' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="form-label">Analyst Notes (visible to customer)</label>
                <textarea value={decision.notes}
                  onChange={(e) => setDecision((f) => ({ ...f, notes: e.target.value }))}
                  className="form-input" rows={3}
                  placeholder="Reason for rejection / verification context..." />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Submitting...' : 'Submit Decision'}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </Layout>
  )
}
