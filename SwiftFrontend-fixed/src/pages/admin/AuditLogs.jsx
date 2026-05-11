import React, { useEffect, useState } from 'react'
import { formatIST, formatISTDate, formatISTTime } from '../../utils/date'
import { auditLogsAPI } from '../../api/auditlogs'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import Table from '../../components/common/Table'
import Loader from '../../components/common/Loader'
import { Search, Filter, RefreshCw } from 'lucide-react'

export default function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const load = (filtered = false) => {
    setLoading(true)
    const fetch = filtered && startDate && endDate
      ? auditLogsAPI.getByDateRange(startDate, endDate)
      : auditLogsAPI.getAll()
    fetch
      .then((r) => setLogs(Array.isArray(r.data) ? r.data : []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => load(), [])

  // Normalize audit log records: .NET camelCase sends AuditID->auditID, UserID->userID
  const normalize = (l) => ({
    ...l,
    auditId:  l.auditId  ?? l.auditID,
    userId:   l.userId   ?? l.userID,
    userName: l.userName ?? l.UserName,
  })

  const filtered = logs.map(normalize).filter((l) =>
    !search || `${l.action} ${l.resource} ${l.userId} ${l.auditId}`.toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    { key: 'auditId',   label: 'Audit ID',  render: (v) => <span className="font-mono text-xs">#{v}</span> },
    { key: 'userId',    label: 'User ID',   render: (v) => <span className="font-mono text-xs">{v}</span> },
    { key: 'action',    label: 'Action',    render: (v) => (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
        v === 'Create' ? 'bg-green-100 text-green-700' :
        v === 'Update' ? 'bg-blue-100 text-blue-700' :
        v === 'Delete' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
      }`}>{v}</span>
    )},
    { key: 'resource',  label: 'Resource',  render: (v) => <span className="text-xs font-mono">{v}</span> },
    { key: 'timestamp', label: 'Timestamp', render: (v) => <span className="text-xs">{formatIST(v)}</span> },
  ]

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-gray-500 text-sm">Immutable system activity trail</p>
          </div>
          <button onClick={() => load()} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Filters */}
        <Card>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-48">
              <label className="form-label">Search</label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Action, resource, user..." value={search}
                  onChange={(e) => setSearch(e.target.value)} className="form-input pl-9" />
              </div>
            </div>
            <div>
              <label className="form-label">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="form-input" />
            </div>
            <button onClick={() => load(true)} disabled={!startDate || !endDate} className="btn-primary flex items-center gap-2">
              <Filter size={14} /> Filter
            </button>
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-gray-500">{filtered.length} records</p>
          </div>
          <Table columns={columns} data={filtered} loading={loading} emptyMessage="No audit logs found" />
        </Card>
      </div>
    </Layout>
  )
}
