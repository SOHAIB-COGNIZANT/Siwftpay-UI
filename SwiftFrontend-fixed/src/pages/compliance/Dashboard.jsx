import React, { useEffect, useState } from 'react'
import { formatIST, formatISTDate, formatISTTime } from '../../utils/date'
import { Link } from 'react-router-dom'
import { remittancesAPI } from '../../api/remittances'
import { kycAPI } from '../../api/kyc'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import Table from '../../components/common/Table'
import StatusBadge from '../../components/common/StatusBadge'
import Loader from '../../components/common/Loader'
import { Shield, AlertTriangle, Clock, CheckCircle, ArrowRight } from 'lucide-react'

export default function ComplianceDashboard() {
  const [remittances, setRemittances] = useState([])
  const [pendingKyc, setPendingKyc] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      remittancesAPI.getAll(),
      kycAPI.getPending(1, 10),
    ]).then(([r, k]) => {
      setRemittances(Array.isArray(r.data) ? r.data : [])
      const kycRaw = Array.isArray(k.data?.items) ? k.data.items : Array.isArray(k.data) ? k.data : []
      // .NET camelCase: KYCID->kYCID, KYCLevel->kYCLevel; normalize for consistent access
      setPendingKyc(kycRaw.map((x) => ({
        ...x,
        kycId:    x.kycId    ?? x.kYCID   ?? x.kycID,
        kycLevel: x.kycLevel ?? x.kYCLevel,
      })))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const held = remittances.filter((r) => r.status === 'ComplianceHold')
  const pending = remittances.filter((r) => r.status === 'Draft')

  const stats = [
    { label: 'Compliance Holds', value: held.length, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Pending KYC',      value: pendingKyc.length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Validated Today',  value: remittances.filter((r) => r.status === 'Validated').length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Total Remittances',value: remittances.length, icon: Shield, color: 'text-primary-600', bg: 'bg-primary-50' },
  ]

  const heldColumns = [
    { key: 'remitId',    label: 'ID',     render: (v) => `#${v}` },
    { key: 'createdDate',label: 'Date',   render: (v) => formatISTDate(v) },
    { key: 'fromCurrency',label: 'Corridor', render: (_, r) => `${r.fromCurrency}→${r.toCurrency}` },
    { key: 'sendAmount', label: 'Amount', render: (v, r) => `${r.fromCurrency} ${v?.toFixed(2)}` },
    { key: 'status',     label: 'Status', render: (v) => <StatusBadge status={v} /> },
    { key: 'remitId',    label: 'Action', render: (v) => <Link to={`/compliance/checks?remitId=${v}`} className="text-primary-600 text-xs hover:underline">Review</Link> },
  ]

  const kycColumns = [
    { key: 'kycId',              label: 'KYC ID',   render: (v) => `#${v}` },
    { key: 'kycLevel',           label: 'Level' },
    { key: 'verificationStatus', label: 'Status',   render: (v) => <StatusBadge status={v} /> },
    { key: 'kycId',              label: 'Action',   render: (v) => <Link to={`/compliance/kyc?id=${v}`} className="text-primary-600 text-xs hover:underline">Review</Link> },
  ]

  if (loading) return <Layout><Loader center /></Layout>

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance Dashboard</h1>
          <p className="text-gray-500 text-sm">Review KYC, AML flags, and compliance holds</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

        <div className="grid lg:grid-cols-2 gap-6">
          <Card title="Compliance Holds" action={
            <Link to="/compliance/checks" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              View all <ArrowRight size={13} />
            </Link>
          }>
            <Table columns={heldColumns} data={held.slice(0, 5)} loading={false} emptyMessage="No compliance holds" />
          </Card>

          <Card title="Pending KYC Reviews" action={
            <Link to="/compliance/kyc" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              View all <ArrowRight size={13} />
            </Link>
          }>
            <Table columns={kycColumns} data={pendingKyc.slice(0, 5)} loading={false} emptyMessage="No pending KYC" />
          </Card>
        </div>
      </div>
    </Layout>
  )
}
