import React, { useEffect, useState } from 'react'
import { formatIST, formatISTDate, formatISTTime } from '../../utils/date'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { remittancesAPI } from '../../api/remittances'
import { kycAPI } from '../../api/kyc'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import Table from '../../components/common/Table'
import StatusBadge from '../../components/common/StatusBadge'
import Loader from '../../components/common/Loader'
import { Send, FileCheck, Users, Clock, ArrowRight } from 'lucide-react'

export default function AgentDashboard() {
  const { user } = useAuth()
  const [remits, setRemits] = useState([])
  const [pendingKyc, setPendingKyc] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      remittancesAPI.getAll().catch(() => ({ data: [] })),
      kycAPI.getPending(1, 20).catch(() => ({ data: { items: [] } })),
    ]).then(([r, k]) => {
      const rPayload = r.data ?? r
      setRemits(Array.isArray(rPayload) ? rPayload : [])
      const kPayload = k.data?.items ?? k.data ?? k
      setPendingKyc(Array.isArray(kPayload) ? kPayload : [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <Layout><Loader center /></Layout>

  const drafts = remits.filter((r) => r.status === 'Draft')
  const validated = remits.filter((r) => r.status === 'Validated')
  const today = remits.filter((r) => {
    const d = r.createdDate ? new Date(r.createdDate) : null
    return d && d.toDateString() === new Date().toDateString()
  })

  const stats = [
    { label: 'Drafts to Validate',      value: drafts.length,    icon: Clock,     color: 'text-amber-600',  bg: 'bg-amber-50' },
    { label: 'Validated Today',         value: validated.length, icon: FileCheck, color: 'text-green-600',  bg: 'bg-green-50' },
    { label: 'New Today',               value: today.length,     icon: Send,      color: 'text-primary-600',bg: 'bg-primary-50' },
    { label: 'Pending KYC',             value: pendingKyc.length,icon: Users,     color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  const recentColumns = [
    { key: 'remitId',      label: 'ID',       render: (v) => <span className="font-mono">#{v}</span> },
    { key: 'fromCurrency', label: 'From' },
    { key: 'toCurrency',   label: 'To' },
    { key: 'sendAmount',   label: 'Amount',   render: (v, r) => `${r.fromCurrency} ${v}` },
    { key: 'status',       label: 'Status',   render: (v) => <StatusBadge status={v} /> },
    { key: 'createdDate',  label: 'Created',  render: (v) => v ? formatISTDate(v) : '—' },
  ]

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.name}</h1>
            <p className="text-gray-500 text-sm">Agent console — assist customers, validate remittances, review KYC</p>
          </div>
          <Link to="/agent/send" className="btn-primary flex items-center gap-2">
            <Send size={16} /> Initiate Transfer
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

        <div className="grid md:grid-cols-2 gap-6">
          <Card title="Recent Remittances"
            action={
              <Link to="/agent/remittances" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
                View all <ArrowRight size={13} />
              </Link>
            }>
            <Table columns={recentColumns} data={remits.slice(0, 8)} loading={false} emptyMessage="No remittances yet" />
          </Card>

          <Card title="Pending KYC"
            action={
              <Link to="/agent/kyc" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
                Review <ArrowRight size={13} />
              </Link>
            }>
            {pendingKyc.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">No pending KYC reviews</div>
            ) : (
              <ul className="space-y-2">
                {pendingKyc.slice(0, 8).map((k) => (
                  <li key={k.kycID || k.kycid} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">User #{k.userID || k.userId}</p>
                      <p className="text-xs text-gray-500">Level: {k.kycLevel}</p>
                    </div>
                    <StatusBadge status={k.verificationStatus || 'Pending'} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  )
}
