import React, { useEffect, useState } from 'react'
import { formatIST, formatISTDate, formatISTTime } from '../../utils/date'
import { reconciliationAPI } from '../../api/reconciliation'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import Table from '../../components/common/Table'
import Modal from '../../components/common/Modal'
import StatusBadge from '../../components/common/StatusBadge'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import { RefreshCw, AlertTriangle, CheckCircle, Filter, Plus } from 'lucide-react'

const REF_TYPES = ['Remit', 'Instruction', 'PartnerAck']

export default function ReconciliationPage() {
  const [records, setRecords] = useState([])
  const [mismatches, setMismatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ referenceType: 'Remit', referenceId: '', expectedAmount: '', actualAmount: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [autoForm, setAutoForm] = useState({ type: 'Remit', referenceId: '' })
  const [autoOpen, setAutoOpen] = useState(false)
  const [autoRunning, setAutoRunning] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [allRes, mmRes] = await Promise.all([
        reconciliationAPI.getAll(),
        reconciliationAPI.getMismatches().catch(() => ({ data: [] })),
      ])
      const all = allRes.data ?? allRes
      const mm = mmRes.data ?? mmRes
      setRecords(Array.isArray(all) ? all : [])
      setMismatches(Array.isArray(mm) ? mm : [])
    } catch {
      toast.error('Failed to load reconciliation data')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await reconciliationAPI.create({
        ...form,
        expectedAmount: parseFloat(form.expectedAmount) || 0,
        actualAmount: parseFloat(form.actualAmount) || 0,
      })
      toast.success('Reconciliation record created')
      setCreateOpen(false)
      setForm({ referenceType: 'Remit', referenceId: '', expectedAmount: '', actualAmount: '', notes: '' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleAutoReconcile = async (e) => {
    e.preventDefault()
    setAutoRunning(true)
    try {
      await reconciliationAPI.autoReconcile(autoForm.type, autoForm.referenceId)
      toast.success('Auto-reconciliation triggered')
      setAutoOpen(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally {
      setAutoRunning(false)
    }
  }

  // Backend returns model directly: ReconID->reconID, ReferenceID->referenceID (.NET camelCase)
  const normalizedRecords = records.map((r) => ({
    ...r,
    reconId:     r.reconId     ?? r.reconID,
    referenceId: r.referenceId ?? r.referenceID,
    reconDate:   r.reconDate   ?? r.ReconDate,
  }))

  const filtered = filter === 'All' ? normalizedRecords
    : filter === 'Matched' ? normalizedRecords.filter((r) => r.result === 'Matched')
    : filter === 'Mismatched' ? normalizedRecords.filter((r) => r.result === 'Mismatched')
    : normalizedRecords.filter((r) => r.referenceType === filter)

  const columns = [
    { key: 'reconId',         label: 'ID',        render: (v) => <span className="font-mono">#{v}</span> },
    { key: 'referenceType',   label: 'Ref Type',  render: (v) => <span className="px-2 py-0.5 text-xs bg-gray-100 rounded">{v}</span> },
    { key: 'referenceId',     label: 'Ref ID',    render: (v) => <span className="font-mono text-xs">{v}</span> },
    { key: 'expectedAmount',  label: 'Expected',  render: (v) => v != null ? `$${parseFloat(v).toFixed(2)}` : '—' },
    { key: 'actualAmount',    label: 'Actual',    render: (v) => v != null ? `$${parseFloat(v).toFixed(2)}` : '—' },
    { key: 'result',          label: 'Result',    render: (v) =>
      v === 'Matched'
        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full"><CheckCircle size={11} /> Matched</span>
        : <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded-full"><AlertTriangle size={11} /> Mismatched</span> },
    { key: 'reconDate',       label: 'Date',      render: (v) => v ? formatISTDate(v) : '—' },
    { key: 'notes',           label: 'Notes',     render: (v) => <span className="text-xs text-gray-500">{v ?? '—'}</span> },
  ]

  if (loading) return <Layout><Loader center /></Layout>

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reconciliation</h1>
            <p className="text-gray-500 text-sm">Reconcile partner acks and settled instructions against internal records</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAutoOpen(true)} className="btn-secondary flex items-center gap-2 text-sm">
              <RefreshCw size={14} /> Auto Reconcile
            </button>
            <button onClick={() => setCreateOpen(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> New Record
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <RefreshCw size={18} className="text-primary-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{normalizedRecords.length}</p>
            <p className="text-sm text-gray-500">Total Records</p>
          </div>
          <div className="stat-card">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <CheckCircle size={18} className="text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{normalizedRecords.filter((r) => r.result === 'Matched').length}</p>
            <p className="text-sm text-gray-500">Matched</p>
          </div>
          <div className="stat-card">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertTriangle size={18} className="text-red-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{mismatches.length}</p>
            <p className="text-sm text-gray-500">Mismatches</p>
          </div>
        </div>

        <Card>
          <div className="flex items-center gap-3 mb-4">
            <Filter size={14} className="text-gray-400" />
            <div className="flex flex-wrap gap-2">
              {['All', 'Matched', 'Mismatched', ...REF_TYPES].map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-xs rounded-full ${filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <Table columns={columns} data={filtered} loading={false} emptyMessage="No reconciliation records" />
        </Card>
      </div>

      {/* Manual create */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Reconciliation Record" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Reference Type *</label>
              <select required value={form.referenceType}
                onChange={(e) => setForm((f) => ({ ...f, referenceType: e.target.value }))}
                className="form-select">
                {REF_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Reference ID *</label>
              <input required value={form.referenceId}
                onChange={(e) => setForm((f) => ({ ...f, referenceId: e.target.value }))}
                className="form-input" />
            </div>
            <div>
              <label className="form-label">Expected Amount *</label>
              <input type="number" step="0.01" required value={form.expectedAmount}
                onChange={(e) => setForm((f) => ({ ...f, expectedAmount: e.target.value }))}
                className="form-input" />
            </div>
            <div>
              <label className="form-label">Actual Amount *</label>
              <input type="number" step="0.01" required value={form.actualAmount}
                onChange={(e) => setForm((f) => ({ ...f, actualAmount: e.target.value }))}
                className="form-input" />
            </div>
            <div className="col-span-2">
              <label className="form-label">Notes</label>
              <textarea rows={3} value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="form-input" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Auto reconcile */}
      <Modal open={autoOpen} onClose={() => setAutoOpen(false)} title="Auto Reconcile">
        <form onSubmit={handleAutoReconcile} className="space-y-4">
          <div>
            <label className="form-label">Reference Type</label>
            <select value={autoForm.type}
              onChange={(e) => setAutoForm((f) => ({ ...f, type: e.target.value }))}
              className="form-select">
              {REF_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Reference ID *</label>
            <input required value={autoForm.referenceId}
              onChange={(e) => setAutoForm((f) => ({ ...f, referenceId: e.target.value }))}
              className="form-input" placeholder="e.g. 1 or instruction ID" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setAutoOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={autoRunning} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <RefreshCw size={14} /> {autoRunning ? 'Running...' : 'Run'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}
