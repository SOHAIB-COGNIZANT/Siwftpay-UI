import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usersAPI } from '../../api/users'
import { rolesAPI } from '../../api/roles'
import { remittancesAPI } from '../../api/remittances'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import { Settings as SettingsIcon, Server, Database, Shield, Activity, RefreshCw, ExternalLink } from 'lucide-react'

const ENV_NAME = import.meta.env.MODE
const API_BASE = import.meta.env.VITE_API_BASE_URL || '(via Vite proxy)'

export default function AdminSettings() {
  const { user, logout } = useAuth()
  const [stats, setStats] = useState({ users: 0, roles: 0, remittances: 0 })
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [u, r, m] = await Promise.all([
        usersAPI.getAll().catch(() => ({ data: [] })),
        rolesAPI.getAll().catch(() => ({ data: [] })),
        remittancesAPI.getAll().catch(() => ({ data: [] })),
      ])
      setStats({
        users: (u.data ?? u)?.length ?? 0,
        roles: (r.data?.roles ?? r.data ?? [])?.length ?? 0,
        remittances: (m.data ?? m)?.length ?? 0,
      })
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  if (loading) return <Layout><Loader center /></Layout>

  const InfoRow = ({ label, value, mono }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm ${mono ? 'font-mono' : 'font-medium'} text-gray-900`}>{value}</span>
    </div>
  )

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-500 text-sm">Environment, runtime info, and admin shortcuts</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card title="Environment">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                <Server size={18} className="text-primary-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">SwiftPay Web Portal</p>
                <p className="text-xs text-gray-500">International Remittance & Currency Exchange</p>
              </div>
            </div>
            <InfoRow label="Build mode" value={ENV_NAME} />
            <InfoRow label="API base" value={API_BASE} mono />
            <InfoRow label="UI version" value="1.0.0" />
            <InfoRow label="Backend" value=".NET 10 ASP.NET Core" />
            <InfoRow label="Database" value="SQL Server (LocalDB)" />
          </Card>

          <Card title="Current Session">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <Shield size={18} className="text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
            <InfoRow label="User ID" value={`#${user?.userId}`} mono />
            <InfoRow label="Primary role" value={user?.role || '—'} />
            <InfoRow label="All roles" value={(user?.roles ?? []).join(', ') || '—'} />
            <InfoRow label="Status" value={user?.status || 'Active'} />
            <button onClick={logout} className="btn-secondary w-full mt-4 flex items-center justify-center gap-2">
              <Activity size={14} /> Sign Out
            </button>
          </Card>

          <Card title="System Counters">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Database size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Live data snapshot</p>
                <p className="text-xs text-gray-500">Updated {new Date().toLocaleTimeString()}</p>
              </div>
            </div>
            <InfoRow label="Users" value={stats.users} />
            <InfoRow label="Roles" value={stats.roles} />
            <InfoRow label="Remittances" value={stats.remittances} />
            <button onClick={load} className="btn-secondary w-full mt-4 flex items-center justify-center gap-2">
              <RefreshCw size={14} /> Refresh
            </button>
          </Card>

          <Card title="Quick Links">
            <div className="space-y-2">
              <a href="/admin/users" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 text-sm">
                <span>User Management</span><ExternalLink size={14} className="text-gray-400" />
              </a>
              <a href="/admin/roles" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 text-sm">
                <span>Roles & Permissions</span><ExternalLink size={14} className="text-gray-400" />
              </a>
              <a href="/admin/feerules" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 text-sm">
                <span>Fee Rules</span><ExternalLink size={14} className="text-gray-400" />
              </a>
              <a href="/admin/routing" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 text-sm">
                <span>Routing Rules</span><ExternalLink size={14} className="text-gray-400" />
              </a>
              <a href="/admin/auditlogs" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 text-sm">
                <span>Audit Logs</span><ExternalLink size={14} className="text-gray-400" />
              </a>
              <a href="/admin/reports" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 text-sm">
                <span>Reports</span><ExternalLink size={14} className="text-gray-400" />
              </a>
            </div>
          </Card>
        </div>

        <Card title="About">
          <div className="text-sm text-gray-600 leading-relaxed">
            SwiftPay is an international remittance and currency exchange platform. This admin console
            lets you manage users, roles, corridor fees, routing rules, payout instructions, settlement
            batches, reconciliation, amendments, cancellations, and refunds. Phase-1 stores partner
            payloads as references only — no live FX feeds or correspondent rails are connected.
          </div>
        </Card>
      </div>
    </Layout>
  )
}
