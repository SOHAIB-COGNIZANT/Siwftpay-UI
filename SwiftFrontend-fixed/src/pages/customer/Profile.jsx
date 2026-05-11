import React, { useEffect, useState } from 'react'
import { formatIST, formatISTDate, formatISTTime } from '../../utils/date'
import { useAuth } from '../../context/AuthContext'
import { customersAPI } from '../../api/customers'
import { kycAPI } from '../../api/kyc'
import { kycDocumentsAPI, openKycDocument } from '../../api/kycdocuments'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import StatusBadge from '../../components/common/StatusBadge'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import { KYC_REQUIRED_DOCS, KYC_DOC_LABELS, kycStatusMeta } from '../../utils/kyc'
import {
  Shield, Edit2, CheckCircle, AlertTriangle, Upload, FileText, X,
  Trash2, ArrowRight, Eye,
} from 'lucide-react'

const NATIONALITIES = ['Indian', 'American', 'British', 'Emirati', 'Singaporean', 'Australian', 'Canadian', 'Malaysian', 'Filipino', 'Bangladeshi']

export default function Profile() {
  const { user, customerProfile, refreshCustomerProfile, kyc, refreshKyc } = useAuth()

  const [loading, setLoading] = useState(true)
  const [docs, setDocs] = useState([])
  const [docsLoading, setDocsLoading] = useState(false)

  // Profile form state
  const [editProfile, setEditProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({ dob: '', nationality: '', addressJSON: '' })
  const [savingProfile, setSavingProfile] = useState(false)

  // KYC form state
  const [editKyc, setEditKyc] = useState(false)
  const [kycForm, setKycForm] = useState({ kycLevel: 'Min', notes: '' })
  const [savingKyc, setSavingKyc] = useState(false)

  // Doc upload state — real file picker
  const [uploadType, setUploadType] = useState('IDProof')
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadNotes, setUploadNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = React.useRef(null)
  const [viewingDocId, setViewingDocId] = useState(null)

  const profileExists = !!customerProfile?.customerId
  // After normalizeKyc in AuthContext, kyc.kycId is the reliable normalized field
  const kycExists = !!(kyc?.kycId ?? kyc?.kYCID ?? kyc?.kycID ?? kyc?.kycid)
  const kycId = kyc?.kycId ?? kyc?.kYCID ?? kyc?.kycID ?? kyc?.kycid ?? null

  const loadDocs = async () => {
    if (!kycId) { setDocs([]); return }
    setDocsLoading(true)
    try {
      const r = await kycDocumentsAPI.getByKyc(kycId)
      // .NET camelCase: KYCDocumentId->kYCDocumentId, KYCID->kYCID; normalize
      setDocs(Array.isArray(r.data) ? r.data.map((d) => ({
        ...d,
        kycDocumentId: d.kycDocumentId ?? d.kYCDocumentId,
        kycId:         d.kycId         ?? d.kYCID ?? d.kycID,
        fileURI:       d.fileURI        ?? d.fileUri,
      })) : [])
    } catch {
      setDocs([])
    } finally {
      setDocsLoading(false)
    }
  }

  useEffect(() => {
    setLoading(false)
    if (customerProfile) {
      setProfileForm({
        dob: customerProfile.dob?.substring(0, 10) || '',
        nationality: customerProfile.nationality || '',
        addressJSON: customerProfile.addressJSON || '',
      })
    }
    if (kyc) {
      setKycForm({ kycLevel: kyc.kycLevel || 'Min', notes: kyc.notes || '' })
    }
  }, [customerProfile, kyc])

  useEffect(() => { loadDocs() }, [kycId])

  // ---- Save profile ----
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      if (profileExists) {
        await customersAPI.update(customerProfile.customerId, {
          ...customerProfile, ...profileForm,
        })
        toast.success('Profile updated')
      } else {
        await customersAPI.create({ userID: user.userId, ...profileForm })
        toast.success('Profile created — now submit your KYC')
      }
      setEditProfile(false)
      await refreshCustomerProfile()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save profile')
    } finally {
      setSavingProfile(false)
    }
  }

  // ---- Save KYC record ----
  const handleSaveKyc = async (e) => {
    e.preventDefault()
    setSavingKyc(true)
    try {
      if (kycExists) {
        await kycAPI.update(kycId, { kycID: kycId, ...kycForm })
        toast.success('KYC level updated')
      } else {
        await kycAPI.create({ userID: user.userId, ...kycForm })
        toast.success('KYC record created — upload required documents below')
      }
      setEditKyc(false)
      await refreshKyc()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save KYC')
    } finally {
      setSavingKyc(false)
    }
  }

  // ---- Upload doc (real file) ----
  const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
  const ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'

  const handleUploadDoc = async (e) => {
    e.preventDefault()
    if (!kycId) { toast.error('Submit KYC level first'); return }
    if (!uploadFile) { toast.error('Pick a file (PDF / JPG / PNG)'); return }
    if (uploadFile.size > MAX_BYTES) { toast.error('File too large (max 10 MB)'); return }
    setUploading(true)
    try {
      await kycDocumentsAPI.upload({
        file: uploadFile,
        kycId,
        docType: uploadType,
        notes: uploadNotes || null,
      })
      toast.success('Document uploaded')
      setUploadFile(null)
      setUploadNotes('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      loadDocs()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

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

  const handleDeleteDoc = async (id) => {
    if (!confirm('Remove this document?')) return
    try {
      await kycDocumentsAPI.delete(id)
      toast.success('Document removed')
      loadDocs()
    } catch {
      toast.error('Failed to remove')
    }
  }

  // Submit KYC for review (status flips to Pending — backend default already)
  const handleSubmitForReview = async () => {
    if (!kycId) return
    try {
      await kycAPI.updateStatus(kycId, { verificationStatus: 'Pending' })
      toast.success('KYC submitted for review — admin will verify your documents')
      await refreshKyc()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit')
    }
  }

  if (loading) return <Layout><Loader center /></Layout>

  const status = kycStatusMeta(kyc)
  const requiredDocs = KYC_REQUIRED_DOCS[kycForm.kycLevel] || []
  const uploadedDocTypes = new Set(docs.map((d) => d.docType))
  const missingDocs = requiredDocs.filter((t) => !uploadedDocTypes.has(t))
  const allRequiredUploaded = kycExists && missingDocs.length === 0

  // Helpers for steps
  const Step = ({ n, title, complete, current }) => (
    <div className={`flex items-center gap-2 text-sm ${current ? 'text-primary-600 font-semibold' : complete ? 'text-green-600' : 'text-gray-400'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
        ${complete ? 'bg-green-100 text-green-700' : current ? 'bg-primary-100 text-primary-700 border-2 border-primary-600' : 'bg-gray-100'}`}>
        {complete ? <CheckCircle size={14} /> : n}
      </div>
      <span>{title}</span>
    </div>
  )

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile & KYC</h1>
          <p className="text-gray-500 text-sm mt-0.5">Complete each step to unlock transactions</p>
        </div>

        {/* Account summary */}
        <div className="gradient-hero rounded-2xl p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-bold text-white">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
            <p className="text-xl font-bold text-white">{user?.name}</p>
            <p className="text-blue-200 text-sm">{user?.email}</p>
            <p className="text-blue-200 text-sm">{user?.phone}</p>
          </div>
          <div className="text-right">
            <StatusBadge status={kyc?.verificationStatus || 'Not started'} />
            <p className="text-blue-200 text-xs mt-1">KYC: {status.label}</p>
          </div>
        </div>

        {/* Stepper */}
        <Card>
          <div className="flex items-center gap-3 flex-wrap">
            <Step n={1} title="Customer Profile" complete={profileExists} current={!profileExists} />
            <div className="flex-1 h-0.5 bg-gray-100" />
            <Step n={2} title="KYC Level" complete={kycExists} current={profileExists && !kycExists} />
            <div className="flex-1 h-0.5 bg-gray-100" />
            <Step n={3} title="Upload Documents" complete={allRequiredUploaded} current={kycExists && !allRequiredUploaded} />
            <div className="flex-1 h-0.5 bg-gray-100" />
            <Step n={4} title="Verified" complete={kyc?.verificationStatus === 'Verified'} current={allRequiredUploaded && kyc?.verificationStatus !== 'Verified'} />
          </div>
        </Card>

        {/* Step 1: Profile */}
        <Card title="Step 1 — Customer Profile"
          action={
            !editProfile && profileExists && (
              <button onClick={() => setEditProfile(true)} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1">
                <Edit2 size={13} /> Edit
              </button>
            )
          }>
          {editProfile || !profileExists ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Date of Birth</label>
                  <input type="date" value={profileForm.dob}
                    onChange={(e) => setProfileForm((f) => ({ ...f, dob: e.target.value }))}
                    className="form-input" />
                </div>
                <div>
                  <label className="form-label">Nationality</label>
                  <select value={profileForm.nationality}
                    onChange={(e) => setProfileForm((f) => ({ ...f, nationality: e.target.value }))}
                    className="form-select">
                    <option value="">Select nationality</option>
                    {NATIONALITIES.map((n) => <option key={n}>{n}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="form-label">Address (JSON or Text)</label>
                  <textarea value={profileForm.addressJSON}
                    onChange={(e) => setProfileForm((f) => ({ ...f, addressJSON: e.target.value }))}
                    className="form-input" rows={3}
                    placeholder='{"street":"123 Main St","city":"Mumbai","state":"MH","zip":"400001"}' />
                </div>
              </div>
              <div className="flex gap-3">
                {profileExists && <button type="button" onClick={() => setEditProfile(false)} className="btn-secondary flex-1">Cancel</button>}
                <button type="submit" disabled={savingProfile} className="btn-primary flex-1">
                  {savingProfile ? 'Saving...' : profileExists ? 'Save Profile' : 'Create Profile'}
                </button>
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['Date of Birth', customerProfile.dob ? formatISTDate(customerProfile.dob) : '—'],
                ['Nationality', customerProfile.nationality || '—'],
                ['Risk Rating', customerProfile.riskRating || '—'],
                ['Status', customerProfile.status || '—'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-0.5">{k}</dt>
                  <dd className="font-medium text-gray-900">{v}</dd>
                </div>
              ))}
              <div className="col-span-2">
                <dt className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-0.5">Address</dt>
                <dd className="font-mono text-xs text-gray-700 bg-gray-50 rounded-lg p-2">{customerProfile.addressJSON || '—'}</dd>
              </div>
            </dl>
          )}
        </Card>

        {/* Step 2: KYC level */}
        {profileExists && (
          <Card title="Step 2 — KYC Level"
            action={
              !editKyc && kycExists && kyc?.verificationStatus !== 'Verified' && (
                <button onClick={() => setEditKyc(true)} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1">
                  <Edit2 size={13} /> Change Level
                </button>
              )
            }>
            {editKyc || !kycExists ? (
              <form onSubmit={handleSaveKyc} className="space-y-4">
                <div>
                  <label className="form-label">KYC Level *</label>
                  <select value={kycForm.kycLevel}
                    onChange={(e) => setKycForm((f) => ({ ...f, kycLevel: e.target.value }))}
                    className="form-select">
                    {Object.keys(KYC_REQUIRED_DOCS).map((l) => (
                      <option key={l} value={l}>
                        {l} ({KYC_REQUIRED_DOCS[l].length} document{KYC_REQUIRED_DOCS[l].length > 1 ? 's' : ''})
                      </option>
                    ))}
                  </select>
                  <div className="mt-2 bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                    <strong>Required for {kycForm.kycLevel}:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      {KYC_REQUIRED_DOCS[kycForm.kycLevel].map((t) => (
                        <li key={t}>{KYC_DOC_LABELS[t]}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div>
                  <label className="form-label">Notes (optional)</label>
                  <textarea value={kycForm.notes}
                    onChange={(e) => setKycForm((f) => ({ ...f, notes: e.target.value }))}
                    className="form-input" rows={2} />
                </div>
                <div className="flex gap-3">
                  {kycExists && <button type="button" onClick={() => setEditKyc(false)} className="btn-secondary flex-1">Cancel</button>}
                  <button type="submit" disabled={savingKyc} className="btn-primary flex-1">
                    {savingKyc ? 'Saving...' : kycExists ? 'Save Level' : 'Continue'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center
                  ${kyc.verificationStatus === 'Verified' ? 'bg-green-100' : kyc.verificationStatus === 'Rejected' ? 'bg-red-100' : 'bg-amber-100'}`}>
                  {kyc.verificationStatus === 'Verified'
                    ? <CheckCircle size={24} className="text-green-600" />
                    : <AlertTriangle size={24} className={kyc.verificationStatus === 'Rejected' ? 'text-red-600' : 'text-amber-600'} />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">KYC Level: {kyc.kycLevel}</p>
                  <p className="text-sm text-gray-500">{kyc.verificationStatus} {kyc.verifiedDate ? `• ${formatISTDate(kyc.verifiedDate)}` : ''}</p>
                  {kyc.notes && <p className="text-xs text-gray-400 mt-1">{kyc.notes}</p>}
                </div>
                <StatusBadge status={kyc.verificationStatus} />
              </div>
            )}
          </Card>
        )}

        {/* Step 3: Upload required documents */}
        {profileExists && kycExists && (
          <Card title="Step 3 — Upload Required Documents">
            {/* Required checklist */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Required for level {kyc.kycLevel}</p>
              <ul className="space-y-1.5">
                {requiredDocs.map((t) => {
                  const uploaded = uploadedDocTypes.has(t)
                  return (
                    <li key={t} className="flex items-center gap-2 text-sm">
                      {uploaded
                        ? <CheckCircle size={14} className="text-green-600" />
                        : <AlertTriangle size={14} className="text-amber-500" />}
                      <span className={uploaded ? 'text-gray-500 line-through' : 'text-gray-700 font-medium'}>
                        {KYC_DOC_LABELS[t]}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* Upload form (hidden after Verified) */}
            {kyc.verificationStatus !== 'Verified' && (
              <form onSubmit={handleUploadDoc} className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="form-label">Document Type *</label>
                    <select value={uploadType}
                      onChange={(e) => setUploadType(e.target.value)}
                      className="form-select">
                      {Object.keys(KYC_DOC_LABELS).map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="form-label">File *</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPT}
                      onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                      className="form-input file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700 file:px-3 file:py-1.5 file:font-medium hover:file:bg-primary-100" />
                    <p className="text-xs text-gray-400 mt-1">PDF, JPG or PNG. Max 10 MB.</p>
                    {uploadFile && (
                      <p className="text-xs text-gray-600 mt-1">
                        Selected: <span className="font-mono">{uploadFile.name}</span>
                        {' '}({(uploadFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="form-label">Notes (optional)</label>
                  <input value={uploadNotes}
                    onChange={(e) => setUploadNotes(e.target.value)}
                    className="form-input" placeholder="Any context for the reviewer" />
                </div>
                <button type="submit" disabled={uploading || !uploadFile}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload Document'}
                </button>
              </form>
            )}

            {/* Uploaded documents list */}
            <div className="mt-5 border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Uploaded</p>
              {docsLoading ? <Loader center /> : docs.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No documents uploaded yet</p>
              ) : (
                <ul className="space-y-2">
                  {docs.map((d) => {
                    // FileURI is either a stored filename like "abc123_passport.pdf" or a legacy URL.
                    const isLegacyUrl = (d.fileURI || '').includes('://') || (d.fileURI || '').startsWith('/')
                    // Strip the GUID prefix when showing the filename to the user.
                    const displayName = isLegacyUrl
                      ? d.fileURI
                      : (d.fileURI || '').replace(/^[0-9a-f]{32}_/i, '')
                    return (
                      <li key={d.kycDocumentId} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                        <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                          <FileText size={16} className="text-primary-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">{KYC_DOC_LABELS[d.docType] || d.docType}</p>
                          <p className="text-xs text-gray-500 truncate font-mono">{displayName || '—'}</p>
                        </div>
                        <StatusBadge status={d.verificationStatus || 'Pending'} />
                        {isLegacyUrl ? (
                          <a href={d.fileURI} target="_blank" rel="noreferrer"
                            className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="Open URL">
                            <Eye size={13} />
                          </a>
                        ) : (
                          <button type="button"
                            onClick={() => handleViewDoc(d.kycDocumentId)}
                            disabled={viewingDocId === d.kycDocumentId}
                            className="p-1.5 hover:bg-blue-50 rounded text-blue-600 disabled:opacity-50"
                            title="View document">
                            <Eye size={13} />
                          </button>
                        )}
                        {kyc.verificationStatus !== 'Verified' && (
                          <button onClick={() => handleDeleteDoc(d.kycDocumentId)}
                            className="p-1.5 hover:bg-red-50 rounded text-red-500">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Submit for review CTA */}
            {allRequiredUploaded && kyc.verificationStatus !== 'Verified' && kyc.verificationStatus !== 'Pending' && (
              <button onClick={handleSubmitForReview}
                className="btn-primary w-full mt-5 flex items-center justify-center gap-2">
                Submit for Review <ArrowRight size={14} />
              </button>
            )}
            {kyc.verificationStatus === 'Pending' && allRequiredUploaded && (
              <div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 flex items-center gap-2">
                <AlertTriangle size={14} /> Submitted — awaiting admin review.
              </div>
            )}
          </Card>
        )}

        {/* Final: Verified */}
        {kyc?.verificationStatus === 'Verified' && (
          <Card>
            <div className="flex items-center gap-4 bg-green-50 rounded-xl p-4">
              <CheckCircle size={32} className="text-green-600" />
              <div>
                <p className="font-semibold text-green-900">KYC Verified</p>
                <p className="text-sm text-green-700">You can now send money and add beneficiaries without restrictions.</p>
              </div>
            </div>
          </Card>
        )}
        {kyc?.verificationStatus === 'Rejected' && (
          <Card>
            <div className="flex items-center gap-4 bg-red-50 rounded-xl p-4">
              <X size={32} className="text-red-600" />
              <div>
                <p className="font-semibold text-red-900">KYC Rejected</p>
                <p className="text-sm text-red-700">{kyc.notes || 'Please re-upload documents and submit again.'}</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  )
}
