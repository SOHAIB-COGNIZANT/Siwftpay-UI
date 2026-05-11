import React, { useEffect, useState } from 'react'
import { formatIST, formatISTDate, formatISTTime } from '../../utils/date'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { customersAPI } from '../../api/customers'
import { notificationsAPI } from '../../api/notifications'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import StatusBadge from '../../components/common/StatusBadge'
import Loader from '../../components/common/Loader'
import {
  Send, Users, Bell, ArrowRight, DollarSign,
  RefreshCw, CheckCircle, Clock, AlertTriangle, ShieldOff,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { isKycVerified } from '../../utils/kyc'

const CHART_DATA = [
  { month: 'Nov', volume: 4200 },
  { month: 'Dec', volume: 6800 },
  { month: 'Jan', volume: 5400 },
  { month: 'Feb', volume: 7200 },
  { month: 'Mar', volume: 9100 },
  { month: 'Apr', volume: 8300 },
]

export default function CustomerDashboard() {
  const { user, customerProfile, kyc } = useAuth()
  const [remittances, setRemittances] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const kycVerified = isKycVerified(kyc)
  const kycStatusLabel = kyc?.verificationStatus ?? 'Not started'

  useEffect(() => {
    if (customerProfile?.customerId) {
      Promise.all([
        customersAPI.getRemittances(customerProfile.customerId, 1, 5),
        notificationsAPI.getUnread(user.userId),
      ]).then(([remitRes, notifRes]) => {
        setRemittances(Array.isArray(remitRes.data?.items) ? remitRes.data.items : Array.isArray(remitRes.data) ? remitRes.data : [])
        setNotifications(Array.isArray(notifRes.data) ? notifRes.data.slice(0, 5).map((n) => ({ ...n, notificationId: n.notificationId ?? n.notificationID })) : [])
      }).catch(() => {}).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [customerProfile, user])

  const stats = [
    { label: 'Total Sent',     value: `$${remittances.reduce((a, r) => a + (r.sendAmount || 0), 0).toFixed(2)}`, icon: DollarSign, color: 'text-primary-600', bg: 'bg-primary-50' },
    { label: 'Transactions',   value: remittances.length, icon: RefreshCw, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Completed',      value: remittances.filter((r) => r.status === 'Paid').length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Pending',        value: remittances.filter((r) => ['Draft','Validated','Routing','Queued'].includes(r.status)).length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  if (loading) return <Layout><Loader center /></Layout>

  // KYC banner state
  const banner = !customerProfile?.customerId
    ? { tone: 'amber', icon: AlertTriangle, title: 'Complete your profile', body: 'Set up your customer profile to begin.', cta: 'Go to Profile' }
    : !kyc
    ? { tone: 'amber', icon: ShieldOff, title: 'KYC required', body: 'Submit KYC documents to unlock transactions.', cta: 'Submit KYC' }
    : kyc.verificationStatus === 'Pending'
    ? { tone: 'amber', icon: Clock, title: 'KYC under review', body: 'An analyst is verifying your documents. You\'ll be notified once approved.', cta: 'View Status' }
    : kyc.verificationStatus === 'Rejected'
    ? { tone: 'red', icon: ShieldOff, title: 'KYC rejected', body: kyc.notes || 'Re-upload corrected documents and resubmit.', cta: 'Resubmit' }
    : null  // Verified — no banner

  const bannerToneClasses = {
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    red:   'bg-red-50 border-red-200 text-red-800',
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* KYC Banner */}
        {banner && (
          <div className={`rounded-2xl border p-4 flex flex-col md:flex-row items-start md:items-center gap-4 ${bannerToneClasses[banner.tone]}`}>
            <div className="flex items-start gap-3 flex-1">
              <banner.icon size={24} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{banner.title}</p>
                <p className="text-sm opacity-90">{banner.body}</p>
              </div>
            </div>
            <Link to="/customer/profile" className="btn-primary flex items-center gap-2 flex-shrink-0">
              {banner.cta} <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {/* Welcome */}
        <div className="gradient-hero rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Welcome back, {user?.name?.split(' ')[0] || 'Customer'} 👋
            </h1>
            <p className="text-blue-100 mt-1 text-sm">
              KYC Status:
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${kycVerified ? 'bg-green-500/30 text-white' : 'bg-white/20 text-white'}`}>
                {kycStatusLabel}
              </span>
            </p>
          </div>
          {kycVerified ? (
            <Link to="/customer/send" className="btn-accent flex items-center gap-2 flex-shrink-0">
              <Send size={16} /> Send Money
            </Link>
          ) : (
            <Link to="/customer/profile" className="btn-accent flex items-center gap-2 flex-shrink-0">
              <CheckCircle size={16} /> Complete KYC
            </Link>
          )}
        </div>

        {/* Stats */}
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

        {/* Chart + Notifications */}
        <div className="grid lg:grid-cols-3 gap-6">
          <Card title="Transfer Volume" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={CHART_DATA}>
                <defs>
                  <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0B4FCC" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0B4FCC" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="volume" stroke="#0B4FCC" strokeWidth={2} fill="url(#colorVol)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Notifications" action={
            <Link to="/customer/notifications" className="text-sm text-primary-600 hover:underline">View all</Link>
          }>
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No new notifications</p>
            ) : (
              <ul className="space-y-3">
                {notifications.map((n) => (
                  <li key={n.notificationId} className="flex gap-3 text-sm">
                    <Bell size={14} className="text-primary-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-700 leading-snug">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{n.category}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card title="Recent Transactions" action={
          <Link to="/customer/remittances" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        }>
          {remittances.length === 0 ? (
            <div className="text-center py-10">
              <Send size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No transactions yet.</p>
              <Link to="/customer/send" className="btn-primary text-sm mt-4 inline-block">Send your first transfer</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {remittances.map((r) => (
                <div key={r.remitId} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                      <Send size={16} className="text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {r.fromCurrency} → {r.toCurrency}
                      </p>
                      <p className="text-xs text-gray-400">{formatISTDate(r.createdDate)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{r.fromCurrency} {r.sendAmount?.toFixed(2)}</p>
                    <StatusBadge status={r.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Send Money',   path: '/customer/send',          icon: Send,    color: 'text-primary-600', bg: 'bg-primary-50' },
            { label: 'Beneficiaries',path: '/customer/beneficiaries', icon: Users,   color: 'text-green-600',   bg: 'bg-green-50' },
            { label: 'Track',        path: '/customer/remittances',   icon: RefreshCw,color: 'text-blue-600',  bg: 'bg-blue-50' },
            { label: 'Alerts',       path: '/customer/notifications', icon: Bell,    color: 'text-amber-600',   bg: 'bg-amber-50' },
          ].map((q) => {
            const Icon = q.icon
            return (
              <Link key={q.label} to={q.path} className="card flex flex-col items-center text-center gap-3 hover:shadow-lg transition-shadow cursor-pointer py-5">
                <div className={`w-12 h-12 rounded-xl ${q.bg} flex items-center justify-center`}>
                  <Icon size={20} className={q.color} />
                </div>
                <span className="text-sm font-medium text-gray-700">{q.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}
