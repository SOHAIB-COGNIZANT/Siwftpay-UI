import React, { useState } from 'react'
import { settlementAPI } from '../../api/settlement'
import { reconciliationAPI } from '../../api/reconciliation'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import StatusBadge from '../../components/common/StatusBadge'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import { Landmark, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'INR', 'SGD']

export default function Settlement() {
  const [batchForm, setBatchForm] = useState({ corridor: '', periodStart: '', periodEnd: '' })
  const [batch, setBatch] = useState(null)
  const [recon, setRecon] = useState([])
  const [mismatches, setMismatches] = useState([])
  const [generating, setGenerating] = useState(false)
  const [reconciling, setReconciling] = useState(false)
  const [loadingRecon, setLoadingRecon] = useState(false)

  const handleGenerateBatch = async (e) => {
    e.preventDefault()
    setGenerating(true)
    try {
      // datetime-local gives "2025-01-15T10:00" with no timezone — append Z to treat as UTC,
      // matching how payout instruction SentDate is stored (DateTimeOffset.UtcNow).
      const payload = {
        ...batchForm,
        periodStart: batchForm.periodStart ? new Date(batchForm.periodStart).toISOString() : batchForm.periodStart,
        periodEnd:   batchForm.periodEnd   ? new Date(batchForm.periodEnd).toISOString()   : batchForm.periodEnd,
      }
      const res = await settlementAPI.generate(payload)
      const rawBatch = res.data
      // .NET camelCase: BatchID -> batchID; normalize to batchId for frontend
      setBatch(rawBatch ? { ...rawBatch, batchId: rawBatch.batchId ?? rawBatch.batchID } : null)
      toast.success('Settlement batch generated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate batch')
    } finally {
      setGenerating(false)
    }
  }

  const handleReconcile = async () => {
    if (!batch) return
    setReconciling(true)
    try {
      await reconciliationAPI.reconcileBatch(batch.batchId)
      toast.success('Batch reconciled')
      setLoadingRecon(true)
      const [r, m] = await Promise.all([
        reconciliationAPI.getAll(),
        reconciliationAPI.getMismatches(),
      ])
      setRecon(Array.isArray(r.data) ? r.data : [])
      setMismatches(Array.isArray(m.data) ? m.data : [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reconciliation failed')
    } finally {
      setReconciling(false)
      setLoadingRecon(false)
    }
  }

  const handleLoadRecon = async () => {
    setLoadingRecon(true)
    try {
      const [r, m] = await Promise.all([
        reconciliationAPI.getAll(),
        reconciliationAPI.getMismatches(),
      ])
      setRecon(Array.isArray(r.data) ? r.data : [])
      setMismatches(Array.isArray(m.data) ? m.data : [])
    } catch {
      toast.error('Failed to load reconciliation data')
    } finally {
      setLoadingRecon(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settlement & Reconciliation</h1>
          <p className="text-gray-500 text-sm">Generate settlement batches and reconcile payout acks</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Generate batch */}
          <Card title="Generate Settlement Batch">
            <form onSubmit={handleGenerateBatch} className="space-y-4">
              <div>
                <label className="form-label">Corridor (e.g. USD-INR)</label>
                <input required value={batchForm.corridor}
                  onChange={(e) => setBatchForm((f) => ({ ...f, corridor: e.target.value }))}
                  className="form-input" placeholder="USD-INR" />
              </div>
              <div>
                <label className="form-label">Period Start</label>
                <input type="datetime-local" required value={batchForm.periodStart}
                  onChange={(e) => setBatchForm((f) => ({ ...f, periodStart: e.target.value }))}
                  className="form-input" />
              </div>
              <div>
                <label className="form-label">Period End</label>
                <input type="datetime-local" required value={batchForm.periodEnd}
                  onChange={(e) => setBatchForm((f) => ({ ...f, periodEnd: e.target.value }))}
                  className="form-input" />
              </div>
              <button type="submit" disabled={generating} className="btn-primary w-full flex items-center justify-center gap-2">
                <Landmark size={15} /> {generating ? 'Generating...' : 'Generate Batch'}
              </button>
            </form>

            {batch && (
              <div className="mt-4 bg-primary-50 rounded-xl p-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Batch ID</span>
                  <span className="font-mono font-semibold">#{batch.batchId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Corridor</span>
                  <span className="font-semibold">{batch.corridor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Items</span>
                  <span className="font-semibold">{batch.itemCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total</span>
                  <span className="font-semibold">{batch.totalSendAmount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <StatusBadge status={batch.status} />
                </div>
                <button onClick={handleReconcile} disabled={reconciling} className="btn-primary w-full mt-2 flex items-center justify-center gap-2">
                  <RefreshCw size={14} /> {reconciling ? 'Reconciling...' : 'Reconcile Batch'}
                </button>
              </div>
            )}
          </Card>

          {/* Reconciliation summary */}
          <Card title="Reconciliation Summary"
            action={
              <button onClick={handleLoadRecon} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1">
                <RefreshCw size={13} /> {loadingRecon ? 'Loading...' : 'Refresh'}
              </button>
            }>
            {recon.length === 0 ? (
              <div className="text-center py-10">
                <RefreshCw size={32} className="text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No reconciliation data. Generate and reconcile a batch first.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{recon.filter((r) => r.result === 'Matched').length}</p>
                    <p className="text-xs text-green-700">Matched</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{mismatches.length}</p>
                    <p className="text-xs text-red-700">Mismatches</p>
                  </div>
                </div>
                <ul className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                  {recon.slice(0, 8).map((r) => (
                    <li key={r.reconId} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-gray-50">
                      {r.result === 'Matched'
                        ? <CheckCircle size={12} className="text-green-500 flex-shrink-0" />
                        : <AlertCircle size={12} className="text-red-500 flex-shrink-0" />}
                      <span className="text-gray-400 w-16 flex-shrink-0">{r.referenceType}</span>
                      <span className="font-mono font-medium text-gray-700 flex-1">#{r.referenceId ?? r.referenceID ?? '—'}</span>
                      <span className="text-gray-500">{r.expectedAmount?.toFixed(2)} → {r.actualAmount?.toFixed(2)}</span>
                      <StatusBadge status={r.result} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  )
}
