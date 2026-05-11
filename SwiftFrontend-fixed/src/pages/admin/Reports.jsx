import React, { useEffect, useState } from 'react'
import { formatIST, formatISTDate, formatISTTime } from '../../utils/date'
import { reportsAPI } from '../../api/reports'
import { remittancesAPI } from '../../api/remittances'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import Table from '../../components/common/Table'
import Modal from '../../components/common/Modal'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import { Plus, PieChart, BarChart2, Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function Reports() {
  const [reports, setReports] = useState([])
  const [remittances, setRemittances] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ scope: 'Corridor', metrics: '' })
  const [saving, setSaving] = useState(false)

  const load = () => {
    Promise.all([
      reportsAPI.getAll(),
      remittancesAPI.getAll(),
    ]).then(([r, rem]) => {
      // .NET camelCase: ReportID -> reportID; normalize to reportId
      setReports(Array.isArray(r.data) ? r.data.map((x) => ({ ...x, reportId: x.reportId ?? x.reportID })) : [])
      setRemittances(Array.isArray(rem.data) ? rem.data : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    // Auto-compute metrics
    const txnCount = remittances.length
    const volume = remittances.reduce((s, r) => s + (r.sendAmount || 0), 0)
    const avgTicket = txnCount > 0 ? volume / txnCount : 0
    const fees = remittances.reduce((s, r) => s + (r.feeApplied || 0), 0)
    const rejectRate = txnCount > 0 ? (remittances.filter((r) => r.status === 'Cancelled').length / txnCount * 100).toFixed(1) : 0
    const metricsJSON = JSON.stringify({ txnCount, volume: volume.toFixed(2), avgTicket: avgTicket.toFixed(2), fees: fees.toFixed(2), rejectRate: `${rejectRate}%` })
    try {
      await reportsAPI.create({ scope: form.scope, metrics: form.metrics || metricsJSON })
      toast.success('Report generated')
      setModalOpen(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  // Volume chart
  const volumeByStatus = ['Paid','Validated','ComplianceHold','Cancelled'].map((s) => ({
    status: s,
    count: remittances.filter((r) => r.status === s).length,
    volume: remittances.filter((r) => r.status === s).reduce((a, r) => a + (r.sendAmount || 0), 0),
  }))

  const columns = [
    { key: 'reportId',     label: 'ID',    render: (v) => `#${v}` },
    { key: 'scope',        label: 'Scope' },
    { key: 'generatedDate',label: 'Date',  render: (v) => formatISTDate(v) },
    { key: 'metrics',      label: 'Metrics',render: (v) => <span className="text-xs font-mono truncate max-w-xs block">{v}</span> },
  ]

  if (loading) return <Layout><Loader center /></Layout>

  const totalVolume = remittances.reduce((s, r) => s + (r.sendAmount || 0), 0)
  const totalFees = remittances.reduce((s, r) => s + (r.feeApplied || 0), 0)
  const paidCount = remittances.filter((r) => r.status === 'Paid').length

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-500 text-sm">Operational MIS and regulatory reference packs</p>
          </div>
          <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Generate Report
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Volume', value: `$${totalVolume.toFixed(0)}`, sub: 'All corridors' },
            { label: 'Total Transactions', value: remittances.length, sub: 'All time' },
            { label: 'Completed Transfers', value: paidCount, sub: 'Paid status' },
            { label: 'Total Fees Collected', value: `$${totalFees.toFixed(2)}`, sub: 'Revenue' },
          ].map((k) => (
            <div key={k.label} className="stat-card">
              <p className="text-2xl font-bold text-primary-700">{k.value}</p>
              <p className="text-sm font-medium text-gray-700">{k.label}</p>
              <p className="text-xs text-gray-400">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <Card title="Transaction Volume by Status">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={volumeByStatus}>
              <XAxis dataKey="status" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="count" name="Count" fill="#0B4FCC" radius={[4,4,0,0]} />
              <Bar dataKey="volume" name="Volume" fill="#F97316" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Stored Reports */}
        <Card title="Stored Reports">
          <Table columns={columns} data={reports} loading={false} emptyMessage="No reports generated yet" />
        </Card>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Generate Report">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="form-label">Report Scope</label>
            <select value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))} className="form-select">
              {['Corridor', 'Period', 'Customer'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Custom Metrics JSON (optional – auto-computed if empty)</label>
            <textarea value={form.metrics}
              onChange={(e) => setForm((f) => ({ ...f, metrics: e.target.value }))}
              className="form-input" rows={3} placeholder='{"txnCount":100,"volume":"50000.00"}' />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}
