// import React, { useEffect, useState } from 'react'
// import { formatIST, formatISTDate, formatISTTime } from '../../utils/date'
// import { refundsAPI } from '../../api/refunds'
// import { remittancesAPI } from '../../api/remittances'
// import Layout from '../../components/layout/Layout'
// import Card from '../../components/common/Card'
// import Table from '../../components/common/Table'
// import Modal from '../../components/common/Modal'
// import StatusBadge from '../../components/common/StatusBadge'
// import Loader from '../../components/common/Loader'
// import toast from 'react-hot-toast'
// import { Plus, Trash2, RotateCcw, Check, Filter, DollarSign } from 'lucide-react'

// const STATUS_VALUES = ['Initiated', 'Completed', 'Failed']
// const METHODS = ['Original', 'Fallback']
// const EMPTY = { remitID: '', amount: '', method: 'Original' }

// export default function RefundsPage() {
//   const [items, setItems] = useState([])
//   const [remits, setRemits] = useState([])
//   const [loading, setLoading] = useState(true)
//   const [filter, setFilter] = useState('All')
//   const [createOpen, setCreateOpen] = useState(false)
//   const [form, setForm] = useState(EMPTY)
//   const [saving, setSaving] = useState(false)

//   const load = async () => {
//     setLoading(true)
//     try {
//       const [rfRes, rRes] = await Promise.all([
//         refundsAPI.getAll(),
//         remittancesAPI.getAll().catch(() => ({ data: [] })),
//       ])
//       const rf = rfRes.data ?? rfRes
//       const rs = rRes.data ?? rRes
//       setItems(Array.isArray(rf) ? rf : [])
//       setRemits(Array.isArray(rs) ? rs : [])
//     } catch {
//       toast.error('Failed to load refunds')
//     } finally {
//       setLoading(false)
//     }
//   }
//   useEffect(() => { load() }, [])

//   const handleCreate = async (e) => {
//     e.preventDefault()
//     setSaving(true)
//     try {
//       await refundsAPI.create({
//         remitID: parseInt(form.remitID),
//         amount: parseFloat(form.amount),
//         method: form.method,
//       })
//       toast.success('Refund initiated')
//       setCreateOpen(false)
//       setForm(EMPTY)
//       load()
//     } catch (err) {
//       toast.error(err.response?.data?.message || 'Failed')
//     } finally {
//       setSaving(false)
//     }
//   }

//   const handleStatus = async (id, status) => {
//     if (!confirm(`Mark refund as ${status}?`)) return
//     try {
//       await refundsAPI.updateStatus(id, { status })
//       toast.success(`Marked ${status}`)
//       load()
//     } catch (err) {
//       toast.error(err.response?.data?.message || 'Failed')
//     }
//   }

//   const handleDelete = async (id) => {
//     if (!confirm('Delete this refund record?')) return
//     try {
//       await refundsAPI.delete(id)
//       toast.success('Deleted')
//       load()
//     } catch { toast.error('Failed') }
//   }

//   const filtered = filter === 'All' ? items : items.filter((r) => r.status === filter)
//   const totalRefunded = items.filter((r) => r.status === 'Completed').reduce((s, r) => s + (r.amount || 0), 0)

//   const columns = [
//     { key: 'refundID',    label: 'ID',         render: (v) => <span className="font-mono">#{v}</span> },
//     { key: 'remitID',     label: 'Remit',      render: (v) => <span className="font-mono">#{v}</span> },
//     { key: 'amount',      label: 'Amount',     render: (v) => v != null ? <span className="font-semibold">${parseFloat(v).toFixed(2)}</span> : '—' },
//     { key: 'method',      label: 'Method',     render: (v) => <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">{v}</span> },
//     { key: 'refundDate',  label: 'Date (IST)', render: (v) => formatISTDate(v) },
//     { key: 'status',      label: 'Status',     render: (v) => <StatusBadge status={v || 'Initiated'} /> },
//     { key: 'refundID',    label: 'Actions',
//       render: (_, row) => (
//         <div className="flex gap-1">
//           {(row.status === 'Initiated' || !row.status) && <>
//             <button onClick={() => handleStatus(row.refundID, 'Completed')} title="Mark completed"
//               className="p-1.5 hover:bg-green-50 rounded text-green-600"><Check size={13} /></button>
//             <button onClick={() => handleStatus(row.refundID, 'Failed')} title="Mark failed"
//               className="p-1.5 hover:bg-red-50 rounded text-red-500"><RotateCcw size={13} /></button>
//           </>}
//           <button onClick={() => handleDelete(row.refundID)} title="Delete"
//             className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={13} /></button>
//         </div>
//       )
//     },
//   ]

//   if (loading) return <Layout><Loader center /></Layout>

//   return (
//     <Layout>
//       <div className="space-y-6">
//         <div className="flex items-center justify-between">
//           <div>
//             <h1 className="text-2xl font-bold text-gray-900">Refunds</h1>
//             <p className="text-gray-500 text-sm">Refunds for cancelled remittances (Phase-1: reference only)</p>
//           </div>
//           <button onClick={() => setCreateOpen(true)} className="btn-primary flex items-center gap-2">
//             <Plus size={16} /> New Refund
//           </button>
//         </div>

//         <div className="grid grid-cols-4 gap-3">
//           <div className="stat-card">
//             <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center"><RotateCcw size={18} className="text-primary-600" /></div>
//             <p className="text-2xl font-bold text-gray-900">{items.length}</p>
//             <p className="text-xs text-gray-500">Total</p>
//           </div>
//           <div className="stat-card">
//             <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center"><DollarSign size={18} className="text-green-600" /></div>
//             <p className="text-2xl font-bold text-gray-900">${totalRefunded.toFixed(2)}</p>
//             <p className="text-xs text-gray-500">Refunded</p>
//           </div>
//           <div className="stat-card">
//             <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><RotateCcw size={18} className="text-amber-600" /></div>
//             <p className="text-2xl font-bold text-gray-900">{items.filter((r) => r.status === 'Initiated').length}</p>
//             <p className="text-xs text-gray-500">In Progress</p>
//           </div>
//           <div className="stat-card">
//             <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><RotateCcw size={18} className="text-red-600" /></div>
//             <p className="text-2xl font-bold text-gray-900">{items.filter((r) => r.status === 'Failed').length}</p>
//             <p className="text-xs text-gray-500">Failed</p>
//           </div>
//         </div>

//         <Card>
//           <div className="flex items-center gap-3 mb-4">
//             <Filter size={14} className="text-gray-400" />
//             <div className="flex flex-wrap gap-2">
//               {['All', ...STATUS_VALUES].map((f) => (
//                 <button key={f} onClick={() => setFilter(f)}
//                   className={`px-3 py-1 text-xs rounded-full ${filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
//                   {f}
//                 </button>
//               ))}
//             </div>
//           </div>
//           <Table columns={columns} data={filtered} loading={false} emptyMessage="No refunds" />
//         </Card>
//       </div>

//       <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Initiate Refund">
//         <form onSubmit={handleCreate} className="space-y-4">
//           <div>
//             <label className="form-label">Remittance *</label>
//             <select required value={form.remitID}
//               onChange={(e) => {
//                 const id = e.target.value
//                 const r = remits.find((x) => x.remitId?.toString() === id)
//                 setForm((f) => ({ ...f, remitID: id, amount: r?.sendAmount?.toString() ?? '' }))
//               }}
//               className="form-select">
//               <option value="">Select remittance...</option>
//               {remits.filter((r) => r.status === 'Cancelled' || r.status === 'Paid').map((r) => (
//                 <option key={r.remitId} value={r.remitId}>
//                   #{r.remitId} — {r.fromCurrency} {r.sendAmount} ({r.status})
//                 </option>
//               ))}
//             </select>
//           </div>
//           <div className="grid grid-cols-2 gap-4">
//             <div>
//               <label className="form-label">Amount *</label>
//               <input type="number" step="0.01" required value={form.amount}
//                 onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
//                 className="form-input" />
//             </div>
//             <div>
//               <label className="form-label">Method *</label>
//               <select required value={form.method}
//                 onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
//                 className="form-select">
//                 {METHODS.map((m) => <option key={m}>{m}</option>)}
//               </select>
//             </div>
//           </div>
//           <div className="flex gap-3">
//             <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary flex-1">Cancel</button>
//             <button type="submit" disabled={saving} className="btn-primary flex-1">
//               {saving ? 'Initiating...' : 'Initiate Refund'}
//             </button>
//           </div>
//         </form>
//       </Modal>
//     </Layout>
//   )
// }



import React, { useEffect, useState } from 'react'
import { formatIST, formatISTDate, formatISTTime } from '../../utils/date'
import { refundsAPI } from '../../api/refunds'
import { remittancesAPI } from '../../api/remittances'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import Table from '../../components/common/Table'
import Modal from '../../components/common/Modal'
import StatusBadge from '../../components/common/StatusBadge'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import { Plus, Trash2, RotateCcw, Check, Filter, DollarSign } from 'lucide-react'

const STATUS_VALUES = ['Initiated', 'Completed', 'Failed']
const METHODS = ['Original', 'Fallback']
const EMPTY = { remitID: '', amount: '', method: 'Original' }

export default function RefundsPage() {
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
      const [rfRes, rRes] = await Promise.all([
        refundsAPI.getAll(),
        remittancesAPI.getAll().catch(() => ({ data: [] })),
      ])
      const rf = rfRes.data ?? rfRes
      const rs = rRes.data ?? rRes
      // Normalize refund records: RemitID->remitID, RefundID->refundID (.NET camelCase)
      setItems(Array.isArray(rf) ? rf.map((r) => ({
        ...r,
        refundID: r.refundID ?? r.refundId ?? r.RefundID,
        remitID:  r.remitID  ?? r.remitId  ?? r.RemitID,
      })) : [])
      // Normalize remittances: remitId is normal camelCase ✓ but guard anyway
      setRemits(Array.isArray(rs) ? rs.map((r) => ({
        ...r,
        remitId: r.remitId ?? r.remitID ?? r.RemitId,
      })) : [])
    } catch {
      toast.error('Failed to load refunds')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await refundsAPI.create({
        remitID: parseInt(form.remitID),
        amount: parseFloat(form.amount),
        method: form.method,
      })
      toast.success('Refund initiated')
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
    if (!confirm(`Mark refund as ${status}?`)) return
    try {
      await refundsAPI.updateStatus(id, { status })
      toast.success(`Marked ${status}`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this refund record?')) return
    try {
      await refundsAPI.delete(id)
      toast.success('Deleted')
      load()
    } catch { toast.error('Failed') }
  }

  const filtered = filter === 'All' ? items : items.filter((r) => r.status === filter)
  const totalRefunded = items.filter((r) => r.status === 'Completed').reduce((s, r) => s + (r.amount || 0), 0)

  const columns = [
    { key: 'refundID',    label: 'ID',         render: (v) => <span className="font-mono">#{v}</span> },
    { key: 'remitID',     label: 'Remit',      render: (v) => <span className="font-mono">#{v}</span> },
    { key: 'amount',      label: 'Amount',     render: (v) => v != null ? <span className="font-semibold">${parseFloat(v).toFixed(2)}</span> : '—' },
    { key: 'method',      label: 'Method',     render: (v) => <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">{v}</span> },
    { key: 'refundDate',  label: 'Date (IST)', render: (v) => formatISTDate(v) },
    { key: 'status',      label: 'Status',     render: (v) => <StatusBadge status={v || 'Initiated'} /> },
    { key: 'refundID',    label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-1">
          {(row.status === 'Initiated' || !row.status) && <>
            <button onClick={() => handleStatus(row.refundID, 'Completed')} title="Mark completed"
              className="p-1.5 hover:bg-green-50 rounded text-green-600"><Check size={13} /></button>
            <button onClick={() => handleStatus(row.refundID, 'Failed')} title="Mark failed"
              className="p-1.5 hover:bg-red-50 rounded text-red-500"><RotateCcw size={13} /></button>
          </>}
          <button onClick={() => handleDelete(row.refundID)} title="Delete"
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
            <h1 className="text-2xl font-bold text-gray-900">Refunds</h1>
            <p className="text-gray-500 text-sm">Refunds for cancelled remittances (Phase-1: reference only)</p>
          </div>
          <button onClick={() => setCreateOpen(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Refund
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="stat-card">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center"><RotateCcw size={18} className="text-primary-600" /></div>
            <p className="text-2xl font-bold text-gray-900">{items.length}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="stat-card">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center"><DollarSign size={18} className="text-green-600" /></div>
            <p className="text-2xl font-bold text-gray-900">${totalRefunded.toFixed(2)}</p>
            <p className="text-xs text-gray-500">Refunded</p>
          </div>
          <div className="stat-card">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><RotateCcw size={18} className="text-amber-600" /></div>
            <p className="text-2xl font-bold text-gray-900">{items.filter((r) => r.status === 'Initiated').length}</p>
            <p className="text-xs text-gray-500">In Progress</p>
          </div>
          <div className="stat-card">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><RotateCcw size={18} className="text-red-600" /></div>
            <p className="text-2xl font-bold text-gray-900">{items.filter((r) => r.status === 'Failed').length}</p>
            <p className="text-xs text-gray-500">Failed</p>
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
          <Table columns={columns} data={filtered} loading={false} emptyMessage="No refunds" />
        </Card>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Initiate Refund">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="form-label">Remittance *</label>
            <select required value={form.remitID}
              onChange={(e) => {
                const id = e.target.value
                const r = remits.find((x) => String(x.remitId) === id)
                setForm((f) => ({ ...f, remitID: id, amount: r?.sendAmount?.toString() ?? '' }))
              }}
              className="form-select">
              <option value="">Select remittance...</option>
              {remits
                .filter((r) => r.status !== 'Refunded')   // exclude already-refunded
                .sort((a, b) => (b.remitId ?? 0) - (a.remitId ?? 0))  // newest first
                .map((r) => (
                  <option key={r.remitId} value={r.remitId}>
                    #{r.remitId} — {r.fromCurrency} {r.sendAmount} → {r.toCurrency} [{r.status}]
                  </option>
                ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Amount *</label>
              <input type="number" step="0.01" required value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="form-input" />
            </div>
            <div>
              <label className="form-label">Method *</label>
              <select required value={form.method}
                onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
                className="form-select">
                {METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Initiating...' : 'Initiate Refund'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}