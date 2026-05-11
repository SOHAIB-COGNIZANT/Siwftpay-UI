import React, { useEffect, useState } from 'react'
import { formatIST, formatISTDate, formatISTTime } from '../../utils/date'
import { useParams, Link } from 'react-router-dom'
import { remittancesAPI } from '../../api/remittances'
import { documentsAPI } from '../../api/documents'
import { cancellationsAPI } from '../../api/cancellations'
import { amendmentsAPI } from '../../api/amendments'
import { useAuth } from '../../context/AuthContext'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import Modal from '../../components/common/Modal'
import StatusBadge from '../../components/common/StatusBadge'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import { ArrowLeft, Upload, FileText, CheckCircle, Clock, AlertCircle, XCircle, FileEdit } from 'lucide-react'

const CANCELLABLE_STATUSES = new Set(['Draft', 'AwaitingDocuments', 'PendingCompliance', 'Validated', 'ComplianceHold'])
const AMENDABLE_STATUSES   = new Set(['Draft', 'AwaitingDocuments', 'PendingCompliance', 'Validated', 'ComplianceHold'])
const AMENDABLE_FIELDS     = ['PurposeCode', 'SourceOfFunds', 'BeneficiaryId', 'SendAmount']
const CANCEL_REASONS = [
  'Change of mind',
  'Wrong beneficiary details',
  'Duplicate transaction',
  'Sending to a different recipient',
  'Other',
]

const TIMELINE_MAP = {
  Draft:          { icon: Clock, color: 'text-gray-400', label: 'Draft created' },
  Validated:      { icon: CheckCircle, color: 'text-blue-500', label: 'Validated' },
  ComplianceHold: { icon: AlertCircle, color: 'text-yellow-500', label: 'Compliance Review' },
  Routing:        { icon: Clock, color: 'text-indigo-500', label: 'Being Routed' },
  Queued:         { icon: Clock, color: 'text-purple-500', label: 'Queued for Payout' },
  Paid:           { icon: CheckCircle, color: 'text-green-500', label: 'Paid Successfully' },
  Cancelled:      { icon: AlertCircle, color: 'text-red-500', label: 'Cancelled' },
  Refunded:       { icon: CheckCircle, color: 'text-orange-500', label: 'Refunded' },
}

export default function RemittanceDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [remittance, setRemittance] = useState(null)
  const [validations, setValidations] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [docForm, setDocForm] = useState({ docType: 'IDProof' })
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)

  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0])
  const [cancelling, setCancelling] = useState(false)

  const [amendOpen, setAmendOpen] = useState(false)
  const [amendForm, setAmendForm] = useState({ fieldChanged: 'PurposeCode', oldValue: '', newValue: '' })
  const [amending, setAmending] = useState(false)

  useEffect(() => {
    // Use allSettled so a missing/empty side resource (e.g. no validations yet right after
    // the remit is created) doesn't blow up the whole detail view.
    Promise.allSettled([
      remittancesAPI.getById(id),
      remittancesAPI.getValidations(id),
      documentsAPI.getByRemittance(id),
    ]).then(([rRes, vRes, dRes]) => {
      if (rRes.status === 'fulfilled') {
        setRemittance(rRes.value.data ?? rRes.value)
      } else {
        toast.error('Failed to load remittance')
      }
      if (vRes.status === 'fulfilled') {
        const payload = vRes.value.data ?? vRes.value
        setValidations(Array.isArray(payload) ? payload : [])
      } else {
        setValidations([])  // missing endpoint / empty — silent fallback
      }
      if (dRes.status === 'fulfilled') {
        const payload = dRes.value.data ?? dRes.value
        setDocuments(Array.isArray(payload) ? payload : [])
      } else {
        setDocuments([])
      }
    }).finally(() => setLoading(false))
  }, [id])

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const MAX_MB = 5
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`File too large — max ${MAX_MB} MB`)
      e.target.value = ''
      return
    }
    setSelectedFile(file)
    // Generate a preview URL for images
    if (file.type.startsWith('image/')) {
      setFilePreview(URL.createObjectURL(file))
    } else {
      setFilePreview(null)
    }
  }

  const handleUploadDoc = async (e) => {
    e.preventDefault()
    if (!selectedFile) { toast.error('Please select a file'); return }
    setUploading(true)
    try {
      // Convert file to base64 data URL — stored in FileURI column (nvarchar MAX)
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)   // "data:application/pdf;base64,JVBERi..."
        reader.onerror = reject
        reader.readAsDataURL(selectedFile)
      })

      // POST /api/remittances/{id}/documents — saves doc AND triggers PendingCompliance
      await remittancesAPI.uploadDocument(parseInt(id), {
        remitId: parseInt(id),
        docType: docForm.docType,
        fileURI: base64,
      })

      // Reload remittance (status → PendingCompliance) + docs list
      const [remitRes, docsRes] = await Promise.all([
        remittancesAPI.getById(id),
        documentsAPI.getByRemittance(id),
      ])
      if (remitRes.data) setRemittance(remitRes.data)
      setDocuments(Array.isArray(docsRes.data) ? docsRes.data : [])
      setSelectedFile(null)
      setFilePreview(null)
      setDocForm({ docType: 'IDProof' })
      toast.success('Document submitted — your remittance is now in Compliance Review')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed')
    } finally {
      setUploading(false)
    }
  }

  const handleRequestCancel = async (e) => {
    e.preventDefault()
    setCancelling(true)
    try {
      await cancellationsAPI.create({
        remitID: parseInt(id),
        reason: cancelReason,
      })
      toast.success('Cancellation requested. Operations will process it shortly.')
      setCancelOpen(false)
      // refresh detail
      const r = await remittancesAPI.getById(id)
      setRemittance(r.data ?? r)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancellation request failed')
    } finally {
      setCancelling(false)
    }
  }

  const handleRequestAmend = async (e) => {
    e.preventDefault()
    if (!amendForm.newValue.trim()) { toast.error('New value is required'); return }
    setAmending(true)
    try {
      await amendmentsAPI.create({
        remitID: parseInt(id),
        fieldChanged: amendForm.fieldChanged,
        oldValue: amendForm.oldValue,
        newValue: amendForm.newValue,
        requestedBy: user?.userId,
      })
      toast.success('Amendment requested. Operations will review.')
      setAmendOpen(false)
      setAmendForm({ fieldChanged: 'PurposeCode', oldValue: '', newValue: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Amendment request failed')
    } finally {
      setAmending(false)
    }
  }

  if (loading) return <Layout><Loader center /></Layout>
  if (!remittance) return <Layout><p className="text-gray-500 text-center py-20">Remittance not found</p></Layout>

  const StatusIcon = TIMELINE_MAP[remittance.status]?.icon || Clock
  const statusColor = TIMELINE_MAP[remittance.status]?.color || 'text-gray-400'
  const canCancel = CANCELLABLE_STATUSES.has(remittance.status)
  const canAmend  = AMENDABLE_STATUSES.has(remittance.status)

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <Link to="/customer/remittances" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Transaction #{remittance.remitId}</h1>
            <p className="text-sm text-gray-500">{formatIST(remittance.createdDate)}</p>
          </div>
          <div className="ml-auto">
            <StatusBadge status={remittance.status} />
          </div>
        </div>

        {/* Amount summary */}
        <div className="gradient-hero rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm">You Sent</p>
              <p className="text-3xl font-bold">
                {remittance.fromCurrency} {(remittance.sendAmount ?? remittance.amount ?? 0).toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-blue-200 text-sm">Recipient Gets</p>
              <p className="text-3xl font-bold text-accent-300">
                {remittance.toCurrency} {remittance.receiverAmount?.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center mt-4 gap-4 text-sm text-blue-200">
            <span>Rate: {remittance.rateApplied ?? '—'}</span>
            <span>•</span>
            <span>Fee: {remittance.fromCurrency} {remittance.feeApplied ?? '0.00'}</span>
          </div>
        </div>

        {/* Customer actions: amend / cancel — only while pre-payout */}
        {(canCancel || canAmend) && (
          <Card title="Actions">
            <div className="flex flex-wrap gap-3">
              {canAmend && (
                <button onClick={() => {
                    setAmendForm({ fieldChanged: 'PurposeCode', oldValue: remittance.purposeCode || '', newValue: '' })
                    setAmendOpen(true)
                  }}
                  className="btn-secondary flex items-center gap-2 text-sm">
                  <FileEdit size={14} /> Request Amendment
                </button>
              )}
              {canCancel && (
                <button onClick={() => setCancelOpen(true)}
                  className="btn-danger flex items-center gap-2 text-sm">
                  <XCircle size={14} /> Request Cancellation
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Operations will process your request. You'll be notified once approved or rejected.
            </p>
          </Card>
        )}

        {/* Details */}
        <div className="grid md:grid-cols-2 gap-5">
          <Card title="Transfer Details">
            <dl className="space-y-3 text-sm">
              {[
                ['Purpose', remittance.purposeCode],
                ['Source of Funds', remittance.sourceOfFunds],
                ['From Currency', remittance.fromCurrency],
                ['To Currency', remittance.toCurrency],
                ['Quote ID', remittance.quoteId ? `#${remittance.quoteId}` : '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="font-medium text-gray-900">{v || '—'}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card title="Validation Results">
            {validations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No validations yet</p>
            ) : (
              <ul className="space-y-2">
                {validations.map((v) => (
                  <li key={v.validationId} className="flex items-center gap-2 text-sm">
                    {v.result === 'Pass'
                      ? <CheckCircle size={14} className="text-green-500" />
                      : <AlertCircle size={14} className="text-red-500" />}
                    <span className={v.result === 'Pass' ? 'text-gray-700' : 'text-red-600'}>{v.rule ?? v.ruleName}</span>
                    <span className="ml-auto text-xs text-gray-400">{v.result}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Documents */}
        <Card title="Supporting Documents"
          action={<span className="text-xs text-gray-400">{documents.length} uploaded</span>}>
          {documents.length > 0 && (
            <ul className="space-y-2 mb-4">
              {documents.map((d) => (
                <li key={d.documentId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg text-sm">
                  <FileText size={16} className="text-primary-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800">{d.docType}</p>
                    <StatusBadge status={d.verificationStatus || 'Pending'} />
                  </div>
                  {d.fileURI?.startsWith('data:') ? (
                    <a href={d.fileURI}
                      download={`${d.docType}.${d.fileURI.startsWith('data:image') ? 'jpg' : 'pdf'}`}
                      className="text-xs text-primary-600 hover:underline flex items-center gap-1 flex-shrink-0">
                      ↓ Download
                    </a>
                  ) : d.fileURI ? (
                    <a href={d.fileURI} target="_blank" rel="noreferrer"
                      className="text-xs text-primary-600 hover:underline flex-shrink-0">View</a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={handleUploadDoc} className="space-y-3 border-t border-gray-100 pt-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Submit Supporting Document</p>
              <p className="text-xs text-gray-400 mt-0.5">Upload PDF or image (JPG, PNG) — max 5 MB. Submitting moves this remittance to Compliance Review.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Document Type</label>
                <select value={docForm.docType}
                  onChange={(e) => setDocForm((f) => ({ ...f, docType: e.target.value }))}
                  className="form-select">
                  {['IDProof', 'SoF', 'Invoice', 'Declaration'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">File (PDF / JPG / PNG)</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer" />
              </div>
            </div>
            {selectedFile && (
              <div className="flex items-center gap-3 bg-blue-50 rounded-lg p-2.5 text-xs text-blue-800">
                <FileText size={14} className="flex-shrink-0" />
                <span className="flex-1 truncate">{selectedFile.name}</span>
                <span className="text-blue-500">{(selectedFile.size / 1024).toFixed(0)} KB</span>
                {filePreview && <img src={filePreview} alt="preview" className="h-8 w-8 object-cover rounded" />}
              </div>
            )}
            <button type="submit" disabled={uploading || !selectedFile}
              className="btn-primary flex items-center gap-2 disabled:opacity-50">
              <Upload size={14} /> {uploading ? 'Uploading...' : 'Submit for Compliance Review'}
            </button>
          </form>
        </Card>
      </div>

      {/* Cancellation request modal */}
      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Request Cancellation">
        <form onSubmit={handleRequestCancel} className="space-y-4">
          <p className="text-sm text-gray-500">
            Your cancellation request will be sent to Operations. You'll be notified once it's processed.
          </p>
          <div>
            <label className="form-label">Reason *</label>
            <select required value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="form-select">
              {CANCEL_REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setCancelOpen(false)} className="btn-secondary flex-1">Back</button>
            <button type="submit" disabled={cancelling} className="btn-danger flex-1">
              {cancelling ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Amendment request modal */}
      <Modal open={amendOpen} onClose={() => setAmendOpen(false)} title="Request Amendment">
        <form onSubmit={handleRequestAmend} className="space-y-4">
          <p className="text-sm text-gray-500">
            Choose the field you'd like changed and provide the new value. Operations will review.
          </p>
          <div>
            <label className="form-label">Field to change *</label>
            <select required value={amendForm.fieldChanged}
              onChange={(e) => {
                const f = e.target.value
                const oldFromRemit =
                  f === 'PurposeCode'   ? remittance.purposeCode :
                  f === 'SourceOfFunds' ? remittance.sourceOfFunds :
                  f === 'BeneficiaryId' ? String(remittance.beneficiaryId ?? '') :
                  f === 'SendAmount'    ? String(remittance.sendAmount ?? remittance.amount ?? '') : ''
                setAmendForm((s) => ({ ...s, fieldChanged: f, oldValue: oldFromRemit ?? '' }))
              }}
              className="form-select">
              {AMENDABLE_FIELDS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Current value</label>
              <input value={amendForm.oldValue} readOnly className="form-input bg-gray-50" />
            </div>
            <div>
              <label className="form-label">New value *</label>
              <input required value={amendForm.newValue}
                onChange={(e) => setAmendForm((s) => ({ ...s, newValue: e.target.value }))}
                className="form-input" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setAmendOpen(false)} className="btn-secondary flex-1">Back</button>
            <button type="submit" disabled={amending} className="btn-primary flex-1">
              {amending ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}
