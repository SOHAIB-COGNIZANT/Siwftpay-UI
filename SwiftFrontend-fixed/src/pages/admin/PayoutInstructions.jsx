import React, { useEffect, useState } from 'react'
import { formatIST, formatISTDate } from '../../utils/date'
import { payoutInstructionsAPI } from '../../api/payoutinstructions'
import { remittancesAPI } from '../../api/remittances'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import Table from '../../components/common/Table'
import Modal from '../../components/common/Modal'
import StatusBadge from '../../components/common/StatusBadge'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import { Plus, Eye, Send, Trash2, Truck, CheckCircle, XCircle, ArrowRight } from 'lucide-react'

const STATUS_VALUES = ['Sent', 'Ack', 'Rejected', 'Settled']
const EMPTY = { remitId: '', partnerCode: '', payloadJson: '{}', partnerStatus: 'Sent' }

// Status progression: what button to show for each current status
const NEXT_STATUS = {
  Sent:     { next: 'Ack',      label: 'Mark Ack',      color: 'text-amber-600 hover:bg-amber-50' },
  Ack:      { next: 'Settled',  label: 'Mark Settled',  color: 'text-green-600 hover:bg-green-50' },
  Rejected: null,
  Settled:  null,
}

export default function PayoutInstructionsPage() {
  const [instructions, setInstructions] = useState([])
  const [remittances, setRemittances] = useState([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [viewItem, setViewItem] = useState(null)
  const [statusModal, setStatusModal] = useState(null)  // { item, nextStatus }
  const [ackRef, setAckRef] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [piRes, rRes] = await Promise.all([
        payoutInstructionsAPI.getAll(),
        remittancesAPI.getAll().catch(() => ({ data: [] })),
      ])
      const piPayload = piRes.data ?? piRes
      setInstructions(Array.isArray(piPayload) ? piPayload : [])
      const rPayload = rRes.data ?? rRes
      setRemittances(Array.isArray(rPayload) ? rPayload : [])
    } catch {
      toast.error('Failed to load payout instructions')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const openCreate = (remit) => {
    const receiverAmt = remit?.receiverAmount ?? null
    const template = {
      PayoutAmount: receiverAmt !== null && receiverAmt > 0 ? receiverAmt : 0,
      Currency: remit?.toCurrency ?? '',
      BeneficiaryName: '',
      PartnerTransactionId: '',
      TransactionTimestamp: new Date().toISOString(),
    }
    setForm({
      ...EMPTY,
      remitId: remit ? String(remit.remitId) : '',
      payloadJson: JSON.stringify(template, null, 2),
    })
    if (remit && (receiverAmt === null || receiverAmt === 0)) {
      toast('⚠️ ReceiverAmount is 0 for this remittance — update PayoutAmount manually before submitting.', { duration: 6000 })
    }
    setCreateModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      try { JSON.parse(form.payloadJson) }
      catch { toast.error('Payload must be valid JSON'); setSaving(false); return }
      await payoutInstructionsAPI.create(form)
      toast.success('Payout instruction created')
      setCreateModalOpen(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const openStatusModal = (item) => {
    const prog = NEXT_STATUS[item.partnerStatus]
    if (!prog) return
    setStatusModal({ item, nextStatus: prog.next })
    setAckRef(item.ackRef || '')
  }

  const handleStatusUpdate = async () => {
    if (!statusModal) return
    setSaving(true)
    try {
      await payoutInstructionsAPI.updateStatus(
        statusModal.item.instructionId,
        statusModal.nextStatus,
        ackRef || undefined
      )
      toast.success(`Status updated to ${statusModal.nextStatus}`)
      setStatusModal(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this payout instruction?')) return
    try {
      await payoutInstructionsAPI.delete(id)
      toast.success('Deleted')
      load()
    } catch { toast.error('Failed') }
  }

  const STATUS_COLORS = {
    Sent: 'bg-blue-50 text-blue-700',
    Ack: 'bg-amber-50 text-amber-700',
    Rejected: 'bg-red-50 text-red-700',
    Settled: 'bg-green-50 text-green-700',
  }

  const stats = STATUS_VALUES.map((s) => ({
    label: s,
    value: instructions.filter((i) => i.partnerStatus === s).length,
    color: STATUS_COLORS[s],
  }))

  const columns = [
    { key: 'instructionId', label: 'ID',       render: (v) => <span className="font-mono text-xs">{v?.toString().slice(0,8)}…</span> },
    { key: 'remitId',       label: 'Remit',    render: (v) => <span className="font-mono">#{v}</span> },
    { key: 'partnerCode',   label: 'Partner',  render: (v) => <span className="text-xs font-mono px-2 py-0.5 bg-gray-100 rounded">{v}</span> },
    { key: 'sentDate',      label: 'Sent',     render: (v) => v ? formatISTDate(v) : '—' },
    { key: 'ackRef',        label: 'Ack Ref',  render: (v) => v ? <span className="font-mono text-xs">{v}</span> : <span className="text-gray-300">—</span> },
    { key: 'partnerStatus', label: 'Status',   render: (v) => <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_COLORS[v] || 'bg-gray-50'}`}>{v}</span> },
    { key: 'instructionId', label: 'Actions',
      render: (_, row) => {
        const prog = NEXT_STATUS[row.partnerStatus]
        return (
          <div className="flex gap-1">
            <button onClick={() => setViewItem(row)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="View payload"><Eye size={13} /></button>
            {prog && (
              <button onClick={() => openStatusModal(row)}
                className={`p-1.5 rounded text-xs font-medium flex items-center gap-1 px-2 ${prog.color}`}
                title={prog.label}>
                <ArrowRight size={12} /> {prog.label}
              </button>
            )}
            <button onClick={() => handleDelete(row.instructionId)} className="p-1.5 hover:bg-red-50 rounded text-red-500" title="Delete"><Trash2 size={13} /></button>
          </div>
        )
      }
    },
  ]

  if (loading) return <Layout><Loader center /></Layout>

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payout Instructions</h1>
            <p className="text-gray-500 text-sm">Outbound payout payloads and partner acknowledgements</p>
          </div>
          <button onClick={() => openCreate(null)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Instruction
          </button>
        </div>

        {/* Status pipeline hint */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800 flex items-center gap-3">
          <div className="flex items-center gap-2 font-medium">
            <span className="px-2 py-0.5 bg-blue-100 rounded">Sent</span>
            <ArrowRight size={14} />
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded">Ack</span>
            <ArrowRight size={14} />
            <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded">Settled</span>
          </div>
          <span className="text-blue-700">Only <strong>Settled</strong> instructions are included in batch reconciliation.</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="stat-card">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                <Truck size={18} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        <Card title="All Payout Instructions">
          <Table columns={columns} data={instructions} loading={false} emptyMessage="No payout instructions yet" />
        </Card>
      </div>

      {/* Create Modal */}
      <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)} title="New Payout Instruction" size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Remittance *</label>
              <select required value={form.remitId}
                onChange={(e) => {
                  const remit = remittances.find((r) => String(r.remitId) === e.target.value)
                  const receiverAmt = remit?.receiverAmount ?? null
                  const template = {
                    PayoutAmount: receiverAmt !== null && receiverAmt > 0 ? receiverAmt : 0,
                    Currency: remit?.toCurrency ?? '',
                    BeneficiaryName: '',
                    PartnerTransactionId: '',
                    TransactionTimestamp: new Date().toISOString(),
                  }
                  if (remit && (receiverAmt === null || receiverAmt === 0)) {
                    toast('⚠️ ReceiverAmount is 0 — update PayoutAmount manually.', { duration: 5000 })
                  }
                  setForm((f) => ({ ...f, remitId: e.target.value, payloadJson: JSON.stringify(template, null, 2) }))
                }}
                className="form-select">
                <option value="">Select remittance...</option>
                {remittances.map((r) => (
                  <option key={r.remitId} value={r.remitId}>
                    #{r.remitId} — {r.fromCurrency} {r.sendAmount} → {r.toCurrency}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Partner Code *</label>
              <input required value={form.partnerCode}
                onChange={(e) => setForm((f) => ({ ...f, partnerCode: e.target.value }))}
                className="form-input" placeholder="WISE / WU / RIA" />
            </div>
            <div>
              <label className="form-label">Initial Status</label>
              <select value={form.partnerStatus}
                onChange={(e) => setForm((f) => ({ ...f, partnerStatus: e.target.value }))}
                className="form-select">
                {STATUS_VALUES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Payload (JSON) *</label>
            <p className="text-xs text-gray-400 mb-1">
              <strong>PayoutAmount</strong> is what the partner actually pays the beneficiary — used by reconciliation to compare against the expected ReceiverAmount.
            </p>
            <textarea required rows={9} value={form.payloadJson}
              onChange={(e) => setForm((f) => ({ ...f, payloadJson: e.target.value }))}
              className="form-input font-mono text-xs" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setCreateModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Send size={14} /> {saving ? 'Sending...' : 'Send Instruction'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Status Update Modal */}
      <Modal open={!!statusModal} onClose={() => setStatusModal(null)}
        title={`Mark as ${statusModal?.nextStatus}`} size="sm">
        {statusModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Instruction <span className="font-mono font-medium">#{statusModal.item.instructionId?.slice(0, 8)}</span> for Remit <span className="font-mono font-medium">#{statusModal.item.remitId}</span>
            </p>
            <div>
              <label className="form-label">
                Ack Ref {statusModal.nextStatus === 'Settled' ? '*' : '(optional)'}
              </label>
              <input value={ackRef}
                onChange={(e) => setAckRef(e.target.value)}
                className="form-input font-mono text-sm"
                placeholder="Partner transaction reference e.g. WU-2024-998877"
                required={statusModal.nextStatus === 'Settled'} />
              <p className="text-xs text-gray-400 mt-1">
                {statusModal.nextStatus === 'Settled'
                  ? 'Required — this is the partner\'s confirmation reference. The PayoutAmount in the payload will be compared against the expected receiver amount during reconciliation.'
                  : 'Partner\'s acknowledgement reference number.'}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStatusModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleStatusUpdate} disabled={saving}
                className="btn-primary flex-1 flex items-center justify-center gap-2">
                {statusModal.nextStatus === 'Settled'
                  ? <><CheckCircle size={14} /> {saving ? 'Updating...' : 'Confirm Settled'}</>
                  : <><ArrowRight size={14} /> {saving ? 'Updating...' : `Mark ${statusModal.nextStatus}`}</>}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* View Payload Modal */}
      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title={`Instruction ${viewItem?.instructionId?.slice(0,8) ?? ''}`} size="lg">
        {viewItem && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-gray-500">Remit ID</p><p className="font-semibold font-mono">#{viewItem.remitId}</p></div>
              <div><p className="text-gray-500">Partner</p><p className="font-semibold">{viewItem.partnerCode}</p></div>
              <div><p className="text-gray-500">Status</p><StatusBadge status={viewItem.partnerStatus} /></div>
              <div><p className="text-gray-500">Sent</p><p>{viewItem.sentDate ? formatIST(viewItem.sentDate) : '—'}</p></div>
              <div className="col-span-2"><p className="text-gray-500">Ack Ref</p><p className="font-mono">{viewItem.ackRef || '—'}</p></div>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Payload</p>
              <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-x-auto font-mono">
                {(() => {
                  try { return JSON.stringify(JSON.parse(viewItem.payloadJson || '{}'), null, 2) }
                  catch { return viewItem.payloadJson || '—' }
                })()}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  )
}
