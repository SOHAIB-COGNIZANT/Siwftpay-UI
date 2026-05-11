import React, { useEffect, useState } from 'react'
import { routingRulesAPI } from '../../api/routingrules'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import Table from '../../components/common/Table'
import Modal from '../../components/common/Modal'
import StatusBadge from '../../components/common/StatusBadge'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, Route, Globe } from 'lucide-react'

const PAYOUT_MODES = ['Account', 'CashPickup', 'MobileWallet']
const STATUS_VALUES = ['Active', 'Inactive', 'Suspended']
const EMPTY = { corridor: '', payoutMode: 'Account', partnerCode: '', priority: 1, status: 'Active' }

export default function RoutingRulesPage() {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    routingRulesAPI.getAll()
      .then((r) => {
        const payload = r.data ?? r
        setRules(Array.isArray(payload) ? payload : [])
      })
      .catch(() => toast.error('Failed to load routing rules'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openAdd = () => { setEditItem(null); setForm(EMPTY); setModalOpen(true) }
  const openEdit = (r) => { setEditItem(r); setForm({ ...r, priority: r.priority ?? 1 }); setModalOpen(true) }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, priority: parseInt(form.priority) || 1 }
      if (editItem) {
        await routingRulesAPI.update(editItem.ruleId, payload)
        toast.success('Routing rule updated')
      } else {
        await routingRulesAPI.create(payload)
        toast.success('Routing rule created')
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
    if (!confirm('Delete this routing rule?')) return
    try {
      await routingRulesAPI.delete(id)
      toast.success('Deleted')
      load()
    } catch { toast.error('Failed') }
  }

  const columns = [
    { key: 'ruleId',     label: 'ID',       render: (v) => <span className="font-mono text-xs">{v?.toString().slice(0,8)}…</span> },
    { key: 'corridor',   label: 'Corridor', render: (v) => <span className="font-semibold">{v}</span> },
    { key: 'payoutMode', label: 'Mode' },
    { key: 'partnerCode',label: 'Partner',  render: (v) => <span className="text-xs font-mono px-2 py-0.5 bg-gray-100 rounded">{v}</span> },
    { key: 'priority',   label: 'Priority', render: (v) => <span className="font-semibold">{v}</span> },
    { key: 'status',     label: 'Status',   render: (v) => <StatusBadge status={v} /> },
    { key: 'ruleId',     label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-2">
          <button onClick={() => openEdit(row)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600"><Edit2 size={13} /></button>
          <button onClick={() => handleDelete(row.ruleId)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={13} /></button>
        </div>
      )
    },
  ]

  const stats = [
    { label: 'Total Rules', value: rules.length, icon: Route, color: 'text-primary-600', bg: 'bg-primary-50' },
    { label: 'Active', value: rules.filter((r) => r.status === 'Active').length, icon: Route, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Corridors', value: new Set(rules.map((r) => r.corridor)).size, icon: Globe, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  if (loading) return <Layout><Loader center /></Layout>

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Routing Rules</h1>
            <p className="text-gray-500 text-sm">Define corridor partners and payout routing priorities</p>
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

        <Card title="All Routing Rules">
          <Table columns={columns} data={rules} loading={false} emptyMessage="No routing rules configured" />
        </Card>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editItem ? 'Edit Routing Rule' : 'Add Routing Rule'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Corridor *</label>
              <input required value={form.corridor}
                onChange={(e) => setForm((f) => ({ ...f, corridor: e.target.value }))}
                className="form-input" placeholder="USD-INR" />
            </div>
            <div>
              <label className="form-label">Payout Mode *</label>
              <select required value={form.payoutMode}
                onChange={(e) => setForm((f) => ({ ...f, payoutMode: e.target.value }))}
                className="form-select">
                {PAYOUT_MODES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Partner Code *</label>
              <input required value={form.partnerCode}
                onChange={(e) => setForm((f) => ({ ...f, partnerCode: e.target.value }))}
                className="form-input" placeholder="WISE / WU / RIA" />
            </div>
            <div>
              <label className="form-label">Priority *</label>
              <input type="number" min="1" required value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                className="form-input" />
            </div>
            <div className="col-span-2">
              <label className="form-label">Status</label>
              <select value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="form-select">
                {STATUS_VALUES.map((s) => <option key={s}>{s}</option>)}
              </select>
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
