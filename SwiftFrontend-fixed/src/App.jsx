import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Loader from './components/common/Loader'

// Public
import LandingPage   from './pages/LandingPage'
import Login         from './pages/auth/Login'
import Register      from './pages/auth/Register'

// Customer
import CustomerDashboard  from './pages/customer/Dashboard'
import SendMoney          from './pages/customer/SendMoney'
import Remittances        from './pages/customer/Remittances'
import RemittanceDetail   from './pages/customer/RemittanceDetail'
import Beneficiaries      from './pages/customer/Beneficiaries'
import CustomerProfile    from './pages/customer/Profile'
import Notifications      from './pages/customer/Notifications'

// Agent
import AgentDashboard      from './pages/agent/Dashboard'
import AgentApprovals      from './pages/agent/Approvals'

// Compliance
import ComplianceDashboard from './pages/compliance/Dashboard'
import KYCReview           from './pages/compliance/KYCReview'
import ComplianceChecks    from './pages/compliance/ComplianceChecks'

// Operations
import OpsDashboard        from './pages/operations/Dashboard'
import Settlement          from './pages/operations/Settlement'
import ReconciliationPage  from './pages/operations/Reconciliation'

// Treasury
import TreasuryDashboard from './pages/treasury/Dashboard'
import FeeRulesPage      from './pages/treasury/FeeRules'
import FXQuotesPage      from './pages/treasury/FXQuotes'
import RateLocksPage     from './pages/treasury/RateLocks'

// Admin
import AdminDashboard       from './pages/admin/Dashboard'
import AdminUsers           from './pages/admin/Users'
import AdminRoles           from './pages/admin/Roles'
import AuditLogs            from './pages/admin/AuditLogs'
import Reports              from './pages/admin/Reports'
import RoutingRulesPage     from './pages/admin/RoutingRules'
import PayoutInstructionsPage from './pages/admin/PayoutInstructions'
import AmendmentsPage       from './pages/admin/Amendments'
import CancellationsPage    from './pages/admin/Cancellations'
import RefundsPage          from './pages/admin/Refunds'
import AdminSettings        from './pages/admin/Settings'

// Shared
import AllRemittances from './pages/shared/AllRemittances'

const ROLE_HOME = {
  Customer:   '/customer/dashboard',
  Agent:      '/agent/dashboard',
  Compliance: '/compliance/dashboard',
  Ops:        '/ops/dashboard',
  Treasury:   '/treasury/dashboard',
  Admin:      '/admin/dashboard',
}

function RequireAuth({ children, allowedRoles }) {
  const { user, role } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={ROLE_HOME[role] || '/login'} replace />
  }
  return children
}

function RedirectIfAuth({ children }) {
  const { user, role } = useAuth()
  if (user) return <Navigate to={ROLE_HOME[role] || '/customer/dashboard'} replace />
  return children
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login"    element={<RedirectIfAuth><Login /></RedirectIfAuth>} />
      <Route path="/register" element={<RedirectIfAuth><Register /></RedirectIfAuth>} />

      {/* Customer */}
      <Route path="/customer/dashboard"         element={<RequireAuth allowedRoles={['Customer']}><CustomerDashboard /></RequireAuth>} />
      <Route path="/customer/send"              element={<RequireAuth allowedRoles={['Customer']}><SendMoney /></RequireAuth>} />
      <Route path="/customer/remittances"       element={<RequireAuth allowedRoles={['Customer']}><Remittances /></RequireAuth>} />
      <Route path="/customer/remittances/:id"   element={<RequireAuth allowedRoles={['Customer']}><RemittanceDetail /></RequireAuth>} />
      <Route path="/customer/beneficiaries"     element={<RequireAuth allowedRoles={['Customer']}><Beneficiaries /></RequireAuth>} />
      <Route path="/customer/profile"           element={<RequireAuth allowedRoles={['Customer']}><CustomerProfile /></RequireAuth>} />
      <Route path="/customer/notifications"     element={<RequireAuth allowedRoles={['Customer']}><Notifications /></RequireAuth>} />

      {/* Agent */}
      <Route path="/agent/dashboard"    element={<RequireAuth allowedRoles={['Agent']}><AgentDashboard /></RequireAuth>} />
      <Route path="/agent/send"         element={<RequireAuth allowedRoles={['Agent']}><SendMoney /></RequireAuth>} />
      <Route path="/agent/approvals"    element={<RequireAuth allowedRoles={['Agent']}><AgentApprovals /></RequireAuth>} />
      <Route path="/agent/remittances"  element={<RequireAuth allowedRoles={['Agent']}><AllRemittances role="Agent" /></RequireAuth>} />
      <Route path="/agent/kyc"          element={<RequireAuth allowedRoles={['Agent']}><KYCReview /></RequireAuth>} />

      {/* Compliance */}
      <Route path="/compliance/dashboard" element={<RequireAuth allowedRoles={['Compliance']}><ComplianceDashboard /></RequireAuth>} />
      <Route path="/compliance/kyc"       element={<RequireAuth allowedRoles={['Compliance']}><KYCReview /></RequireAuth>} />
      <Route path="/compliance/checks"    element={<RequireAuth allowedRoles={['Compliance']}><ComplianceChecks /></RequireAuth>} />
      <Route path="/compliance/decisions" element={<RequireAuth allowedRoles={['Compliance']}><ComplianceChecks /></RequireAuth>} />
      <Route path="/compliance/documents" element={<RequireAuth allowedRoles={['Compliance']}><AllRemittances role="Compliance" /></RequireAuth>} />

      {/* Operations */}
      <Route path="/ops/dashboard"      element={<RequireAuth allowedRoles={['Ops']}><OpsDashboard /></RequireAuth>} />
      <Route path="/ops/queue"          element={<RequireAuth allowedRoles={['Ops']}><AllRemittances role="Ops" /></RequireAuth>} />
      <Route path="/ops/settlement"     element={<RequireAuth allowedRoles={['Ops']}><Settlement /></RequireAuth>} />
      <Route path="/ops/reconciliation" element={<RequireAuth allowedRoles={['Ops']}><ReconciliationPage /></RequireAuth>} />
      <Route path="/ops/amendments"     element={<RequireAuth allowedRoles={['Ops']}><AmendmentsPage /></RequireAuth>} />
      <Route path="/ops/cancellations"  element={<RequireAuth allowedRoles={['Ops']}><CancellationsPage /></RequireAuth>} />
      <Route path="/ops/refunds"        element={<RequireAuth allowedRoles={['Ops']}><RefundsPage /></RequireAuth>} />

      {/* Treasury */}
      <Route path="/treasury/dashboard"       element={<RequireAuth allowedRoles={['Treasury']}><TreasuryDashboard /></RequireAuth>} />
      <Route path="/treasury/fxquotes"        element={<RequireAuth allowedRoles={['Treasury']}><FXQuotesPage /></RequireAuth>} />
      <Route path="/treasury/feerules"        element={<RequireAuth allowedRoles={['Treasury']}><FeeRulesPage /></RequireAuth>} />
      <Route path="/treasury/ratelocks"       element={<RequireAuth allowedRoles={['Treasury']}><RateLocksPage /></RequireAuth>} />
      <Route path="/treasury/settlement"      element={<RequireAuth allowedRoles={['Treasury']}><Settlement /></RequireAuth>} />
      <Route path="/treasury/reconciliation"  element={<RequireAuth allowedRoles={['Treasury']}><ReconciliationPage /></RequireAuth>} />

      {/* Admin */}
      <Route path="/admin/dashboard"      element={<RequireAuth allowedRoles={['Admin']}><AdminDashboard /></RequireAuth>} />
      <Route path="/admin/users"          element={<RequireAuth allowedRoles={['Admin']}><AdminUsers /></RequireAuth>} />
      <Route path="/admin/roles"          element={<RequireAuth allowedRoles={['Admin']}><AdminRoles /></RequireAuth>} />
      <Route path="/admin/kyc"            element={<RequireAuth allowedRoles={['Admin']}><KYCReview /></RequireAuth>} />
      <Route path="/admin/feerules"       element={<RequireAuth allowedRoles={['Admin']}><FeeRulesPage /></RequireAuth>} />
      <Route path="/admin/routing"        element={<RequireAuth allowedRoles={['Admin']}><RoutingRulesPage /></RequireAuth>} />
      <Route path="/ops/payout"         element={<RequireAuth allowedRoles={['Ops','Admin']}><PayoutInstructionsPage /></RequireAuth>} />
      <Route path="/admin/payout"         element={<RequireAuth allowedRoles={['Admin','Ops']}><PayoutInstructionsPage /></RequireAuth>} />
      <Route path="/admin/settlement"     element={<RequireAuth allowedRoles={['Admin']}><Settlement /></RequireAuth>} />
      <Route path="/admin/reconciliation" element={<RequireAuth allowedRoles={['Admin']}><ReconciliationPage /></RequireAuth>} />
      <Route path="/admin/amendments"     element={<RequireAuth allowedRoles={['Admin']}><AmendmentsPage /></RequireAuth>} />
      <Route path="/admin/cancellations"  element={<RequireAuth allowedRoles={['Admin']}><CancellationsPage /></RequireAuth>} />
      <Route path="/admin/refunds"        element={<RequireAuth allowedRoles={['Admin']}><RefundsPage /></RequireAuth>} />
      <Route path="/admin/reports"        element={<RequireAuth allowedRoles={['Admin']}><Reports /></RequireAuth>} />
      <Route path="/admin/auditlogs"      element={<RequireAuth allowedRoles={['Admin']}><AuditLogs /></RequireAuth>} />
      <Route path="/admin/settings"       element={<RequireAuth allowedRoles={['Admin']}><AdminSettings /></RequireAuth>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
