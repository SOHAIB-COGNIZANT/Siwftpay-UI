import React, { useEffect, useState } from 'react'
import { formatIST, formatISTDate, formatISTTime } from '../../utils/date'
import { useAuth } from '../../context/AuthContext'
import { notificationsAPI } from '../../api/notifications'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import { Bell, Check, CheckCheck, Trash2, Info, AlertTriangle, DollarSign, Shield } from 'lucide-react'

const CATEGORY_ICONS = {
  KYC: Shield, Quote: DollarSign, Compliance: AlertTriangle, Routing: Info,
  Payout: CheckCheck, Refund: DollarSign,
}

export default function Notifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    if (!user?.userId) { setLoading(false); return }
    notificationsAPI.getByUser(user.userId)
      // .NET camelCase: NotificationID -> notificationID; normalize to notificationId
      .then((r) => setNotifications(Array.isArray(r.data) ? r.data.map((n) => ({
        ...n,
        notificationId: n.notificationId ?? n.notificationID,
      })) : []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false))
  }
  useEffect(load, [user])

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markRead(id)
      setNotifications((prev) => prev.map((n) => n.notificationId === id ? { ...n, status: 'Read' } : n))
    } catch {
      toast.error('Failed to mark as read')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead(user.userId)
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'Read' })))
      toast.success('All marked as read')
    } catch {
      toast.error('Failed')
    }
  }

  const handleDelete = async (id) => {
    try {
      await notificationsAPI.delete(id)
      setNotifications((prev) => prev.filter((n) => n.notificationId !== id))
    } catch {
      toast.error('Failed to delete')
    }
  }

  const unread = notifications.filter((n) => n.status === 'Unread').length

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-500 text-sm">{unread} unread</p>
          </div>
          {unread > 0 && (
            <button onClick={handleMarkAllRead} className="btn-secondary flex items-center gap-2 text-sm">
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
        </div>

        {loading ? <Loader center /> : notifications.length === 0 ? (
          <Card>
            <div className="text-center py-14">
              <Bell size={48} className="text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500">No notifications yet</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const Icon = CATEGORY_ICONS[n.category] || Info
              const isUnread = n.status === 'Unread'
              return (
                <div key={n.notificationId}
                  className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                    isUnread ? 'bg-primary-50 border-primary-100' : 'bg-white border-gray-100'
                  }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                    ${isUnread ? 'bg-primary-100' : 'bg-gray-100'}`}>
                    <Icon size={18} className={isUnread ? 'text-primary-600' : 'text-gray-500'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${isUnread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                      {n.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">{n.category}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-400">{formatIST(n.createdDate)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isUnread && (
                      <button onClick={() => handleMarkRead(n.notificationId)}
                        className="p-1.5 rounded-lg hover:bg-primary-100 text-primary-600 transition-colors" title="Mark read">
                        <Check size={14} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(n.notificationId)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
