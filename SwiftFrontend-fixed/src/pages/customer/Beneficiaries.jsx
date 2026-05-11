import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { beneficiariesAPI } from '../../api/beneficiaries'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import Modal from '../../components/common/Modal'
import StatusBadge from '../../components/common/StatusBadge'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import { Plus, Trash2, Edit2, User, Building, Phone, AlertTriangle, ArrowRight } from 'lucide-react'

const COUNTRIES = ['India', 'United States', 'United Kingdom', 'UAE', 'Singapore', 'Australia', 'Canada', 'Germany', 'France', 'Japan', 'Malaysia', 'Philippines', 'Bangladesh', 'Sri Lanka', 'Nepal']
const PAYOUT_MODES = ['Account', 'CashPickup', 'MobileWallet']

const EMPTY_FORM = { name: '', country: '', payoutMode: 'Account', bankName: '', bankCountry: '', accountOrWalletNo: '', IFSC_IBAN_SWIFT: '' }

export default function Beneficiaries() {
  const { customerProfile } = useAuth()
  const [beneficiaries, setBeneficiaries] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const hasProfile = !!customerProfile?.customerId

  // Backend serializes BeneficiaryID -> beneficiaryID (acronym preserved). Normalize.
  // .NET camelCase: IFSC_IBAN_SWIFT -> iFSC_IBAN_SWIFT (only first char lowercased, rest unchanged)
  const normalize = (b) => ({
    ...b,
    beneficiaryId: b.beneficiaryId ?? b.beneficiaryID,
    customerId:    b.customerId    ?? b.customerID,
    IFSC_IBAN_SWIFT: b.IFSC_IBAN_SWIFT ?? b.iFSC_IBAN_SWIFT ?? b.ifsC_IBAN_SWIFT ?? b.ifsc_IBAN_SWIFT ?? '',
  })

  const load = () => {
    if (!hasProfile) { setLoading(false); return }
    beneficiariesAPI.getByCustomer(customerProfile.customerId)
      .then((r) => setBeneficiaries(Array.isArray(r.data) ? r.data.map(normalize) : []))
      .catch(() => setBeneficiaries([]))
      .finally(() => setLoading(false))
  }
  useEffect(load, [customerProfile])

  const openAdd = () => {
    if (!hasProfile) { toast.error('Complete your profile first'); return }
    setEditItem(null); setForm(EMPTY_FORM); setModalOpen(true)
  }
  const openEdit = (b) => {
    setEditItem(b)
    setForm({
      name: b.name ?? '',
      country: b.country ?? '',
      payoutMode: b.payoutMode ?? 'Account',
      bankName: b.bankName ?? '',
      bankCountry: b.bankCountry ?? '',
      accountOrWalletNo: b.accountOrWalletNo ?? '',
      IFSC_IBAN_SWIFT: b.IFSC_IBAN_SWIFT ?? '',
    })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!hasProfile) { toast.error('Complete your profile first'); return }
    setSaving(true)
    try {
      // Backend DTO expects exactly these PascalCase fields. We rely on
      // PropertyNameCaseInsensitive on the backend, but IFSC_IBAN_SWIFT
      // contains underscores so its name is preserved verbatim.
      const payload = {
        Name: form.name,
        Country: form.country,
        PayoutMode: form.payoutMode,
        BankName: form.bankName,
        BankCountry: form.bankCountry,
        AccountOrWalletNo: form.accountOrWalletNo,
        IFSC_IBAN_SWIFT: form.IFSC_IBAN_SWIFT,
        CustomerID: customerProfile.customerId,
      }
      if (editItem) {
        await beneficiariesAPI.update(editItem.beneficiaryId, payload)
        toast.success('Beneficiary updated')
      } else {
        await beneficiariesAPI.create(payload)
        toast.success('Beneficiary added')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this beneficiary?')) return
    try {
      await beneficiariesAPI.delete(id)
      toast.success('Beneficiary removed')
      load()
    } catch {
      toast.error('Failed to remove')
    }
  }

  const modeIcon = { Account: Building, CashPickup: User, MobileWallet: Phone }

  if (loading) return <Layout><Loader center /></Layout>

  // No profile yet — show clear CTA, the button used to crash on click
  if (!hasProfile) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Beneficiaries</h1>
          <p className="text-gray-500 text-sm mb-6">Manage your recipients</p>
          <Card>
            <div className="text-center py-10">
              <AlertTriangle size={48} className="text-amber-400 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-1">Complete your profile first</h3>
              <p className="text-gray-500 text-sm mb-5">
                You need to set up your customer profile before you can add beneficiaries.
              </p>
              <Link to="/customer/profile" className="btn-primary inline-flex items-center gap-2">
                Go to Profile <ArrowRight size={14} />
              </Link>
            </div>
          </Card>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Beneficiaries</h1>
            <p className="text-gray-500 text-sm">Manage your recipient bank accounts</p>
          </div>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Beneficiary
          </button>
        </div>

        {beneficiaries.length === 0 ? (
          <Card>
            <div className="text-center py-14">
              <User size={48} className="text-gray-200 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-700 mb-2">No beneficiaries yet</h3>
              <p className="text-gray-400 text-sm mb-5">Add a recipient to start sending money</p>
              <button onClick={openAdd} className="btn-primary">Add Beneficiary</button>
            </div>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {beneficiaries.map((b) => {
              const Icon = modeIcon[b.payoutMode] || Building
              const ifsc = b.IFSC_IBAN_SWIFT
              return (
                <div key={b.beneficiaryId} className="card hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center">
                        <Icon size={20} className="text-primary-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{b.name}</p>
                        <p className="text-xs text-gray-500">{b.country}</p>
                      </div>
                    </div>
                    <StatusBadge status={b.verificationStatus || 'Pending'} />
                  </div>
                  <div className="space-y-1 text-sm text-gray-600 mb-4">
                    <p><span className="text-gray-400">Bank: </span>{b.bankName || '—'}</p>
                    <p><span className="text-gray-400">Account: </span><span className="font-mono text-xs">{b.accountOrWalletNo || '—'}</span></p>
                    {ifsc && <p><span className="text-gray-400">IFSC/IBAN: </span><span className="font-mono text-xs">{ifsc}</span></p>}
                    <p><span className="text-gray-400">Mode: </span>{b.payoutMode}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(b)} className="btn-secondary flex-1 flex items-center justify-center gap-1 text-sm py-2">
                      <Edit2 size={13} /> Edit
                    </button>
                    <button onClick={() => handleDelete(b.beneficiaryId)} className="btn-danger flex-1 flex items-center justify-center gap-1 text-sm py-2">
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editItem ? 'Edit Beneficiary' : 'Add Beneficiary'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Full Name *</label>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="form-input" placeholder="John Doe" />
            </div>
            <div>
              <label className="form-label">Country *</label>
              <select required value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} className="form-select">
                <option value="">Select country</option>
                {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Payout Mode *</label>
              <select value={form.payoutMode} onChange={(e) => setForm((f) => ({ ...f, payoutMode: e.target.value }))} className="form-select">
                {PAYOUT_MODES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Bank Name</label>
              <input value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                className="form-input" placeholder="HDFC Bank" />
            </div>
            <div>
              <label className="form-label">Bank Country</label>
              <select value={form.bankCountry} onChange={(e) => setForm((f) => ({ ...f, bankCountry: e.target.value }))} className="form-select">
                <option value="">Select country</option>
                {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Account / Wallet No *</label>
              <input required value={form.accountOrWalletNo} onChange={(e) => setForm((f) => ({ ...f, accountOrWalletNo: e.target.value }))}
                className="form-input" placeholder="123456789" minLength={5} />
            </div>
            <div className="col-span-2">
              <label className="form-label">IFSC / IBAN / SWIFT</label>
              <input value={form.IFSC_IBAN_SWIFT} onChange={(e) => setForm((f) => ({ ...f, IFSC_IBAN_SWIFT: e.target.value }))}
                className="form-input" placeholder="HDFC0001234 / IBAN / SWIFT code" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : editItem ? 'Update' : 'Add Beneficiary'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}
