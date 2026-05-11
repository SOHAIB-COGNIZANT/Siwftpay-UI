import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react'

export default function Register() {
  const { register, login, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [showPw, setShowPw] = useState(false)
  const [step, setStep] = useState(1) // 1 = register, 2 = success

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    const res = await register({ name: form.name, email: form.email, phone: form.phone, password: form.password })
    if (res.success) {
      toast.success('Account created! Logging you in...')
      // Auto-login
      const loginRes = await login(form.email, form.password)
      if (loginRes.success) {
        navigate('/customer/dashboard')
      } else {
        navigate('/login')
      }
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
            Start Sending in<br />Minutes
          </h2>
          <p className="text-blue-100 text-lg leading-relaxed mb-8">
            Create a free account and get access to real-time FX rates, secure transfers, and full compliance features.
          </p>
          <ul className="space-y-3">
            {['No hidden fees', 'Real-time rate lock', 'KYC in minutes', '150+ corridors supported'].map((t) => (
              <li key={t} className="flex items-center gap-2 text-blue-100">
                <div className="w-5 h-5 rounded-full bg-accent-400 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative z-10 text-blue-200 text-sm">
          By registering, you agree to our Terms of Service and Privacy Policy.
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
              <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
              <p className="text-gray-500 text-sm mt-1">Join SwiftPay and send money globally</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text" name="name" required
                    value={form.name} onChange={handleChange}
                    className="form-input pl-10" placeholder="John Doe" />
                </div>
              </div>
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
                <label className="form-label">Phone Number *</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel" name="phone" required
                    value={form.phone} onChange={handleChange}
                    className="form-input pl-10" placeholder="+91 9876543210" />
                </div>
              </div>
              <div>
                <label className="form-label">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPw ? 'text' : 'password'} name="password" required minLength={8}
                    value={form.password} onChange={handleChange}
                    className="form-input pl-10 pr-10" placeholder="Min. 8 characters" />
                  <button type="button" onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="form-label">Confirm Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password" name="confirmPassword" required
                    value={form.confirmPassword} onChange={handleChange}
                    className="form-input pl-10" placeholder="Repeat password" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-5">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
