import React, { useEffect, useState } from 'react'
import { formatIST, formatISTDate, formatISTTime } from '../../utils/date'
import { Link } from 'react-router-dom'
import { remittancesAPI } from '../../api/remittances'
import { settlementAPI } from '../../api/settlement'
import { reconciliationAPI } from '../../api/reconciliation'
import { amendmentsAPI } from '../../api/amendments'
import { cancellationsAPI } from '../../api/cancellations'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import Table from '../../components/common/Table'
import StatusBadge from '../../components/common/StatusBadge'
import Loader from '../../components/common/Loader'
import { ClipboardList, Landmark, RefreshCw, ArrowLeftRight, X, CreditCard, ArrowRight } from 'lucide-react'

export default function OperationsDashboard() {
  const [remittances, setRemittances] = useState([])
  const [mismatches, setMismatches] = useState([])
  const [amendments, setAmendments] = useState([])
  const [cancellations, setCancellations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      remittancesAPI.getAll(),
      reconciliationAPI.getMismatches().catch(() => ({ data: [] })),
      amendmentsAPI.getAll().catch(() => ({ data: [] })),
      cancellationsAPI.getAll().catch(() => ({ data: [] })),
    ]).then(([r, m, a, c]) => {
      setRemittances(Array.isArray(r.data) ? r.data : [])
      setMismatches(Array.isArray(m.data) ? m.data.map((x) => ({ ...x, reconId: x.reconId ?? x.reconID, referenceId: x.referenceId ?? x.referenceID })) : [])
      setAmendments(Array.isArray(a.data) ? a.data : [])
      // .NET camelCase: CancellationID -> cancellationID; normalize to cancellationId
      setCancellations(Array.isArray(c.data) ? c.data.map((x) => ({ ...x, cancellationId: x.cancellationId ?? x.cancellationID })) : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const queued = remittances.filter((r) => ['Queued', 'Routing', 'Validated'].includes(r.status))
  const holds  = remittances.filter((r) => r.status === 'ComplianceHold')

  const stats = [
    { label: 'Queued/Routing', value: queued.length, icon: ClipboardList, color: 'text-primary-600', bg: 'bg-primary-50', path: '/ops/queue' },
    { label: 'Compliance Holds', value: holds.length, icon: X, color: 'text-red-600', bg: 'bg-red-50', path: '/ops/queue' },
    { label: 'Recon Mismatches', value: mismatches.length, icon: RefreshCw, color: 'text-amber-600', bg: 'bg-amber-50', path: '/ops/reconciliation' },
    { label: 'Pending Amendments', value: amendments.filter((a) => a.status === 'Pending').length, icon: ArrowLeftRight, color: 'text-indigo-600', bg: 'bg-indigo-50', path: '/ops/amendments' },
  ]

  const remitColumns = [
    { key: 'remitId',     label: 'ID',       render: (v) => `#${v}` },
    { key: 'createdDate', label: 'Date',     render: (v) => formatISTDate(v) },
    { key: 'fromCurrency',label: 'Corridor', render: (_, r) => `${r.fromCurrency}→${r.toCurrency}` },
    { key: 'sendAmount',  label: 'Amount',   render: (v, r) => `${r.fromCurrency} ${v?.toFixed(2)}` },
    { key: 'status',      label: 'Status',   render: (v) => <StatusBadge status={v} /> },
  ]

  if (loading) return <Layout><Loader center /></Layout>

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operations Dashboard</h1>
          <p className="text-gray-500 text-sm">Manage transaction queues, settlement, and reconciliation</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => {
            const Icon = s.icon
            return (
              <Link key={s.label} to={s.path} className="stat-card hover:shadow-lg transition-shadow">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <Icon size={18} className={s.color} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </Link>
            )
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card title="Transaction Queue" action={<Link to="/ops/queue" className="text-sm text-primary-600 hover:underline flex items-center gap-1">View all <ArrowRight size={13} /></Link>}>
            <Table columns={remitColumns} data={queued.slice(0, 5)} loading={false} emptyMessage="Queue is clear" />
          </Card>
          <Card title="Recent Cancellations" action={<Link to="/ops/cancellations" className="text-sm text-primary-600 hover:underline flex items-center gap-1">View all <ArrowRight size={13} /></Link>}>
            <Table
              columns={[
                { key: 'cancellationId', label: 'ID', render: (v) => `#${v}` },
                { key: 'reason', label: 'Reason', render: (v) => <span className="text-xs">{v}</span> },
                { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
              ]}
              data={cancellations.slice(0, 5)} loading={false} emptyMessage="No cancellations" />
          </Card>
        </div>
      </div>
    </Layout>
  )
}
