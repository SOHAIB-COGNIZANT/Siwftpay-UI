import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { notificationsAPI } from '../../api/notifications'
import { Bell, ChevronDown, User, LogOut, Settings } from 'lucide-react'

export default function Navbar({ sidebarCollapsed }) {
  const { user, role, logout } = useAuth()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (user?.userId) {
      notificationsAPI.getUnread(user.userId)
        .then((r) => setUnreadCount(Array.isArray(r.data) ? r.data.length : 0))
        .catch(() => {})
    }
  }, [user])

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const notifPath = role === 'Customer' ? '/customer/notifications' : '#'

  return (
    <header className={`fixed top-0 right-0 z-30 h-16 bg-white border-b border-primary-100 shadow-nav
      flex items-center justify-between px-6 transition-all duration-300
      ${sidebarCollapsed ? 'left-16' : 'left-64'}`}>

      {/* Page breadcrumb placeholder */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400 font-medium">SwiftPay</span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <Link to={notifPath} className="relative p-2 rounded-lg hover:bg-primary-50 text-gray-500 hover:text-primary-600 transition-colors">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-accent-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-primary-50 transition-colors">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold text-sm">
              {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-gray-800 leading-tight">{user?.name || user?.email}</p>
              <p className="text-xs text-primary-500">{role}</p>
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
              {role === 'Customer' && (
                <Link
                  to="/customer/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors">
                  <User size={15} /> Profile
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full text-left transition-colors">
                <LogOut size={15} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
