import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../api/auth'
import { customersAPI } from '../api/customers'
import { kycAPI } from '../api/kyc'

const AuthContext = createContext(null)

// ─── helpers ─────────────────────────────────────────────────────────────────
// Backend: PropertyNamingPolicy = null  →  PascalCase properties
//          JsonStringEnumConverter      →  enum as string ("Admin", "Customer"…)
//
// After axios interceptor unwraps { message, data }, res.data is the payload:
//   Login:  { Token, User: { UserId, Name, Email, Phone, Roles:[{RoleType:"Admin"}] } }
//   Others: the DTO object directly

function extractRoleString(rawUser) {
  // Roles is [{UserRoleId, RoleId, RoleType:"Admin", IsActive, CreatedAt}, ...]
  const roles = rawUser?.Roles ?? rawUser?.roles ?? []
  if (roles.length > 0) {
    return roles[0].RoleType ?? roles[0].roleType ?? null
  }
  return rawUser?.Role ?? rawUser?.role ?? null
}

function normalizeUser(raw) {
  if (!raw) return null
  const roleStr = extractRoleString(raw)
  return {
    userId: raw.UserId ?? raw.userId,
    name:   raw.Name  ?? raw.name,
    email:  raw.Email ?? raw.email,
    phone:  raw.Phone ?? raw.phone,
    role:   roleStr,                        // single primary role string e.g. "Admin"
    roles:  (raw.Roles ?? raw.roles ?? []).map((r) => r.RoleType ?? r.roleType ?? r),
    status: raw.Status ?? raw.status,
  }
}
// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('swiftpay_user') || 'null') }
    catch { return null }
  })
  const [token, setToken]             = useState(() => localStorage.getItem('swiftpay_token'))
  const [customerProfile, setCustomerProfile] = useState(null)
  const [kyc, setKyc] = useState(null)
  const [loading, setLoading]         = useState(false)

  const role = user?.role ?? null

  // Backend JsonNamingPolicy.CamelCase keeps trailing acronyms (CustomerID -> customerID),
  // so we normalize to consistent camelCase here once.
  const normalizeCustomer = (raw) => {
    if (!raw) return null
    return {
      ...raw,
      // .NET camelCase: CustomerID -> customerID, UserID -> userID
      customerId: raw.customerId ?? raw.customerID,
      userId:     raw.userId     ?? raw.userID,
      // .NET camelCase: DOB -> dOB (acronym preserved, only first letter lowercased)
      dob:         raw.dob        ?? raw.dOB,
      // Normalize other common casing variants
      addressJSON: raw.addressJSON ?? raw.addressJson,
      riskRating:  raw.riskRating  ?? raw.RiskRating,
      nationality: raw.nationality ?? raw.Nationality,
      status:      raw.status      ?? raw.Status,
    }
  }
  const normalizeKyc = (raw) => {
    if (!raw) return null
    return {
      ...raw,
      // .NET camelCase: KYCID -> kYCID (only first letter lowercased, rest unchanged)
      kycId:              raw.kycId  ?? raw.kYCID ?? raw.kycID ?? raw.kycid,
      userId:             raw.userId ?? raw.userID,
      // .NET camelCase: KYCLevel -> kYCLevel
      kycLevel:           raw.kycLevel    ?? raw.kYCLevel,
      verificationStatus: raw.verificationStatus ?? raw.VerificationStatus,
      verifiedDate:       raw.verifiedDate ?? raw.VerifiedDate,
      notes:              raw.notes        ?? raw.Notes,
    }
  }

  const refreshCustomerProfile = useCallback(async () => {
    if (!user?.userId) return null
    try {
      const res = await customersAPI.getByUserId(user.userId)
      const profile = normalizeCustomer(res.data ?? null)
      setCustomerProfile(profile)
      return profile
    } catch {
      setCustomerProfile(null)
      return null
    }
  }, [user?.userId])

  const refreshKyc = useCallback(async () => {
    if (!user?.userId) return null
    try {
      const res = await kycAPI.getByUser(user.userId)
      const kycData = normalizeKyc(res.data ?? null)
      setKyc(kycData)
      return kycData
    } catch {
      setKyc(null)
      return null
    }
  }, [user?.userId])

  // Fetch customer profile + KYC once logged in as Customer
  useEffect(() => {
    if (user?.userId && role === 'Customer') {
      refreshCustomerProfile()
      refreshKyc()
    } else {
      setCustomerProfile(null)
      setKyc(null)
    }
  }, [user?.userId, role, refreshCustomerProfile, refreshKyc])

  const login = useCallback(async (email, password) => {
    setLoading(true)
    try {
      // Send PascalCase to match backend RegisterUserDto / LoginDto
      const res = await authAPI.login({ Email: email, Password: password })
      // After interceptor: res.data = { Token, User: {...} }
      const jwt     = res.data?.Token ?? res.data?.token
      const rawUser = res.data?.User  ?? res.data?.user

      if (!jwt || !rawUser) throw new Error('Unexpected server response')

      const normalizedUser = normalizeUser(rawUser)
      localStorage.setItem('swiftpay_token', jwt)
      localStorage.setItem('swiftpay_user', JSON.stringify(normalizedUser))
      setToken(jwt)
      setUser(normalizedUser)
      return { success: true, user: normalizedUser }
    } catch (err) {
      const msg = err.response?.data?.message
        ?? err.response?.data?.Message
        ?? err.message
        ?? 'Login failed'
      return { success: false, error: msg }
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (data) => {
    setLoading(true)
    try {
      const res = await authAPI.register({
        Name:     data.name,
        Email:    data.email,
        Phone:    data.phone || '',
        Password: data.password,
      })
      return { success: true, data: res.data }
    } catch (err) {
      const msg = err.response?.data?.message
        ?? err.response?.data?.Message
        ?? 'Registration failed'
      return { success: false, error: msg }
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('swiftpay_token')
    localStorage.removeItem('swiftpay_user')
    setToken(null)
    setUser(null)
    setCustomerProfile(null)
    setKyc(null)
  }, [])

  const hasRole = useCallback((...roles) => {
    if (!user) return false
    return roles.some((r) => user.roles?.includes(r) || user.role === r)
  }, [user])

  return (
    <AuthContext.Provider value={{
      user, token, role,
      customerProfile, refreshCustomerProfile,
      kyc, refreshKyc,
      loading, login, register, logout, hasRole,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
