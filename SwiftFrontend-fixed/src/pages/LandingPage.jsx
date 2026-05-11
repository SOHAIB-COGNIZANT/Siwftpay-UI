import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { fxQuotesAPI } from '../api/fxquotes'
import {
  Globe, Shield, Zap, TrendingUp, ChevronRight, ArrowRight,
  Star, CheckCircle, Phone, Mail, Send, DollarSign, Users,
  BarChart2, Lock
} from 'lucide-react'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'JPY', 'INR', 'MYR']

const FEATURES = [
  { icon: Zap,      title: 'Lightning Fast',    desc: 'Transfers processed in minutes, not days. Real-time status tracking.' },
  { icon: Shield,   title: 'Bank-Grade Security',desc: 'AES-256 encryption, multi-factor authentication, and full KYC/AML compliance.' },
  { icon: TrendingUp,title: 'Best Rates',        desc: 'Live FX quotes with minimal spread. Lock your rate for up to 24 hours.' },
  { icon: Globe,    title: '150+ Countries',     desc: 'Send money to bank accounts, cash pickup, or mobile wallets worldwide.' },
  { icon: Users,    title: 'Multiple Recipients',desc: 'Save unlimited beneficiaries and send to anyone, anywhere, anytime.' },
  { icon: Lock,     title: 'Compliant',          desc: 'Fully compliant with FEMA, RBI, and international AML/CFT regulations.' },
]

const CORRIDORS = [
  { from: 'INR', to: 'USD', rate: '0.01196', flag: '🇮🇳→🇺🇸' },
  { from: 'INR', to: 'EUR', rate: '0.01095', flag: '🇮🇳→🇪🇺' },
  { from: 'INR', to: 'GBP', rate: '0.00938', flag: '🇮🇳→🇬🇧' },
  { from: 'INR', to: 'AED', rate: '0.04390', flag: '🇮🇳→🇦🇪' },
  { from: 'USD', to: 'INR', rate: '83.62',   flag: '🇺🇸→🇮🇳' },
  { from: 'GBP', to: 'INR', rate: '106.61',  flag: '🇬🇧→🇮🇳' },
]

const STEPS = [
  { n: '01', title: 'Create Account',  desc: 'Sign up in under 2 minutes. Complete KYC with your ID proof.' },
  { n: '02', title: 'Get a Quote',     desc: 'Enter send amount, select corridor, and see the exact rate instantly.' },
  { n: '03', title: 'Add Recipient',   desc: 'Add beneficiary bank details or pick up location. One-time setup.' },
  { n: '04', title: 'Track & Receive', desc: 'Track your transfer in real time until your recipient gets the funds.' },
]

export default function LandingPage() {
  const [fromCurrency, setFromCurrency] = useState('USD')
  const [toCurrency, setToCurrency] = useState('INR')
  const [amount, setAmount] = useState('')
  const [quoteResult, setQuoteResult] = useState(null)
  const [quoteLoading, setQuoteLoading] = useState(false)

  const handleQuote = async (e) => {
    e.preventDefault()
    setQuoteLoading(true)
    setQuoteResult(null)
    // Simulate a quote preview (demo mode, not authenticated)
    setTimeout(() => {
      const mockRate = (Math.random() * 0.5 + 0.8).toFixed(4)
      const received = (parseFloat(amount) * parseFloat(mockRate)).toFixed(2)
      setQuoteResult({ rate: mockRate, received, fee: '2.50', total: (parseFloat(amount) + 2.5).toFixed(2) })
      setQuoteLoading(false)
    }, 800)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-primary-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-primary-700 font-bold text-xl">Swift</span>
            <span className="text-accent-500 font-bold text-xl -ml-1">Pay</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-primary-600 transition-colors">Features</a>
            <a href="#rates" className="hover:text-primary-600 transition-colors">Rates</a>
            <a href="#how" className="hover:text-primary-600 transition-colors">How it works</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-secondary py-2 px-4 text-sm">Sign In</Link>
            <Link to="/register" className="btn-primary py-2 px-4 text-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="gradient-hero pt-24 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent-300 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur text-white text-sm px-4 py-1.5 rounded-full mb-6 border border-white/20">
                <Zap size={13} className="text-accent-300" />
                <span>Trusted by 2M+ customers worldwide</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
                Send Money Abroad
                <span className="text-accent-300 block">Fast. Safe. Simple.</span>
              </h1>
              <p className="text-blue-100 text-lg mb-8 leading-relaxed">
                International remittances at unbeatable rates. Bank-grade security, real-time tracking, and instant FX quotes for 150+ countries.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/register" className="btn-accent text-base px-7 py-3 flex items-center gap-2">
                  Start Sending <ArrowRight size={18} />
                </Link>
                <a href="#how" className="bg-white/10 hover:bg-white/20 text-white border border-white/30 font-medium px-7 py-3 rounded-lg transition-all flex items-center gap-2">
                  How it works <ChevronRight size={18} />
                </a>
              </div>
              <div className="flex gap-6 mt-8">
                {[['150+', 'Countries'], ['₹0', 'Hidden Fees'], ['2min', 'Avg. Transfer']].map(([v, l]) => (
                  <div key={l}>
                    <p className="text-2xl font-bold text-white">{v}</p>
                    <p className="text-blue-200 text-sm">{l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quote Calculator */}
            <div className="bg-white rounded-2xl shadow-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-5">Get Instant Quote</h3>
              <form onSubmit={handleQuote} className="space-y-4">
                <div>
                  <label className="form-label">You Send</label>
                  <div className="flex gap-2">
                    <input
                      type="number" min="1" required
                      value={amount} onChange={(e) => setAmount(e.target.value)}
                      className="form-input flex-1" placeholder="1000" />
                    <select value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value)} className="form-select w-28">
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
                <button type="submit" disabled={quoteLoading || !amount} className="btn-primary w-full">
                  {quoteLoading ? 'Calculating...' : 'Get Quote'}
                </button>
              </form>
              {quoteResult && (
                <div className="mt-4 bg-primary-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Exchange Rate</span>
                    <span className="font-semibold text-primary-700">1 {fromCurrency} = {quoteResult.rate} {toCurrency}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Transfer Fee</span>
                    <span className="font-semibold">{fromCurrency} {quoteResult.fee}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-primary-100 pt-2 font-semibold">
                    <span className="text-gray-700">Recipient Gets</span>
                    <span className="text-green-600 text-base">{toCurrency} {quoteResult.received}</span>
                  </div>
                  <Link to="/register" className="btn-accent w-full text-center block mt-2 text-sm py-2">
                    Send Now →
                  </Link>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-3 text-center">* Demo quote. Login for live rates.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Live Rates ticker */}
      <section id="rates" className="bg-primary-900 py-4 overflow-hidden">
        <div className="flex gap-8 animate-none">
          <div className="flex gap-8 min-w-full items-center justify-center flex-wrap px-6">
            {CORRIDORS.map((c) => (
              <div key={`${c.from}-${c.to}`} className="flex items-center gap-2 text-sm">
                <span className="text-lg">{c.flag}</span>
                <span className="text-white font-medium">{c.from}/{c.to}</span>
                <span className="text-accent-300 font-bold">{c.rate}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-bg">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose SwiftPay?</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">Built for individuals and businesses who need reliable, compliant, and fast international money transfers.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="card hover:shadow-lg transition-shadow group">
                  <div className="w-12 h-12 rounded-xl bg-primary-50 group-hover:bg-primary-600 flex items-center justify-center mb-4 transition-colors">
                    <Icon size={22} className="text-primary-600 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How SwiftPay Works</h2>
            <p className="text-gray-500 text-lg">Four simple steps to send money anywhere in the world</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.n} className="relative text-center">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-primary-100 z-0" />
                )}
                <div className="relative z-10 w-16 h-16 rounded-2xl bg-primary-600 text-white font-bold text-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  {s.n}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="gradient-hero py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Send Money?</h2>
          <p className="text-blue-100 text-lg mb-8">Join millions who trust SwiftPay for their international transfers.</p>
          <Link to="/register" className="btn-accent text-base px-8 py-3.5 inline-flex items-center gap-2">
            Create Free Account <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
                <span className="text-white font-bold">S</span>
              </div>
              <span className="text-white font-bold">SwiftPay</span>
            </div>
            <p className="text-sm text-center">© 2026 SwiftPay. All rights reserved. Regulated international remittance platform.</p>
            <div className="flex gap-4 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
