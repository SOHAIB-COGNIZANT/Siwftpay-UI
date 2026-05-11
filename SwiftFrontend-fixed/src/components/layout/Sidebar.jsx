import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Send, Users, FileText, Shield, DollarSign,
  Settings, LogOut, ChevronDown, ChevronRight, Bell, BarChart2,
  CreditCard, RefreshCcw, AlertCircle, BookOpen, Scale, Wallet,
  UserCheck, ArrowLeftRight, Landmark, ClipboardList, PieChart,
  Globe, X, Menu
} from 'lucide-react'

const NAV_CONFIG = {
  Customer: [
    { label: 'Dashboard',      path: '/customer/dashboard',    icon: LayoutDashboard },
    { label: 'Send Money',     path: '/customer/send',         icon: Send },
    { label: 'Transactions',   path: '/customer/remittances',  icon: FileText },
    { label: 'Beneficiaries',  path: '/customer/beneficiaries',icon: Users },
    { label: 'Profile & KYC',  path: '/customer/profile',      icon: UserCheck },
    { label: 'Notifications',  path: '/customer/notifications',icon: Bell },
  ],
  Agent: [
    { label: 'Dashboard',       path: '/agent/dashboard',       icon: LayoutDashboard },
    { label: 'Approvals Queue', path: '/agent/approvals',       icon: ClipboardList },
    { label: 'New Transaction', path: '/agent/send',            icon: Send },
    { label: 'Transactions',    path: '/agent/remittances',     icon: FileText },
    { label: 'KYC Capture',     path: '/agent/kyc',             icon: UserCheck },
  ],
  Compliance: [
    { label: 'Dashboard',        path: '/compliance/dashboard',  icon: LayoutDashboard },
    { label: 'KYC Review',       path: '/compliance/kyc',        icon: Shield },
    { label: 'Compliance Checks',path: '/compliance/checks',     icon: AlertCircle },
    { label: 'Decisions',        path: '/compliance/decisions',  icon: Scale },
    { label: 'Documents',        path: '/compliance/documents',  icon: BookOpen },
  ],
  Ops: [
    { label: 'Dashboard',           path: '/ops/dashboard',         icon: LayoutDashboard },
    { label: 'Transaction Queue',   path: '/ops/queue',             icon: ClipboardList },
    { label: 'Payout Instructions', path: '/ops/payout',            icon: Send },
    { label: 'Settlement',          path: '/ops/settlement',        icon: Landmark },
    { label: 'Reconciliation',      path: '/ops/reconciliation',    icon: RefreshCcw },
    { label: 'Amendments',          path: '/ops/amendments',        icon: ArrowLeftRight },
    { label: 'Cancellations',       path: '/ops/cancellations',     icon: X },
    { label: 'Refunds',             path: '/ops/refunds',           icon: CreditCard },
  ],
  Treasury: [
    { label: 'Dashboard',      path: '/treasury/dashboard',    icon: LayoutDashboard },
    { label: 'FX Quotes',      path: '/treasury/fxquotes',     icon: Globe },
    { label: 'Fee Rules',      path: '/treasury/feerules',     icon: DollarSign },
    { label: 'Rate Locks',     path: '/treasury/ratelocks',    icon: Wallet },
    { label: 'Settlement',     path: '/treasury/settlement',   icon: Landmark },
    { label: 'Reconciliation', path: '/treasury/reconciliation',icon: RefreshCcw },
  ],
  Admin: [
    { label: 'Dashboard',       path: '/admin/dashboard',       icon: LayoutDashboard },
    { label: 'Users',           path: '/admin/users',           icon: Users },
    { label: 'Roles',           path: '/admin/roles',           icon: Shield },
    { label: 'KYC Review',      path: '/admin/kyc',             icon: UserCheck },
    { label: 'Fee Rules',       path: '/admin/feerules',        icon: DollarSign },
    { label: 'Routing Rules',   path: '/admin/routing',         icon: ArrowLeftRight },
    { label: 'Payout Instructions', path: '/admin/payout',     icon: Send },
    { label: 'Settlement',      path: '/admin/settlement',      icon: Landmark },
    { label: 'Reconciliation',  path: '/admin/reconciliation',  icon: RefreshCcw },
    { label: 'Amendments',      path: '/admin/amendments',      icon: ArrowLeftRight },
    { label: 'Cancellations',   path: '/admin/cancellations',   icon: X },
    { label: 'Refunds',         path: '/admin/refunds',         icon: CreditCard },
    { label: 'Reports',         path: '/admin/reports',         icon: PieChart },
    { label: 'Audit Logs',      path: '/admin/auditlogs',       icon: BarChart2 },
    { label: 'Settings',        path: '/admin/settings',        icon: Settings },
  ],
}

export default function Sidebar({ collapsed, onToggle }) {
  const { user, role, logout } = useAuth()
  const navigate = useNavigate()
  const items = NAV_CONFIG[role] || []

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const roleColors = {
    Customer: 'bg-blue-100 text-blue-700',
    Agent: 'bg-green-100 text-green-700',
    Compliance: 'bg-purple-100 text-purple-700',
    Ops: 'bg-orange-100 text-orange-700',
    Treasury: 'bg-amber-100 text-amber-700',
    Admin: 'bg-red-100 text-red-700',
  }

  return (
    <aside className={`fixed top-0 left-0 h-full z-40 transition-all duration-300 flex flex-col
      ${collapsed ? 'w-16' : 'w-64'}
      bg-white border-r border-primary-100 shadow-nav`}>

      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-primary-100">
        <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-lg">S</span>
        </div>
        {!collapsed && (
          <div>
            <span className="text-primary-700 font-bold text-xl tracking-tight">Swift</span>
            <span className="text-accent-500 font-bold text-xl">Pay</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="ml-auto p-1 rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-600 transition-colors">
          <Menu size={18} />
        </button>
      </div>

      {/* User info */}
      {!collapsed && user && (
        <div className="px-4 py-3 border-b border-primary-50 bg-gradient-card">
          <p className="text-sm font-semibold text-gray-800 truncate">{user.name || user.email}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 inline-block ${roleColors[role] || 'bg-gray-100 text-gray-600'}`}>
            {role}
          </span>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-link mb-0.5 ${isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'}`
              }
              title={collapsed ? item.label : undefined}>
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 py-3 border-t border-primary-100">
        <button
          onClick={handleLogout}
          className={`sidebar-link sidebar-link-inactive w-full text-red-500 hover:bg-red-50 hover:text-red-600`}
          title={collapsed ? 'Logout' : undefined}>
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
