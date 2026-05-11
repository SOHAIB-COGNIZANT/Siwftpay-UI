import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'

const ROLE_ROUTES = {
  Customer:   '/customer/dashboard',
  Agent:      '/agent/dashboard',
  Compliance: '/compliance/dashboard',
  Ops:        '/ops/dashboard',
  Treasury:   '/treasury/dashboard',
  Admin:      '/admin/dashboard',
}

export default function Login() {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const res = await login(form.email, form.password)
    if (res.success) {
      toast.success('Welcome back!')
      // role is already a plain string after normalization in AuthContext
      const primaryRole = res.user?.role ?? res.user?.roles?.[0]
      navigate(ROLE_ROUTES[primaryRole] || '/customer/dashboard')
    } else {
      toast.error(res.error)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-5/12 gradient-hero p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-5 w-80 h-80 bg-accent-300 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2 mb-16">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="text-white font-bold text-2xl">SwiftPay</span>
          </Link>
          <h2 className="text-3xl font-bold text-white mb-4">
            Global Remittance<br />at Your Fingertips
          </h2>
          <p className="text-blue-100 text-lg leading-relaxed">
            Send money to 150+ countries with real-time FX rates, full compliance, and instant tracking.
          </p>
        </div>
        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[['150+', 'Countries'], ['2M+', 'Customers'], ['99.9%', 'Uptime']].map(([v, l]) => (
            <div key={l} className="bg-white/10 rounded-xl p-4 text-center border border-white/10">
              <p className="text-2xl font-bold text-white">{v}</p>
              <p className="text-blue-200 text-sm">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-primary-700 font-bold text-xl">Swift</span>
            <span className="text-accent-500 font-bold text-xl -ml-1">Pay</span>
          </div>

          <div className="card">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
              <p className="text-gray-500 text-sm mt-1">Sign in to your SwiftPay account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email" name="email" required
                    value={form.email} onChange={handleChange}
                    className="form-input pl-10" placeholder="you@email.com" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="form-label mb-0">Password</label>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPw ? 'text' : 'password'} name="password" required
                    value={form.password} onChange={handleChange}
                    className="form-input pl-10 pr-10" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-5">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-600 font-medium hover:underline">Create one</Link>
            </p>
          </div>

          {/* Demo credentials hint - dev only */}
          {import.meta.env.DEV && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <p className="font-semibold mb-1">Demo Admin Credentials (dev)</p>
              <p>Email: <span className="font-mono">admin@swiftpay.local</span></p>
              <p>Password: <span className="font-mono">MySecretPassword123!</span></p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
