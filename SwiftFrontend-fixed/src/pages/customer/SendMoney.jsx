import React, { useState, useEffect } from 'react'
import { formatIST, formatISTDate, formatISTTime } from '../../utils/date'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fxQuotesAPI } from '../../api/fxquotes'
import { rateLocksAPI } from '../../api/ratelocks'
import { beneficiariesAPI } from '../../api/beneficiaries'
import { remittancesAPI } from '../../api/remittances'
import { customersAPI } from '../../api/customers'
import { kycAPI } from '../../api/kyc'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import { ArrowRight, Lock, RefreshCw, CheckCircle, AlertCircle, ShieldOff, User as UserIcon, Search } from 'lucide-react'
import { isKycVerified } from '../../utils/kyc'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'JPY', 'INR', 'MYR', 'HKD', 'CHF']
const PURPOSE_CODES = ['Family Remittance', 'Education', 'Medical', 'Business Payment', 'Gift', 'Investment', 'Travel', 'Other']
const SOURCE_OF_FUNDS = ['Salary', 'Business Income', 'Savings', 'Investment Returns', 'Gift', 'Loan', 'Other']

const STEPS = ['Get Quote', 'Select Recipient', 'Review & Send']

export default function SendMoney() {
  const { user, role, customerProfile, kyc } = useAuth()
  const navigate = useNavigate()

  const isAgent = role === 'Agent'

  // For Agent: which customer they're sending on behalf of
  const [actingFor, setActingFor] = useState(null)        // customer object (normalized)
  const [actingForKyc, setActingForKyc] = useState(null)  // their KYC record
  const [customerOptions, setCustomerOptions] = useState([])
  const [customerLoading, setCustomerLoading] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')

  // Effective customer for the rest of the flow
  const effectiveCustomer = isAgent ? actingFor : customerProfile
  const effectiveKyc      = isAgent ? actingForKyc : kyc
  const effectiveKycOk    = isKycVerified(effectiveKyc)

  const [step, setStep] = useState(0)
  const [fromCurrency, setFromCurrency] = useState('USD')
  const [toCurrency, setToCurrency] = useState('INR')
  const [sendAmount, setSendAmount] = useState('')
  const [quote, setQuote] = useState(null)
  const [rateLock, setRateLock] = useState(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [lockLoading, setLockLoading] = useState(false)
  const [beneficiaries, setBeneficiaries] = useState([])
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null)
  const [purposeCode, setPurposeCode] = useState('')
  const [sourceOfFunds, setSourceOfFunds] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Backend serializes BeneficiaryID -> beneficiaryID, CustomerID -> customerID.
  // Normalize so .beneficiaryId / .customerId work in lookups and downstream payloads.
  const normalizeBen = (b) => ({
    ...b,
    beneficiaryId: b.beneficiaryId ?? b.beneficiaryID,
    customerId:    b.customerId    ?? b.customerID,
    IFSC_IBAN_SWIFT: b.IFSC_IBAN_SWIFT ?? b.iFSC_IBAN_SWIFT ?? b.ifsC_IBAN_SWIFT ?? '',
  })
  const normalizeCust = (c) => c && ({
    ...c,
    customerId:  c.customerId  ?? c.customerID,
    userId:      c.userId      ?? c.userID,
    // .NET camelCase: DOB -> dOB
    dob:         c.dob         ?? c.dOB,
    riskRating:  c.riskRating  ?? c.RiskRating,
    nationality: c.nationality ?? c.Nationality,
  })

  // Load all customers for Agent picker (Agent can see Admin/Ops's customer list).
  useEffect(() => {
    if (!isAgent) return
    setCustomerLoading(true)
    customersAPI.getAll()
      .then((r) => {
        const list = (Array.isArray(r.data) ? r.data : []).map(normalizeCust)
        setCustomerOptions(list)
      })
      .catch(() => setCustomerOptions([]))
      .finally(() => setCustomerLoading(false))
  }, [isAgent])

  // When Agent picks a customer, load their KYC + beneficiaries.
  useEffect(() => {
    if (!isAgent || !actingFor?.userId) {
      if (isAgent) setActingForKyc(null)
      return
    }
    kycAPI.getByUser(actingFor.userId)
      .then((r) => {
        const raw = r.data
        if (!raw) { setActingForKyc(null); return }
        setActingForKyc({ ...raw, kycId: raw.kycId ?? raw.kYCID ?? raw.kycID ?? raw.kycid, kycLevel: raw.kycLevel ?? raw.kYCLevel })
      })
      .catch(() => setActingForKyc(null))
  }, [isAgent, actingFor?.userId])

  useEffect(() => {
    const cid = effectiveCustomer?.customerId
    if (!cid) { setBeneficiaries([]); return }
    beneficiariesAPI.getByCustomer(cid)
      .then((r) => setBeneficiaries(Array.isArray(r.data) ? r.data.map(normalizeBen) : []))
      .catch(() => setBeneficiaries([]))
  }, [effectiveCustomer?.customerId])

  const handleGetQuote = async (e) => {
    e.preventDefault()
    if (!sendAmount || parseFloat(sendAmount) <= 0) { toast.error('Enter a valid amount'); return }
    if (fromCurrency === toCurrency) { toast.error('From and To currencies must be different'); return }
    setQuoteLoading(true)
    try {
      const res = await fxQuotesAPI.create({
        fromCurrency,
        toCurrency,
        sendAmount: parseFloat(sendAmount),
      })
      setQuote(res.data)
      setStep(0.5)
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to get quote'
      toast.error(typeof msg === 'string' ? msg : 'Currency corridor not supported')
    } finally {
      setQuoteLoading(false)
    }
  }

  const handleLockRate = async () => {
    if (!quote?.quoteId) {
      toast.error('No active quote — get a quote first')
      return
    }
    setLockLoading(true)
    try {
      // Backend overrides CustomerID from JWT subject; we send a placeholder so
      // the DTO validates even if the customer has not created a profile yet.
      const res = await rateLocksAPI.create({
        QuoteID: quote.quoteId,
        // Backend overrides CustomerID from JWT subject anyway, but DTO validation needs a value.
        // For Agent: agent's userId is fine (the backend will use the underlying remittance's customer
        // for downstream data). For Customer: their own customerId / userId.
        CustomerID: effectiveCustomer?.customerId?.toString()
                    ?? user?.userId?.toString()
                    ?? '',
      })
      const lockData = res.data ?? res
      setRateLock(lockData)
      toast.success('Rate locked successfully!')
      setStep(1)
    } catch (err) {
      const msg = err.response?.data?.message
        ?? err.response?.data
        ?? err.message
        ?? 'Failed to lock rate'
      toast.error(typeof msg === 'string' ? msg : 'Failed to lock rate')
    } finally {
      setLockLoading(false)
    }
  }

  // Reused by both Continue (Step 1 -> 2) and Confirm & Send (Step 2 -> submit).
  const validateForReview = () => {
    if (!selectedBeneficiary?.beneficiaryId) { toast.error('Please select a recipient'); return false }
    if (!purposeCode)   { toast.error('Please select a purpose of remittance'); return false }
    if (!sourceOfFunds) { toast.error('Please select your source of funds'); return false }
    return true
  }

  const handleSubmitRemittance = async () => {
    if (!validateForReview()) return
    setSubmitting(true)
    try {
      const res = await remittancesAPI.create({
        CustomerId: effectiveCustomer.customerId,
        BeneficiaryId: selectedBeneficiary.beneficiaryId,
        FromCurrency: fromCurrency,
        ToCurrency: toCurrency,
        SendAmount: parseFloat(sendAmount),
        ReceiverAmount: quote?.receiverAmount,
        QuoteId: quote?.quoteId,
        FeeApplied: quote?.fee ?? 0,
        RateApplied: quote?.offeredRate ?? 1,
        PurposeCode: purposeCode,
        SourceOfFunds: sourceOfFunds,
      })
      // Response casing varies — handle both remitId and remitID.
      const payload = res.data ?? res
      const remitId = payload?.remitId ?? payload?.remitID
      toast.success(`Remittance #${remitId ?? ''} submitted! Notification logged.`)
      if (isAgent) {
        // Agent's remittance list (no detail page is wired for agents yet).
        navigate('/agent/remittances')
      } else if (remitId) {
        navigate(`/customer/remittances/${remitId}`)
      } else {
        navigate('/customer/remittances')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to create remittance')
    } finally {
      setSubmitting(false)
    }
  }

  const lockTimeLeft = rateLock ? Math.max(0, Math.round((new Date(rateLock.lockExpiry) - Date.now()) / 60000)) : 0

  // ---- AGENT FLOW: customer picker ----
  // Agent has no profile/KYC of their own. They must pick a customer to act for.
  if (isAgent && !actingFor) {
    const filteredCustomers = customerOptions.filter((c) => {
      if (!customerSearch) return true
      const q = customerSearch.toLowerCase()
      return (
        String(c.customerId ?? '').includes(q) ||
        String(c.userId ?? '').includes(q) ||
        (c.nationality ?? '').toLowerCase().includes(q)
      )
    })

    return (
      <Layout>
        <div className="max-w-3xl mx-auto space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Transaction (Agent)</h1>
            <p className="text-gray-500 text-sm mt-1">Pick the customer you're sending on behalf of</p>
          </div>

          <Card>
            <div className="relative mb-4">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text" placeholder="Search by customer ID, user ID, nationality..."
                value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)}
                className="form-input pl-9" />
            </div>

            {customerLoading ? <Loader center /> : filteredCustomers.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">No customer profiles found.</div>
            ) : (
              <ul className="divide-y divide-gray-50 max-h-[480px] overflow-y-auto">
                {filteredCustomers.map((c) => (
                  <li key={c.customerId} className="flex items-center gap-3 p-3 hover:bg-primary-50/40 cursor-pointer rounded-lg"
                    onClick={() => setActingFor(c)}>
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                      <UserIcon size={18} className="text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Customer #{c.customerId}</p>
                      <p className="text-xs text-gray-500">User #{c.userId} • {c.nationality || '—'} • {c.riskRating || '—'}</p>
                    </div>
                    <ArrowRight size={14} className="text-gray-300" />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </Layout>
    )
  }

  // ---- KYC gate ----
  // Customer: their own KYC must be Verified.
  // Agent: the chosen customer's KYC must be Verified.
  if (!effectiveKycOk) {
    const reason = !effectiveCustomer?.customerId
      ? isAgent
        ? { title: 'Pick a customer', body: 'Select a customer profile to send money on their behalf.' }
        : { title: 'Complete your profile', body: 'You need to set up your customer profile before you can send money.' }
      : !effectiveKyc
      ? isAgent
        ? { title: 'Customer has no KYC', body: 'This customer hasn\'t submitted KYC yet — they must do that before you can transact for them.' }
        : { title: 'KYC required', body: 'Submit your KYC documents to unlock transactions.' }
      : effectiveKyc.verificationStatus === 'Pending'
      ? { title: 'KYC under review', body: isAgent
          ? 'This customer\'s KYC is awaiting compliance review. Please wait for verification.'
          : 'Your documents have been submitted. An analyst will review and verify shortly.' }
      : effectiveKyc.verificationStatus === 'Rejected'
      ? { title: 'KYC rejected', body: effectiveKyc.notes ? `Reason: ${effectiveKyc.notes}.` : 'Documents rejected — must be re-uploaded.' }
      : { title: 'KYC required', body: 'KYC verification required to transact.' }

    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Send Money</h1>
          <p className="text-gray-500 text-sm mb-6">{isAgent ? 'Acting on behalf of a customer' : 'International transfer in a few simple steps'}</p>
          <Card>
            <div className="text-center py-10">
              <ShieldOff size={48} className="text-amber-400 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-1">{reason.title}</h2>
              <p className="text-gray-500 text-sm mb-5 max-w-md mx-auto">{reason.body}</p>
              {isAgent ? (
                <button onClick={() => setActingFor(null)} className="btn-primary inline-flex items-center gap-2">
                  Pick a different customer <ArrowRight size={14} />
                </button>
              ) : (
                <Link to="/customer/profile" className="btn-primary inline-flex items-center gap-2">
                  Go to Profile & KYC <ArrowRight size={14} />
                </Link>
              )}
            </div>
          </Card>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Send Money</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isAgent ? 'Acting on behalf of a customer' : 'International transfer in a few simple steps'}
          </p>
        </div>

        {/* Agent: Acting-for banner */}
        {isAgent && actingFor && (
          <div className="rounded-xl border border-primary-100 bg-primary-50/60 p-3 flex items-center gap-3 text-sm">
            <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center">
              <UserIcon size={16} className="text-primary-700" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Acting on behalf of Customer #{actingFor.customerId}</p>
              <p className="text-xs text-gray-500">User #{actingFor.userId} • KYC: {actingForKyc?.verificationStatus ?? '—'}</p>
            </div>
            <button onClick={() => { setActingFor(null); setActingForKyc(null); setStep(0); setQuote(null); setRateLock(null); setSelectedBeneficiary(null) }}
              className="btn-secondary text-xs py-1.5 px-3">Change customer</button>
          </div>
        )}

        {/* Stepper */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 text-sm font-medium ${i <= step ? 'text-primary-600' : 'text-gray-400'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                  ${i < step ? 'bg-primary-600 text-white' : i === Math.floor(step) ? 'bg-primary-100 text-primary-700 border-2 border-primary-600' : 'bg-gray-100 text-gray-400'}`}>
                  {i < step ? <CheckCircle size={14} /> : i + 1}
                </div>
                <span className="hidden sm:inline">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? 'bg-primary-600' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 0: Quote calculator */}
        {step < 1 && (
          <Card title="Get Live Quote">
            <form onSubmit={handleGetQuote} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">You Send</label>
                  <div className="flex gap-2">
                    <input
                      type="number" min="1" required
                      value={sendAmount} onChange={(e) => setSendAmount(e.target.value)}
                      className="form-input flex-1" placeholder="1000" />
                    <select value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value)} className="form-select w-24">
                      {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">Recipient Gets</label>
                  <select value={toCurrency} onChange={(e) => setToCurrency(e.target.value)} className="form-select">
                    {CURRENCIES.filter((c) => c !== fromCurrency).map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={quoteLoading} className="btn-primary w-full flex items-center justify-center gap-2">
                {quoteLoading ? <><Loader size="sm" /> Fetching quote...</> : <><RefreshCw size={16} /> Get Quote</>}
              </button>
            </form>

            {/* Quote result */}
            {quote && (
              <div className="mt-5 bg-primary-50 rounded-xl p-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Exchange Rate</span>
                  <span className="font-semibold text-primary-700">
                    1 {fromCurrency} = {quote.offeredRate?.toFixed(4)} {toCurrency}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Fee</span>
                  <span className="font-medium">{fromCurrency} {quote.fee != null ? quote.fee.toFixed(2) : '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Margin (bps)</span>
                  <span className="font-medium">{quote.marginBps ?? '—'}</span>
                </div>
                <div className="border-t border-primary-200 pt-3 flex justify-between">
                  <span className="font-semibold text-gray-700">Recipient Gets</span>
                  <span className="text-xl font-bold text-green-600">
                    {toCurrency} {quote.receiverAmount != null ? quote.receiverAmount.toFixed(2) : '—'}
                  </span>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setQuote(null); setSendAmount('') }} className="btn-secondary flex-1">
                    Change
                  </button>
                  <button onClick={handleLockRate} disabled={lockLoading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    {lockLoading ? <><Loader size="sm" /> Locking...</> : <><Lock size={15} /> Lock Rate</>}
                  </button>
                </div>
                <p className="text-xs text-gray-400 text-center">
                  Rate valid until {quote.validUntil ? formatISTTime(quote.validUntil) : '—'}
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Step 1: Select beneficiary */}
        {step >= 1 && step < 2 && (
          <Card title="Select Recipient">
            {rateLock && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm text-green-700">
                <Lock size={14} /> Rate locked for {lockTimeLeft} more minutes
              </div>
            )}
            {beneficiaries.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle size={36} className="text-gray-200 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No beneficiaries added yet.</p>
                <a href="/customer/beneficiaries" className="btn-primary text-sm mt-3 inline-block">Add Beneficiary</a>
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                {beneficiaries.map((b) => (
                  <div
                    key={b.beneficiaryId}
                    onClick={() => setSelectedBeneficiary(b)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedBeneficiary?.beneficiaryId === b.beneficiaryId
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-100 hover:border-primary-200'
                    }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{b.name}</p>
                        <p className="text-xs text-gray-500">{b.bankName} • {b.country} • {b.payoutMode}</p>
                        <p className="text-xs text-gray-400 font-mono mt-1">{b.accountOrWalletNo}</p>
                      </div>
                      {selectedBeneficiary?.beneficiaryId === b.beneficiaryId && (
                        <CheckCircle size={20} className="text-primary-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Purpose of Remittance</label>
                <select value={purposeCode} onChange={(e) => setPurposeCode(e.target.value)} className="form-select">
                  <option value="">Select purpose</option>
                  {PURPOSE_CODES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Source of Funds</label>
                <select value={sourceOfFunds} onChange={(e) => setSourceOfFunds(e.target.value)} className="form-select">
                  <option value="">Select source</option>
                  {SOURCE_OF_FUNDS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button type="button" onClick={() => setStep(0)} className="btn-secondary flex-1">Back</button>
              <button
                type="button"
                onClick={() => { if (validateForReview()) setStep(2) }}
                className="btn-primary flex-1 flex items-center justify-center gap-2">
                Continue <ArrowRight size={15} />
              </button>
            </div>
          </Card>
        )}

        {/* Step 2: Review & Submit */}
        {step >= 2 && (
          <Card title="Review & Confirm">
            <div className="space-y-3 text-sm">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">You Send</span>
                  <span className="font-semibold">{fromCurrency} {sendAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Exchange Rate</span>
                  <span className="font-semibold">{quote?.offeredRate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fee</span>
                  <span className="font-semibold">{fromCurrency} {quote?.fee != null ? quote.fee.toFixed(2) : '0.00'}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between">
                  <span className="font-semibold text-gray-700">Recipient Gets</span>
                  <span className="font-bold text-green-600 text-base">{toCurrency} {quote?.receiverAmount?.toFixed(2)}</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="font-semibold text-gray-700">Recipient Details</p>
                <div className="flex justify-between">
                  <span className="text-gray-500">Name</span>
                  <span className="font-medium">{selectedBeneficiary?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bank</span>
                  <span className="font-medium">{selectedBeneficiary?.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Account</span>
                  <span className="font-mono text-xs">{selectedBeneficiary?.accountOrWalletNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Country</span>
                  <span className="font-medium">{selectedBeneficiary?.country}</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Purpose</span>
                  <span className="font-medium">{purposeCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Source of Funds</span>
                  <span className="font-medium">{sourceOfFunds}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
              <button onClick={handleSubmitRemittance} disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {submitting ? <><Loader size="sm" /> Submitting...</> : 'Confirm & Send'}
              </button>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  )
}
