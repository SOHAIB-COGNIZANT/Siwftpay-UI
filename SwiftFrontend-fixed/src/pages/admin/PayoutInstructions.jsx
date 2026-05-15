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
import { Plus, Eye, Send, Trash2, Truck, CheckCircle, ArrowRight } from 'lucide-react'

const STATUS_VALUES = ['Sent', 'Ack', 'Rejected', 'Settled']

const NEXT_STATUS = {
  Sent:     { next: 'Ack',     label: 'Mark Ack',     color: 'text-amber-600 hover:bg-amber-50' },
  Ack:      { next: 'Settled', label: 'Mark Settled', color: 'text-green-600 hover:bg-green-50' },
  Rejected: null,
  Settled:  null,
}

const STATUS_COLORS = {
  Sent:     'bg-blue-50 text-blue-700',
  Ack:      'bg-amber-50 text-amber-700',
  Rejected: 'bg-red-50 text-red-700',
  Settled:  'bg-green-50 text-green-700',
}

const EMPTY_FORM = {
  remitId:              '',
  partnerCode:          '',
  partnerStatus:        'Sent',
  payoutAmount:         '',
  currency:             '',
  beneficiaryName:      '',
  partnerTransactionId: '',
}

export default function PayoutInstructionsPage() {
  const [instructions, setInstructions]       = useState([])
  const [remittances, setRemittances]         = useState([])
  const [loading, setLoading]                 = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [viewItem, setViewItem]               = useState(null)
  const [statusModal, setStatusModal]         = useState(null)
  const [ackRef, setAckRef]                   = useState('')
  const [form, setForm]                       = useState(EMPTY_FORM)
  const [selectedRemit, setSelectedRemit]     = useState(null)
  const [saving, setSaving]                   = useState(false)

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

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setSelectedRemit(null)
    setCreateModalOpen(true)
  }

  // When a remittance is selected, auto-fill fields — all still editable
  const handleRemitChange = (remitId) => {
    const remit = remittances.find((r) => String(r.remitId) === remitId)
    setSelectedRemit(remit || null)
    if (!remit) {
      setForm((f) => ({ ...f, remitId: '' }))
      return
    }
    const receiverAmt = remit.receiverAmount ?? 0
    if (!receiverAmt) {
      toast('⚠️ ReceiverAmount is 0 for this remittance — verify Payout Amount before submitting.', { duration: 5000 })
    }
    setForm((f) => ({
      ...f,
      remitId:              String(remit.remitId),
      payoutAmount:         receiverAmt > 0 ? String(receiverAmt) : '',
      currency:             remit.toCurrency ?? '',
      beneficiaryName:      remit.beneficiaryName ?? '',   // auto-filled from backend
      partnerTransactionId: '',
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.payoutAmount || isNaN(parseFloat(form.payoutAmount))) {
      toast.error('Enter a valid Payout Amount')
      return
    }
    setSaving(true)
    try {
      const payloadJson = JSON.stringify({
        PayoutAmount:         parseFloat(form.payoutAmount),
        Currency:             form.currency.trim(),
        BeneficiaryName:      form.beneficiaryName.trim(),
        PartnerTransactionId: form.partnerTransactionId.trim(),
        TransactionTimestamp: new Date().toISOString(),
      })
      await payoutInstructionsAPI.create({
        remitId:       form.remitId,
        partnerCode:   form.partnerCode,
        partnerStatus: form.partnerStatus,
        payloadJson,
      })
      toast.success('Payout instruction created')
      setCreateModalOpen(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create instruction')
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
    if (statusModal.nextStatus === 'Settled' && !ackRef.trim()) {
      toast.error('Ack Ref is required to mark as Settled')
      return
    }
    setSaving(true)
    try {
      await payoutInstructionsAPI.updateStatus(
        statusModal.item.instructionId,
        statusModal.nextStatus,
        ackRef.trim() || undefined
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
    } catch { toast.error('Failed to delete') }
  }

  const stats = STATUS_VALUES.map((s) => ({
    label: s,
    value: instructions.filter((i) => i.partnerStatus === s).length,
    color: STATUS_COLORS[s],
  }))

  const columns = [
    { key: 'instructionId', label: 'ID',      render: (v) => <span className="font-mono text-xs">{v?.toString().slice(0, 8)}…</span> },
    { key: 'remitId',       label: 'Remit',   render: (v) => <span className="font-mono">#{v}</span> },
    { key: 'partnerCode',   label: 'Partner', render: (v) => <span className="text-xs font-mono px-2 py-0.5 bg-gray-100 rounded">{v}</span> },
    { key: 'sentDate',      label: 'Sent',    render: (v) => v ? formatISTDate(v) : '—' },
    { key: 'ackRef',        label: 'Ack Ref', render: (v) => v ? <span className="font-mono text-xs">{v}</span> : <span className="text-gray-300">—</span> },
    { key: 'partnerStatus', label: 'Status',  render: (v) => <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_COLORS[v] || 'bg-gray-50'}`}>{v}</span> },
    {
      key: 'instructionId', label: 'Actions',
      render: (_, row) => {
        const prog = NEXT_STATUS[row.partnerStatus]
        return (
          <div className="flex gap-1">
            <button onClick={() => setViewItem(row)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="View details">
              <Eye size={13} />
            </button>
            {prog && (
              <button onClick={() => openStatusModal(row)}
                className={`p-1.5 rounded text-xs font-medium flex items-center gap-1 px-2 ${prog.color}`}
                title={prog.label}>
                <ArrowRight size={12} /> {prog.label}
              </button>
            )}
            <button onClick={() => handleDelete(row.instructionId)} className="p-1.5 hover:bg-red-50 rounded text-red-500" title="Delete">
              <Trash2 size={13} />
            </button>
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
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Instruction
          </button>
        </div>

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

      {/* ── Create Modal ── */}
      <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)} title="New Payout Instruction" size="lg">
        <form onSubmit={handleSave} className="space-y-5">

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Remittance *</label>
              <select required value={form.remitId} onChange={(e) => handleRemitChange(e.target.value)} className="form-select">
                <option value="">Select remittance…</option>
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
                className="form-input" placeholder="e.g. WISE / WU / RIA" />
            </div>
          </div>

          {/* Remittance summary — visible once a remittance is selected */}
          {selectedRemit && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Remittance Details</p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Send Amount</p>
                  <p className="font-semibold">{selectedRemit.fromCurrency} {selectedRemit.sendAmount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Receiver Amount</p>
                  <p className="font-semibold">{selectedRemit.toCurrency} {selectedRemit.receiverAmount ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Rate Applied</p>
                  <p className="font-semibold">{selectedRemit.rateApplied ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Fee Applied</p>
                  <p className="font-semibold">{selectedRemit.feeApplied ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Purpose Code</p>
                  <p className="font-semibold">{selectedRemit.purposeCode || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Remittance Status</p>
                  <p className="font-semibold">{selectedRemit.status || '—'}</p>
                </div>
                {selectedRemit.beneficiaryName && (<>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Beneficiary</p>
                    <p className="font-semibold">{selectedRemit.beneficiaryName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Bank</p>
                    <p className="font-semibold">{selectedRemit.beneficiaryBank || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Account / Wallet</p>
                    <p className="font-semibold font-mono text-xs">{selectedRemit.beneficiaryAccount || '—'}</p>
                  </div>
                </>)}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Payout Amount *</label>
              <input required type="number" min="0" step="0.01"
                value={form.payoutAmount}
                onChange={(e) => setForm((f) => ({ ...f, payoutAmount: e.target.value }))}
                className="form-input" placeholder="Amount partner pays to beneficiary" />
              <p className="text-xs text-gray-400 mt-1">Pre-filled from receiver amount. Edit if different.</p>
            </div>
            <div>
              <label className="form-label">Currency *</label>
              <input required value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="form-input" placeholder="e.g. USD, AED, INR" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Beneficiary Name *</label>
              <input required value={form.beneficiaryName}
                onChange={(e) => setForm((f) => ({ ...f, beneficiaryName: e.target.value }))}
                className="form-input" placeholder="Full name of the beneficiary" />
            </div>
            <div>
              <label className="form-label">Partner Transaction ID</label>
              <input value={form.partnerTransactionId}
                onChange={(e) => setForm((f) => ({ ...f, partnerTransactionId: e.target.value }))}
                className="form-input" placeholder="Optional partner reference" />
            </div>
          </div>

          <div className="w-1/2">
            <label className="form-label">Initial Status</label>
            <select value={form.partnerStatus}
              onChange={(e) => setForm((f) => ({ ...f, partnerStatus: e.target.value }))}
              className="form-select">
              {STATUS_VALUES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setCreateModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Send size={14} /> {saving ? 'Sending…' : 'Send Instruction'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Status Update Modal ── */}
      <Modal open={!!statusModal} onClose={() => setStatusModal(null)}
        title={`Mark as ${statusModal?.nextStatus}`} size="sm">
        {statusModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Instruction{' '}
              <span className="font-mono font-medium">#{statusModal.item.instructionId?.slice(0, 8)}</span>
              {' · '}Remit{' '}
              <span className="font-mono font-medium">#{statusModal.item.remitId}</span>
            </p>
            <div>
              <label className="form-label">
                Ack Ref {statusModal.nextStatus === 'Settled' ? '*' : '(optional)'}
              </label>
              <input value={ackRef} onChange={(e) => setAckRef(e.target.value)}
                className="form-input font-mono text-sm"
                placeholder="e.g. WU-2024-998877"
                required={statusModal.nextStatus === 'Settled'} />
              <p className="text-xs text-gray-400 mt-1">
                {statusModal.nextStatus === 'Settled'
                  ? "Required — the partner's settlement confirmation reference."
                  : "Partner's acknowledgement reference (optional)."}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStatusModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleStatusUpdate} disabled={saving}
                className="btn-primary flex-1 flex items-center justify-center gap-2">
                {statusModal.nextStatus === 'Settled'
                  ? <><CheckCircle size={14} /> {saving ? 'Updating…' : 'Confirm Settled'}</>
                  : <><ArrowRight size={14} /> {saving ? 'Updating…' : `Mark ${statusModal.nextStatus}`}</>}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── View Details Modal ── */}
      <Modal open={!!viewItem} onClose={() => setViewItem(null)}
        title={`Instruction ${viewItem?.instructionId?.slice(0, 8) ?? ''}`} size="lg">
        {viewItem && (() => {
          let payload = {}
          try { payload = JSON.parse(viewItem.payloadJson || '{}') } catch {}
          return (
            <div className="space-y-5 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-gray-400 text-xs mb-0.5">Remit ID</p><p className="font-semibold font-mono">#{viewItem.remitId}</p></div>
                <div><p className="text-gray-400 text-xs mb-0.5">Partner</p><p className="font-semibold">{viewItem.partnerCode}</p></div>
                <div><p className="text-gray-400 text-xs mb-0.5">Status</p><StatusBadge status={viewItem.partnerStatus} /></div>
                <div><p className="text-gray-400 text-xs mb-0.5">Sent</p><p>{viewItem.sentDate ? formatIST(viewItem.sentDate) : '—'}</p></div>
                <div className="col-span-2"><p className="text-gray-400 text-xs mb-0.5">Ack Ref</p><p className="font-mono">{viewItem.ackRef || '—'}</p></div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 grid grid-cols-2 gap-3">
                <div><p className="text-xs text-gray-400 mb-0.5">Payout Amount</p><p className="font-semibold">{payload.Currency} {payload.PayoutAmount ?? '—'}</p></div>
                <div><p className="text-xs text-gray-400 mb-0.5">Beneficiary</p><p className="font-semibold">{payload.BeneficiaryName || '—'}</p></div>
                <div><p className="text-xs text-gray-400 mb-0.5">Partner Txn ID</p><p className="font-mono text-xs">{payload.PartnerTransactionId || '—'}</p></div>
                <div><p className="text-xs text-gray-400 mb-0.5">Timestamp</p><p className="text-xs">{payload.TransactionTimestamp ? formatIST(payload.TransactionTimestamp) : '—'}</p></div>
              </div>
            </div>
          )
        })()}
      </Modal>
    </Layout>
  )
}
