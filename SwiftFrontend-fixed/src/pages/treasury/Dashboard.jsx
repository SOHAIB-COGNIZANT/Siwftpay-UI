import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { feeRulesAPI } from '../../api/feerules'
import { remittancesAPI } from '../../api/remittances'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import Loader from '../../components/common/Loader'
import { DollarSign, Globe, TrendingUp, Lock, Activity, ArrowRight } from 'lucide-react'

export default function TreasuryDashboard() {
  const { user } = useAuth()
  const [feeRules, setFeeRules] = useState([])
  const [remits, setRemits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      feeRulesAPI.getAll().catch(() => ({ data: [] })),
      remittancesAPI.getAll().catch(() => ({ data: [] })),
    ]).then(([f, r]) => {
      setFeeRules(Array.isArray(f.data) ? f.data : [])
      const rPayload = r.data ?? r
      setRemits(Array.isArray(rPayload) ? rPayload : [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <Layout><Loader center /></Layout>

  const corridors = new Set(feeRules.map((f) => f.corridor))
  const totalVolume = remits.reduce((s, r) => s + (r.sendAmount || 0), 0)
  const totalFees = remits.reduce((s, r) => s + (r.feeApplied || 0), 0)
  const avgFee = feeRules.length ? feeRules.reduce((s, r) => s + (r.feeValue || 0), 0) / feeRules.length : 0

  const stats = [
    { label: 'Active Fee Rules',  value: feeRules.length,                     icon: DollarSign, color: 'text-primary-600', bg: 'bg-primary-50' },
    { label: 'Corridors',         value: corridors.size,                      icon: Globe,      color: 'text-green-600',   bg: 'bg-green-50' },
    { label: 'Avg Configured Fee',value: `$${avgFee.toFixed(2)}`,             icon: TrendingUp, color: 'text-amber-600',   bg: 'bg-amber-50' },
    { label: 'Volume Processed',  value: `$${(totalVolume/1000).toFixed(1)}K`,icon: Activity,   color: 'text-purple-600',  bg: 'bg-purple-50' },
  ]

  // Group remit volume by corridor
  const corridorStats = remits.reduce((acc, r) => {
    const corr = `${r.fromCurrency}-${r.toCurrency}`
    if (!acc[corr]) acc[corr] = { count: 0, volume: 0, fees: 0 }
    acc[corr].count += 1
    acc[corr].volume += r.sendAmount || 0
    acc[corr].fees += r.feeApplied || 0
    return acc
  }, {})

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.name}</h1>
          <p className="text-gray-500 text-sm">Treasury console — manage fee rules, FX margins, and rate lock policy</p>
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
          <Card title="Quick Actions">
            <div className="space-y-2">
              <Link to="/treasury/feerules" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center"><DollarSign size={16} className="text-primary-600" /></div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Manage Fee Rules</p>
                    <p className="text-xs text-gray-500">Add, edit, or remove corridor fees</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-gray-400 group-hover:text-primary-600 transition-colors" />
              </Link>
              <Link to="/treasury/fxquotes" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center"><TrendingUp size={16} className="text-green-600" /></div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">FX Quote Console</p>
                    <p className="text-xs text-gray-500">Preview live quotes & lookup history</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-gray-400 group-hover:text-primary-600 transition-colors" />
              </Link>
              <Link to="/treasury/ratelocks" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center"><Lock size={16} className="text-amber-600" /></div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Rate Lock Inspector</p>
                    <p className="text-xs text-gray-500">Look up customer rate locks by ID</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-gray-400 group-hover:text-primary-600 transition-colors" />
              </Link>
              <Link to="/treasury/settlement" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center"><Activity size={16} className="text-purple-600" /></div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Settlement Batches</p>
                    <p className="text-xs text-gray-500">Generate batches by corridor & period</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-gray-400 group-hover:text-primary-600 transition-colors" />
              </Link>
            </div>
          </Card>

          <Card title="Volume by Corridor"
            action={<Link to="/treasury/feerules" className="text-sm text-primary-600 hover:underline">Edit fees</Link>}>
            {Object.keys(corridorStats).length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">
                No remittance volume yet
              </div>
            ) : (
              <ul className="space-y-2">
                {Object.entries(corridorStats)
                  .sort((a, b) => b[1].volume - a[1].volume)
                  .slice(0, 8)
                  .map(([corr, data]) => (
                    <li key={corr} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div>
                        <p className="font-medium text-gray-900 text-sm font-mono">{corr}</p>
                        <p className="text-xs text-gray-500">{data.count} txns • Fees ${data.fees.toFixed(2)}</p>
                      </div>
                      <span className="font-semibold text-gray-900">${data.volume.toFixed(2)}</span>
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
