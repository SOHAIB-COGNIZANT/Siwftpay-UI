import React, { useEffect, useState } from 'react'
import { formatIST, formatISTDate, formatISTTime } from '../../utils/date'
import { Link } from 'react-router-dom'
import { usersAPI } from '../../api/users'
import { remittancesAPI } from '../../api/remittances'
import { kycAPI } from '../../api/kyc'
import { auditLogsAPI } from '../../api/auditlogs'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import Table from '../../components/common/Table'
import StatusBadge from '../../components/common/StatusBadge'
import Loader from '../../components/common/Loader'
import { Users, FileText, Shield, BarChart2, ArrowRight, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const PIE_COLORS = ['#0B4FCC', '#16A34A', '#D97706', '#DC2626', '#7C3AED', '#EA580C']

export default function AdminDashboard() {
  const [users, setUsers] = useState([])
  const [remittances, setRemittances] = useState([])
  const [pendingKyc, setPendingKyc] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      usersAPI.getAll(),
      remittancesAPI.getAll(),
      kycAPI.getPending(1, 5),
      auditLogsAPI.getAll().catch(() => ({ data: [] })),
    ]).then(([u, r, k, a]) => {
      setUsers(Array.isArray(u.data) ? u.data : [])
      setRemittances(Array.isArray(r.data) ? r.data : [])
      const kycRaw = Array.isArray(k.data?.items) ? k.data.items : Array.isArray(k.data) ? k.data : []
      setPendingKyc(kycRaw.map((x) => ({ ...x, kycId: x.kycId ?? x.kYCID ?? x.kycID, kycLevel: x.kycLevel ?? x.kYCLevel })))
      // Normalize audit logs: auditID -> auditId, userID -> userId
      setAuditLogs(Array.isArray(a.data) ? a.data.slice(0, 8).map((l) => ({ ...l, auditId: l.auditId ?? l.auditID, userId: l.userId ?? l.userID })) : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // Status distribution for pie chart
  const statusDist = ['Draft','Validated','ComplianceHold','Routing','Queued','Paid','Cancelled','Refunded'].map((s) => ({
    name: s, value: remittances.filter((r) => r.status === s).length
  })).filter((d) => d.value > 0)

  // Volume by corridor (mock grouped)
  const corridors = {}
  remittances.forEach((r) => {
    const key = `${r.fromCurrency}-${r.toCurrency}`
    corridors[key] = (corridors[key] || 0) + (r.sendAmount || 0)
  })
  const corridorData = Object.entries(corridors).map(([k, v]) => ({ corridor: k, volume: Math.round(v) })).slice(0, 6)

  const stats = [
    { label: 'Total Users',      value: users.length,       icon: Users,     color: 'text-primary-600', bg: 'bg-primary-50',  path: '/admin/users' },
    { label: 'Total Remittances',value: remittances.length, icon: FileText,  color: 'text-green-600',   bg: 'bg-green-50',    path: '/admin/amendments' },
    { label: 'Pending KYC',      value: pendingKyc.length,  icon: Shield,    color: 'text-amber-600',   bg: 'bg-amber-50',    path: '/admin/kyc' },
    { label: 'Compliance Holds', value: remittances.filter((r) => r.status === 'ComplianceHold').length, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', path: '/admin/amendments' },
  ]

  const auditColumns = [
    { key: 'auditId',   label: 'ID',       render: (v) => `#${v}` },
    { key: 'action',    label: 'Action' },
    { key: 'resource',  label: 'Resource' },
    { key: 'timestamp', label: 'Time',     render: (v) => formatIST(v) },
  ]

  if (loading) return <Layout><Loader center /></Layout>

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm">System overview and management</p>
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
          <Card title="Remittance Volume by Corridor">
            {corridorData.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No remittance data</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={corridorData}>
                  <XAxis dataKey="corridor" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="volume" fill="#0B4FCC" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title="Transaction Status Distribution">
            {statusDist.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label>
                    {statusDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card title="Recent Users" action={<Link to="/admin/users" className="text-sm text-primary-600 hover:underline flex items-center gap-1">View all <ArrowRight size={13} /></Link>}>
            <Table
              columns={[
                { key: 'userId',  label: 'ID',    render: (v) => `#${v}` },
                { key: 'name',    label: 'Name' },
                { key: 'email',   label: 'Email', render: (v) => <span className="text-xs">{v}</span> },
                { key: 'status',  label: 'Status',render: (v) => <StatusBadge status={v || 'Active'} /> },
              ]}
              data={users.slice(0, 5)} loading={false} emptyMessage="No users" />
          </Card>

          <Card title="Recent Audit Logs" action={<Link to="/admin/auditlogs" className="text-sm text-primary-600 hover:underline flex items-center gap-1">View all <ArrowRight size={13} /></Link>}>
            <Table columns={auditColumns} data={auditLogs} loading={false} emptyMessage="No audit logs" />
          </Card>
        </div>
      </div>
    </Layout>
  )
}
