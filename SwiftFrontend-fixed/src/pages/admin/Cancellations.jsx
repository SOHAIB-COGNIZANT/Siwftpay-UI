import React, { useEffect, useState } from 'react'
import { formatIST, formatISTDate, formatISTTime } from '../../utils/date'
import { cancellationsAPI } from '../../api/cancellations'
import { remittancesAPI } from '../../api/remittances'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import Table from '../../components/common/Table'
import Modal from '../../components/common/Modal'
import StatusBadge from '../../components/common/StatusBadge'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import { Plus, Trash2, XCircle, Check, Filter } from 'lucide-react'

const STATUS_VALUES = ['Requested', 'Approved', 'Rejected', 'Posted']
const REASONS = [
  'Customer requested cancellation',
  'Wrong beneficiary details',
  'Duplicate transaction',
  'Compliance hold',
  'Fraud suspected',
  'Other',
]

const EMPTY = { remitID: '', reason: REASONS[0] }

export default function CancellationsPage() {
  const [items, setItems] = useState([])
  const [remits, setRemits] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [cRes, rRes] = await Promise.all([
        cancellationsAPI.getAll(),
        remittancesAPI.getAll().catch(() => ({ data: [] })),
      ])
      const c = cRes.data ?? cRes
      const r = rRes.data ?? rRes
      setItems(Array.isArray(c) ? c : [])
      setRemits(Array.isArray(r) ? r : [])
    } catch {
      toast.error('Failed to load cancellations')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await cancellationsAPI.create({
        remitId: parseInt(form.remitID),
        reason: form.reason,
      })
      toast.success('Cancellation requested')
      setCreateOpen(false)
      setForm(EMPTY)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleStatus = async (id, status) => {
    if (!confirm(`Move cancellation to ${status}?`)) return
    try {
      await cancellationsAPI.updateStatus(id, { status })
      toast.success(`Moved to ${status}`)
      // Reload so the table and stat cards reflect the updated cancellation + remittance status
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this cancellation?')) return
    try {
      await cancellationsAPI.delete(id)
      toast.success('Deleted')
      load()
    } catch { toast.error('Failed') }
  }

  const filtered = filter === 'All' ? items : items.filter((c) => c.status === filter)

  const columns = [
    { key: 'cancellationID', label: 'ID',         render: (v) => <span className="font-mono">#{v}</span> },
    { key: 'remitID',        label: 'Remit',      render: (v) => <span className="font-mono">#{v}</span> },
    { key: 'reason',         label: 'Reason',     render: (v) => <span className="text-xs">{v}</span> },
    { key: 'requestedDate',  label: 'Requested (IST)',  render: (v) => formatISTDate(v) },
    { key: 'status',         label: 'Status',     render: (v) => <StatusBadge status={v || 'Requested'} /> },
    { key: 'cancellationID', label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-1">
          {(row.status === 'Requested' || !row.status) && (
            <button onClick={() => handleStatus(row.cancellationID, 'Approved')} title="Approve"
              className="p-1.5 hover:bg-green-50 rounded text-green-600"><Check size={13} /></button>
          )}
          {row.status === 'Approved' && (
            <button onClick={() => handleStatus(row.cancellationID, 'Posted')} title="Post (final)"
              className="p-1.5 hover:bg-blue-50 rounded text-blue-600"><Check size={13} /></button>
          )}
          <button onClick={() => handleDelete(row.cancellationID)} title="Delete"
            className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={13} /></button>
        </div>
      )
    },
  ]

  if (loading) return <Layout><Loader center /></Layout>

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cancellations</h1>
            <p className="text-gray-500 text-sm">Pre-payout cancellation requests</p>
          </div>
          <button onClick={() => setCreateOpen(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Request Cancellation
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {STATUS_VALUES.map((s) => (
            <div key={s} className="stat-card">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center"><XCircle size={18} className="text-primary-600" /></div>
              <p className="text-2xl font-bold text-gray-900">{items.filter((c) => c.status === s).length}</p>
              <p className="text-xs text-gray-500">{s}</p>
            </div>
          ))}
        </div>

        <Card>
          <div className="flex items-center gap-3 mb-4">
            <Filter size={14} className="text-gray-400" />
            <div className="flex flex-wrap gap-2">
              {['All', ...STATUS_VALUES].map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-xs rounded-full ${filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <Table columns={columns} data={filtered} loading={false} emptyMessage="No cancellations" />
        </Card>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Request Cancellation">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="form-label">Remittance *</label>
            <select required value={form.remitID}
              onChange={(e) => setForm((f) => ({ ...f, remitID: e.target.value }))}
              className="form-select">
              <option value="">Select remittance...</option>
              {remits.filter((r) => r.status !== 'Paid' && r.status !== 'Cancelled').map((r) => (
                <option key={r.remitId} value={r.remitId}>
                  #{r.remitId} — {r.fromCurrency} {r.sendAmount} → {r.toCurrency} ({r.status})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Only pre-payout remittances can be cancelled.</p>
          </div>
          <div>
            <label className="form-label">Reason *</label>
            <select required value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              className="form-select">
              {REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}
