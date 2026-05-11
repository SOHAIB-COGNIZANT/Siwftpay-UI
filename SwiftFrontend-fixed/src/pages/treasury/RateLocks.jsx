import React, { useEffect, useState } from 'react'
import { formatIST, formatISTDate, formatISTTime } from '../../utils/date'
import { rateLocksAPI } from '../../api/ratelocks'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import Table from '../../components/common/Table'
import StatusBadge from '../../components/common/StatusBadge'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import { Lock, Search, RefreshCw } from 'lucide-react'

export default function RateLocksPage() {
  const [lookupId, setLookupId] = useState('')
  const [result, setResult] = useState(null)
  const [looking, setLooking] = useState(false)

  const [allLocks, setAllLocks] = useState([])
  const [listLoading, setListLoading] = useState(true)

  const loadAll = () => {
    setListLoading(true)
    rateLocksAPI.getAll()
      .then((r) => setAllLocks(Array.isArray(r.data) ? r.data : []))
      .catch(() => setAllLocks([]))
      .finally(() => setListLoading(false))
  }
  useEffect(loadAll, [])

  const handleLookup = async (e) => {
    e.preventDefault()
    if (!lookupId.trim()) return
    setLooking(true)
    try {
      const res = await rateLocksAPI.getById(lookupId.trim())
      setResult(res.data ?? res)
    } catch (err) {
      setResult(null)
      toast.error(err.response?.data?.message || 'Rate lock not found')
    } finally {
      setLooking(false)
    }
  }

  // Status colour
  const STATUS_COLOR = {
    Locked:   'bg-blue-50 text-blue-700',
    Released: 'bg-green-50 text-green-700',
    Expired:  'bg-gray-50 text-gray-600',
  }

  const columns = [
    { key: 'lockID',    label: 'Lock ID',    render: (v) => <span className="font-mono text-xs">{(v || '').slice(0,8)}…</span> },
    { key: 'quoteID',   label: 'Quote ID',   render: (v) => <span className="font-mono text-xs">{(v || '').slice(0,8)}…</span> },
    { key: 'customerID',label: 'Customer',   render: (v) => v ? <span className="font-mono">#{v}</span> : '—' },
    { key: 'status',    label: 'Status',     render: (v) => (
      <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLOR[v] || 'bg-gray-50 text-gray-600'}`}>{v}</span>
    )},
    { key: 'lockStart',  label: 'Locked At (IST)', render: (v) => formatIST(v) },
    { key: 'lockExpiry', label: 'Expires (IST)',   render: (v) => formatIST(v) },
  ]

  const stats = [
    { label: 'Total',    value: allLocks.length },
    { label: 'Locked',   value: allLocks.filter((l) => l.status === 'Locked').length },
    { label: 'Released', value: allLocks.filter((l) => l.status === 'Released').length },
    { label: 'Expired',  value: allLocks.filter((l) => l.status === 'Expired').length },
  ]

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rate Locks</h1>
            <p className="text-gray-500 text-sm">Customer-held FX rate guarantees — 15-minute windows</p>
          </div>
          <button onClick={loadAll} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="stat-card">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                <Lock size={18} className="text-primary-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Full list */}
        <Card title="All Rate Locks">
          <Table columns={columns} data={allLocks} loading={listLoading} emptyMessage="No rate locks created yet" />
        </Card>

        {/* Lookup */}
        <Card title="Look Up by Lock ID">
          <form onSubmit={handleLookup} className="flex gap-3">
            <input value={lookupId} onChange={(e) => setLookupId(e.target.value)}
              className="form-input flex-1 font-mono text-xs"
              placeholder="00000000-0000-0000-0000-000000000000" />
            <button type="submit" disabled={looking}
              className="btn-primary flex items-center gap-2">
              <Search size={14} /> {looking ? 'Looking…' : 'Look Up'}
            </button>
          </form>

          {result && (
            <div className="mt-5 bg-primary-50 rounded-xl p-5 space-y-3 text-sm grid grid-cols-2 gap-4">
              {[
                ['Lock ID',   result.lockID,    'mono'],
                ['Quote ID',  result.quoteID,   'mono'],
                ['Customer',  result.customerID, ''],
                ['Status',    null,              'badge'],
                ['Locked At', result.lockStart,  'date'],
                ['Expires',   result.lockExpiry, 'date'],
              ].map(([label, val, type]) => (
                <div key={label}>
                  <p className="text-gray-400 text-xs uppercase tracking-wide">{label}</p>
                  {type === 'badge' ? <StatusBadge status={result.status || 'Locked'} />
                    : type === 'date' ? <p>{formatIST(val)}</p>
                    : type === 'mono' ? <p className="font-mono text-xs">{(val || '').slice(0,16)}…</p>
                    : <p className="font-semibold">{val ?? '—'}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  )
}
