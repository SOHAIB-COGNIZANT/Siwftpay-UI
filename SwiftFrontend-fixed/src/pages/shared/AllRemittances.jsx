import React, { useEffect, useState } from 'react'
import { formatIST, formatISTDate, formatISTTime } from '../../utils/date'
import { Link } from 'react-router-dom'
import { remittancesAPI } from '../../api/remittances'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import Table from '../../components/common/Table'
import StatusBadge from '../../components/common/StatusBadge'
import toast from 'react-hot-toast'
import { Search, RefreshCw } from 'lucide-react'

export default function AllRemittances({ role }) {
  const [remittances, setRemittances] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const load = () => {
    setLoading(true)
    remittancesAPI.getAll()
      .then((r) => setRemittances(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleValidate = async (remitId) => {
    try {
      await remittancesAPI.validate(remitId)
      toast.success('Remittance validated')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Validation failed')
    }
  }

  const statuses = ['All', 'Draft', 'Validated', 'ComplianceHold', 'Routing', 'Queued', 'Paid', 'Cancelled']
  const filtered = remittances.filter((r) => {
    const matchStatus = statusFilter === 'All' || r.status === statusFilter
    const matchSearch = !search || `${r.remitId} ${r.fromCurrency} ${r.toCurrency} ${r.purposeCode}`.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const columns = [
    { key: 'remitId',     label: 'ID',       render: (v) => <span className="font-mono">#{v}</span> },
    { key: 'createdDate', label: 'Date',     render: (v) => formatISTDate(v) },
    { key: 'fromCurrency',label: 'Corridor', render: (_, r) => `${r.fromCurrency}→${r.toCurrency}` },
    { key: 'sendAmount',  label: 'Send',     render: (v, r) => `${r.fromCurrency} ${v?.toFixed(2)}` },
    { key: 'receiverAmount',label: 'Receive',render: (v, r) => `${r.toCurrency} ${v?.toFixed(2)}` },
    { key: 'purposeCode', label: 'Purpose',  render: (v) => <span className="text-xs">{v}</span> },
    { key: 'status',      label: 'Status',   render: (v) => <StatusBadge status={v} /> },
    { key: 'remitId',     label: 'Actions',
      render: (v, row) => (
        <div className="flex gap-2">
          <Link to={`/${role?.toLowerCase()}/remittances/${v}`} className="text-primary-600 text-xs hover:underline">View</Link>
          {(role === 'Agent' || role === 'Admin') && row.status === 'Draft' && (
            <button onClick={() => handleValidate(v)} className="text-green-600 text-xs hover:underline">Validate</button>
          )}
        </div>
      )
    },
  ]

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Remittances</h1>
            <p className="text-gray-500 text-sm">{filtered.length} of {remittances.length} records</p>
          </div>
          <button onClick={load} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {statuses.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                statusFilter === s ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
              }`}>{s}</button>
          ))}
        </div>

        <Card>
          <div className="relative mb-4">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search remittances..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="form-input pl-9" />
          </div>
          <Table columns={columns} data={filtered} loading={loading} emptyMessage="No remittances found" />
        </Card>
      </div>
    </Layout>
  )
}
