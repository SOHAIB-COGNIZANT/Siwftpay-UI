import React, { useEffect, useState } from 'react'
import { formatIST, formatISTDate, formatISTTime } from '../../utils/date'
import { amendmentsAPI } from '../../api/amendments'
import { remittancesAPI } from '../../api/remittances'
import { useAuth } from '../../context/AuthContext'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import Table from '../../components/common/Table'
import Modal from '../../components/common/Modal'
import StatusBadge from '../../components/common/StatusBadge'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, FileEdit, Check, X as XIcon, Filter } from 'lucide-react'

const STATUS_VALUES = ['Pending', 'Approved', 'Rejected']
const COMMON_FIELDS = ['PurposeCode', 'SourceOfFunds', 'BeneficiaryId', 'SendAmount']

const EMPTY = { remitID: '', fieldChanged: 'PurposeCode', oldValue: '', newValue: '' }

export default function AmendmentsPage() {
  const { user } = useAuth()
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
      const [aRes, rRes] = await Promise.all([
        amendmentsAPI.getAll(),
        remittancesAPI.getAll().catch(() => ({ data: [] })),
      ])
      const a = aRes.data ?? aRes
      const r = rRes.data ?? rRes
      setItems(Array.isArray(a) ? a : [])
      setRemits(Array.isArray(r) ? r : [])
    } catch {
      toast.error('Failed to load amendments')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await amendmentsAPI.create({
        remitID: parseInt(form.remitID),
        fieldChanged: form.fieldChanged,
        oldValue: form.oldValue,
        newValue: form.newValue,
        requestedBy: user?.userId,
      })
      toast.success('Amendment requested')
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
    if (!confirm(`${status} this amendment?`)) return
    try {
      await amendmentsAPI.updateStatus(id, { status })
      toast.success(`Amendment ${status.toLowerCase()}`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this amendment?')) return
    try {
      await amendmentsAPI.delete(id)
      toast.success('Deleted')
      load()
    } catch { toast.error('Failed') }
  }

  const filtered = filter === 'All' ? items : items.filter((a) => a.status === filter)

  const columns = [
    { key: 'amendmentID', label: 'ID',         render: (v) => <span className="font-mono">#{v}</span> },
    { key: 'remitID',     label: 'Remit',      render: (v) => <span className="font-mono">#{v}</span> },
    { key: 'fieldChanged',label: 'Field',      render: (v) => <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">{v}</span> },
    { key: 'oldValue',    label: 'Old',        render: (v) => <span className="text-xs text-gray-500">{v ?? '—'}</span> },
    { key: 'newValue',    label: 'New',        render: (v) => <span className="text-xs font-medium">{v ?? '—'}</span> },
    { key: 'requestedDate',label: 'Requested', render: (v) => formatISTDate(v) },
    { key: 'status',      label: 'Status',     render: (v) => <StatusBadge status={v || 'Pending'} /> },
    { key: 'amendmentID', label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-1">
          {(row.status === 'Pending' || !row.status) && <>
            <button onClick={() => handleStatus(row.amendmentID, 'Approved')} title="Approve"
              className="p-1.5 hover:bg-green-50 rounded text-green-600"><Check size={13} /></button>
            <button onClick={() => handleStatus(row.amendmentID, 'Rejected')} title="Reject"
              className="p-1.5 hover:bg-red-50 rounded text-red-500"><XIcon size={13} /></button>
          </>}
          <button onClick={() => handleDelete(row.amendmentID)} title="Delete"
            className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={13} /></button>
        </div>
      )
    },
  ]

  if (loading) return <Layout><Loader center /></Layout>

  const pendingCount = items.filter((i) => i.status === 'Pending' || !i.status).length

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Amendments</h1>
            <p className="text-gray-500 text-sm">Pre-payout field corrections requested for in-flight remittances</p>
          </div>
          <button onClick={() => setCreateOpen(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Request Amendment
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="stat-card">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center"><FileEdit size={18} className="text-primary-600" /></div>
            <p className="text-2xl font-bold text-gray-900">{items.length}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="stat-card">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><FileEdit size={18} className="text-amber-600" /></div>
            <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </div>
          <div className="stat-card">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center"><Check size={18} className="text-green-600" /></div>
            <p className="text-2xl font-bold text-gray-900">{items.filter((i) => i.status === 'Approved').length}</p>
            <p className="text-xs text-gray-500">Approved</p>
          </div>
          <div className="stat-card">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><XIcon size={18} className="text-red-600" /></div>
            <p className="text-2xl font-bold text-gray-900">{items.filter((i) => i.status === 'Rejected').length}</p>
            <p className="text-xs text-gray-500">Rejected</p>
          </div>
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
          <Table columns={columns} data={filtered} loading={false} emptyMessage="No amendments" />
        </Card>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Request Amendment" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="form-label">Remittance *</label>
            <select required value={form.remitID}
              onChange={(e) => setForm((f) => ({ ...f, remitID: e.target.value }))}
              className="form-select">
              <option value="">Select remittance...</option>
              {remits.map((r) => (
                <option key={r.remitId} value={r.remitId}>
                  #{r.remitId} — {r.fromCurrency} {r.sendAmount} → {r.toCurrency} ({r.status})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Field to Change *</label>
            <select required value={form.fieldChanged}
              onChange={(e) => setForm((f) => ({ ...f, fieldChanged: e.target.value }))}
              className="form-select">
              {COMMON_FIELDS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Old Value</label>
              <input value={form.oldValue}
                onChange={(e) => setForm((f) => ({ ...f, oldValue: e.target.value }))}
                className="form-input" />
            </div>
            <div>
              <label className="form-label">New Value *</label>
              <input required value={form.newValue}
                onChange={(e) => setForm((f) => ({ ...f, newValue: e.target.value }))}
                className="form-input" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}
