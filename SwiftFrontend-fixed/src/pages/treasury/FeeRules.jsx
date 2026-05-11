import React, { useEffect, useState } from 'react'
import { feeRulesAPI } from '../../api/feerules'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import Table from '../../components/common/Table'
import Modal from '../../components/common/Modal'
import StatusBadge from '../../components/common/StatusBadge'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import { DollarSign, Plus, Edit2, Trash2, Globe, TrendingUp } from 'lucide-react'

const EMPTY_FEE = { corridor: '', payoutMode: 'Account', feeType: 'Flat', feeValue: '', minFee: '', maxFee: '', effectiveFrom: '', effectiveTo: '' }

export default function FeeRulesPage() {
  const [feeRules, setFeeRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(EMPTY_FEE)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    feeRulesAPI.getAll()
      // .NET camelCase: FeeRuleID -> feeRuleID; normalize to feeRuleId for consistent access
      .then((r) => setFeeRules(Array.isArray(r.data) ? r.data.map((f) => ({ ...f, feeRuleId: f.feeRuleId ?? f.feeRuleID })) : []))
      .catch(() => toast.error('Failed to load fee rules'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FEE); setModalOpen(true) }
  const openEdit = (r) => { setEditItem(r); setForm({ ...r, effectiveFrom: r.effectiveFrom?.substring(0,10)||'', effectiveTo: r.effectiveTo?.substring(0,10)||'' }); setModalOpen(true) }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, feeValue: parseFloat(form.feeValue), minFee: parseFloat(form.minFee)||0, maxFee: parseFloat(form.maxFee)||0 }
      if (editItem) {
        await feeRulesAPI.update(editItem.feeRuleId, payload)
        toast.success('Fee rule updated')
      } else {
        await feeRulesAPI.create(payload)
        toast.success('Fee rule created')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this fee rule?')) return
    try {
      await feeRulesAPI.delete(id)
      toast.success('Deleted')
      load()
    } catch { toast.error('Failed') }
  }

  const columns = [
    { key: 'feeRuleId',  label: 'ID',        render: (v) => `#${v}` },
    { key: 'corridor',   label: 'Corridor' },
    { key: 'payoutMode', label: 'Mode' },
    { key: 'feeType',    label: 'Type' },
    { key: 'feeValue',   label: 'Fee',       render: (v, r) => r.feeType === 'Percent' ? `${v}%` : `$${v}` },
    { key: 'minFee',     label: 'Min',       render: (v) => `$${v}` },
    { key: 'maxFee',     label: 'Max',       render: (v) => `$${v}` },
    { key: 'status',     label: 'Status',    render: (v) => <StatusBadge status={v || 'Active'} /> },
    { key: 'feeRuleId',  label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-2">
          <button onClick={() => openEdit(row)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600"><Edit2 size={13} /></button>
          <button onClick={() => handleDelete(row.feeRuleId)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={13} /></button>
        </div>
      )
    },
  ]

  const stats = [
    { label: 'Active Fee Rules', value: feeRules.length, icon: DollarSign, color: 'text-primary-600', bg: 'bg-primary-50' },
    { label: 'Corridors Covered', value: new Set(feeRules.map((f) => f.corridor)).size, icon: Globe, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Avg Fee', value: feeRules.length ? `$${(feeRules.reduce((s,r)=>s+(r.feeValue||0),0)/feeRules.length).toFixed(2)}` : '—', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  if (loading) return <Layout><Loader center /></Layout>

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fee Rules</h1>
            <p className="text-gray-500 text-sm">Corridor-specific fees and payout-mode pricing</p>
          </div>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Rule
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {stats.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.label} className="stat-card">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <Icon size={18} className={s.color} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            )
          })}
        </div>

        <Card title="All Fee Rules">
          <Table columns={columns} data={feeRules} loading={false} emptyMessage="No fee rules configured" />
        </Card>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editItem ? 'Edit Fee Rule' : 'Add Fee Rule'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Corridor *</label>
              <input required value={form.corridor}
                onChange={(e) => setForm((f) => ({ ...f, corridor: e.target.value }))}
                className="form-input" placeholder="USD-INR" />
            </div>
            <div>
              <label className="form-label">Payout Mode</label>
              <select value={form.payoutMode}
                onChange={(e) => setForm((f) => ({ ...f, payoutMode: e.target.value }))}
                className="form-select">
                {['Account', 'CashPickup', 'MobileWallet'].map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Fee Type</label>
              <select value={form.feeType}
                onChange={(e) => setForm((f) => ({ ...f, feeType: e.target.value }))}
                className="form-select">
                {['Flat', 'Percent', 'Tiered'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Fee Value *</label>
              <input type="number" step="0.01" required value={form.feeValue}
                onChange={(e) => setForm((f) => ({ ...f, feeValue: e.target.value }))}
                className="form-input" placeholder="2.50" />
            </div>
            <div>
              <label className="form-label">Min Fee</label>
              <input type="number" step="0.01" value={form.minFee}
                onChange={(e) => setForm((f) => ({ ...f, minFee: e.target.value }))}
                className="form-input" placeholder="1.00" />
            </div>
            <div>
              <label className="form-label">Max Fee</label>
              <input type="number" step="0.01" value={form.maxFee}
                onChange={(e) => setForm((f) => ({ ...f, maxFee: e.target.value }))}
                className="form-input" placeholder="50.00" />
            </div>
            <div>
              <label className="form-label">Effective From</label>
              <input type="date" value={form.effectiveFrom}
                onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
                className="form-input" />
            </div>
            <div>
              <label className="form-label">Effective To</label>
              <input type="date" value={form.effectiveTo}
                onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value }))}
                className="form-input" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : editItem ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}
