import React, { useEffect, useState } from 'react'
import { formatIST, formatISTDate, formatISTTime } from '../../utils/date'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { customersAPI } from '../../api/customers'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import Table from '../../components/common/Table'
import StatusBadge from '../../components/common/StatusBadge'
import { Send, Search, Filter } from 'lucide-react'

export default function Remittances() {
  const { customerProfile } = useAuth()
  const [remittances, setRemittances] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (customerProfile?.customerId) {
      customersAPI.getRemittances(customerProfile.customerId, page, 20)
        .then((r) => {
          const data = r.data?.items || r.data || []
          setRemittances(Array.isArray(data) ? data : [])
        })
        .catch(() => setRemittances([]))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [customerProfile, page])

  const statuses = ['All', 'Draft', 'Validated', 'ComplianceHold', 'Routing', 'Queued', 'Paid', 'Cancelled', 'Refunded']
  const filtered = remittances.filter((r) => {
    const matchStatus = statusFilter === 'All' || r.status === statusFilter
    const matchSearch = !search || `${r.fromCurrency} ${r.toCurrency} ${r.remitId}`.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const columns = [
    { key: 'remitId', label: 'ID', render: (v) => <span className="font-mono text-xs">#{v}</span> },
    { key: 'createdDate', label: 'Date', render: (v) => formatISTDate(v) },
    { key: 'fromCurrency', label: 'Corridor', render: (_, r) => `${r.fromCurrency} → ${r.toCurrency}` },
    { key: 'sendAmount', label: 'Send Amount', render: (v, r) => `${r.fromCurrency} ${v?.toFixed(2)}` },
    { key: 'receiverAmount', label: 'Receive', render: (v, r) => `${r.toCurrency} ${v?.toFixed(2)}` },
    { key: 'rateApplied', label: 'Rate', render: (v) => v?.toFixed(4) },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
    {
      key: 'remitId', label: 'Action',
      render: (v) => (
        <Link to={`/customer/remittances/${v}`} className="text-primary-600 text-xs hover:underline font-medium">
          View
        </Link>
      )
    },
  ]

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Transactions</h1>
            <p className="text-gray-500 text-sm mt-0.5">Track all your international transfers</p>
          </div>
          <Link to="/customer/send" className="btn-primary flex items-center gap-2">
            <Send size={16} /> Send Money
          </Link>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === s ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
              }`}>
              {s}
            </button>
          ))}
        </div>

        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text" placeholder="Search by ID or currency..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="form-input pl-9" />
            </div>
          </div>
          <Table columns={columns} data={filtered} loading={loading}
            emptyMessage="No transactions found. Start by sending money!" />
        </Card>
      </div>
    </Layout>
  )
}
