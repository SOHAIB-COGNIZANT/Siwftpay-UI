import React, { useEffect, useState } from 'react'
import { formatIST, formatISTDate, formatISTTime } from '../../utils/date'
import { fxQuotesAPI } from '../../api/fxquotes'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import Table from '../../components/common/Table'
import StatusBadge from '../../components/common/StatusBadge'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import { TrendingUp, Search, RefreshCw } from 'lucide-react'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'JPY', 'INR', 'MYR', 'HKD', 'CHF']

export default function FXQuotesPage() {
  const [form, setForm] = useState({ fromCurrency: 'USD', toCurrency: 'INR', sendAmount: 1000 })
  const [quote, setQuote] = useState(null)
  const [previewing, setPreviewing] = useState(false)

  const [lookupId, setLookupId] = useState('')
  const [lookupResult, setLookupResult] = useState(null)
  const [looking, setLooking] = useState(false)

  // Full quote history list
  const [allQuotes, setAllQuotes] = useState([])
  const [listLoading, setListLoading] = useState(true)

  const loadAll = () => {
    setListLoading(true)
    fxQuotesAPI.getAll()
      .then((r) => setAllQuotes(Array.isArray(r.data) ? r.data : []))
      .catch(() => setAllQuotes([]))
      .finally(() => setListLoading(false))
  }
  useEffect(loadAll, [])

  const listColumns = [
    { key: 'quoteId',      label: 'Quote ID',    render: (v) => <span className="font-mono text-xs">{v?.slice(0,8)}…</span> },
    { key: 'fromCurrency', label: 'From' },
    { key: 'toCurrency',   label: 'To' },
    { key: 'sendAmount',   label: 'Amount',      render: (v, r) => v ? `${r.fromCurrency} ${parseFloat(v).toFixed(2)}` : '—' },
    { key: 'offeredRate',  label: 'Rate',        render: (v) => v != null ? parseFloat(v).toFixed(4) : '—' },
    { key: 'marginBps',    label: 'Margin (bps)',render: (v) => v ?? '—' },
    { key: 'fee',          label: 'Fee',         render: (v) => v != null ? `$${parseFloat(v).toFixed(2)}` : '—' },
    { key: 'status',       label: 'Status',      render: (v) => <StatusBadge status={v || 'Active'} /> },
    { key: 'validUntil',   label: 'Valid Until (IST)', render: (v) => formatIST(v) },
  ]

  const handlePreview = async (e) => {
    e.preventDefault()
    setPreviewing(true)
    try {
      const res = await fxQuotesAPI.create({
        fromCurrency: form.fromCurrency,
        toCurrency: form.toCurrency,
        sendAmount: parseFloat(form.sendAmount),
      })
      setQuote(res.data ?? res)
      toast.success('Quote generated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate quote')
    } finally {
      setPreviewing(false)
    }
  }

  const handleLookup = async (e) => {
    e.preventDefault()
    if (!lookupId.trim()) return
    setLooking(true)
    try {
      const res = await fxQuotesAPI.getById(lookupId.trim())
      setLookupResult(res.data ?? res)
    } catch (err) {
      setLookupResult(null)
      toast.error(err.response?.data?.message || 'Quote not found')
    } finally {
      setLooking(false)
    }
  }

  const QuoteDetail = ({ q }) => (
    <div className="bg-primary-50 rounded-xl p-5 space-y-3 mt-4">
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Quote ID</span>
        <span className="font-mono text-xs">{q.quoteId}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Mid Rate</span>
        <span className="font-medium">{q.midRate?.toFixed(4)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Margin (bps)</span>
        <span className="font-medium">{q.marginBps ?? '—'}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Offered Rate</span>
        <span className="font-bold text-primary-700">{q.offeredRate?.toFixed(4)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Send</span>
        <span className="font-medium">{q.fromCurrency} {q.sendAmount?.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Fee</span>
        <span className="font-medium">{q.fromCurrency} {q.fee?.toFixed(2) ?? '—'}</span>
      </div>
      <div className="border-t border-primary-200 pt-3 flex justify-between">
        <span className="font-semibold">Recipient Gets</span>
        <span className="text-xl font-bold text-green-600">{q.toCurrency} {q.receiverAmount?.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>Quoted: {formatIST(q.quoteTime)}</span>
        <span>Valid until: {formatIST(q.validUntil)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Status</span>
        <span className="px-2 py-0.5 bg-white rounded-full text-xs font-semibold">{q.status}</span>
      </div>
    </div>
  )

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">FX Quotes Console</h1>
          <p className="text-gray-500 text-sm">Preview live quotes and look up historical quotes by ID</p>
        </div>

        {/* All quotes history */}
        <Card title={`Quote History (${allQuotes.length})`}
          action={<button onClick={loadAll} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"><RefreshCw size={12} /> Refresh</button>}>
          <Table columns={listColumns} data={allQuotes} loading={listLoading} emptyMessage="No quotes generated yet" />
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card title="Quote Preview">
            <form onSubmit={handlePreview} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">From</label>
                  <select value={form.fromCurrency}
                    onChange={(e) => setForm((f) => ({ ...f, fromCurrency: e.target.value }))}
                    className="form-select">
                    {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">To</label>
                  <select value={form.toCurrency}
                    onChange={(e) => setForm((f) => ({ ...f, toCurrency: e.target.value }))}
                    className="form-select">
                    {CURRENCIES.filter((c) => c !== form.fromCurrency).map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Send Amount</label>
                <input type="number" min="1" required value={form.sendAmount}
                  onChange={(e) => setForm((f) => ({ ...f, sendAmount: e.target.value }))}
                  className="form-input" />
              </div>
              <button type="submit" disabled={previewing}
                className="btn-primary w-full flex items-center justify-center gap-2">
                {previewing ? <><Loader size="sm" /> Generating...</> : <><RefreshCw size={14} /> Preview Quote</>}
              </button>
            </form>
            {quote && <QuoteDetail q={quote} />}
          </Card>

          <Card title="Lookup by Quote ID">
            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <label className="form-label">Quote ID</label>
                <input value={lookupId} onChange={(e) => setLookupId(e.target.value)}
                  className="form-input font-mono text-xs"
                  placeholder="00000000-0000-0000-0000-000000000000" />
              </div>
              <button type="submit" disabled={looking}
                className="btn-primary w-full flex items-center justify-center gap-2">
                <Search size={14} /> {looking ? 'Looking up...' : 'Look Up'}
              </button>
            </form>
            {lookupResult && <QuoteDetail q={lookupResult} />}
            {!lookupResult && !looking && (
              <div className="mt-6 text-center py-8 border-t border-gray-100">
                <TrendingUp size={32} className="text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Enter a quote ID to look up its details</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  )
}
