import React, { useEffect, useState } from 'react'
import { formatIST, formatISTDate, formatISTTime } from '../../utils/date'
import { rolesAPI } from '../../api/roles'
import { usersAPI } from '../../api/users'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import Table from '../../components/common/Table'
import Modal from '../../components/common/Modal'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import { Shield, UserPlus, X } from 'lucide-react'

const ROLE_TYPES = ['Customer', 'Agent', 'Compliance', 'Ops', 'Treasury', 'Admin']
const ROLE_COLORS = {
  Admin:      'bg-red-50 text-red-700',
  Customer:   'bg-blue-50 text-blue-700',
  Agent:      'bg-purple-50 text-purple-700',
  Compliance: 'bg-amber-50 text-amber-700',
  Ops:        'bg-green-50 text-green-700',
  Treasury:   'bg-indigo-50 text-indigo-700',
}

export default function AdminRoles() {
  const [roles, setRoles] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [assignModal, setAssignModal] = useState(false)
  const [assignForm, setAssignForm] = useState({ userId: '', roleId: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [rolesRes, usersRes] = await Promise.all([rolesAPI.getAll(), usersAPI.getAll()])
      const rolesPayload = rolesRes.data?.roles ?? rolesRes.data ?? []
      setRoles(Array.isArray(rolesPayload) ? rolesPayload : [])
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : [])
    } catch {
      toast.error('Failed to load roles')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const handleAssign = async (e) => {
    e.preventDefault()
    if (!assignForm.userId || !assignForm.roleId) {
      toast.error('Select user and role')
      return
    }
    setSaving(true)
    try {
      await rolesAPI.assignRole(assignForm.userId, { roleId: parseInt(assignForm.roleId) })
      toast.success('Role assigned')
      setAssignModal(false)
      setAssignForm({ userId: '', roleId: '' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign role')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (userId, userRoleId) => {
    if (!confirm('Remove this role assignment?')) return
    try {
      await rolesAPI.removeRole(userId, userRoleId)
      toast.success('Role removed')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    }
  }

  // Build user→roles index
  const usersByRole = ROLE_TYPES.reduce((acc, rt) => {
    acc[rt] = users.filter((u) => u.role === rt || u.roles?.includes(rt))
    return acc
  }, {})

  const roleColumns = [
    { key: 'roleId',   label: 'ID',    render: (v) => <span className="font-mono">#{v}</span> },
    { key: 'roleType', label: 'Role',  render: (v) => <span className={`px-2 py-0.5 text-xs rounded-full ${ROLE_COLORS[v] || 'bg-gray-50 text-gray-700'}`}>{v}</span> },
    { key: 'roleType', label: 'Users', render: (v) => <span className="text-sm text-gray-600">{usersByRole[v]?.length ?? 0}</span> },
    { key: 'createdAt', label: 'Created', render: (v) => v ? formatISTDate(v) : '—' },
  ]

  if (loading) return <Layout><Loader center /></Layout>

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
            <p className="text-gray-500 text-sm">Manage system roles and user-role assignments</p>
          </div>
          <button onClick={() => setAssignModal(true)} className="btn-primary flex items-center gap-2">
            <UserPlus size={16} /> Assign Role
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {ROLE_TYPES.map((rt) => (
            <div key={rt} className="stat-card">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ROLE_COLORS[rt] || 'bg-gray-50'}`}>
                <Shield size={18} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{usersByRole[rt]?.length ?? 0}</p>
              <p className="text-xs text-gray-500">{rt}</p>
            </div>
          ))}
        </div>

        <Card title="System Roles">
          <Table columns={roleColumns} data={roles} loading={false} emptyMessage="No roles defined" />
        </Card>

        <Card title="Users by Role">
          <div className="space-y-4">
            {ROLE_TYPES.map((rt) => {
              const list = usersByRole[rt] ?? []
              if (list.length === 0) return null
              return (
                <div key={rt}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${ROLE_COLORS[rt]}`}>{rt}</span>
                    <span className="text-xs text-gray-400">{list.length} users</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {list.map((u) => (
                      <div key={u.userId} className="flex items-center justify-between p-2 rounded-lg border border-gray-100 text-sm">
                        <div>
                          <p className="font-medium text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <Modal open={assignModal} onClose={() => setAssignModal(false)} title="Assign Role to User">
        <form onSubmit={handleAssign} className="space-y-4">
          <div>
            <label className="form-label">User</label>
            <select required value={assignForm.userId}
              onChange={(e) => setAssignForm((f) => ({ ...f, userId: e.target.value }))}
              className="form-select">
              <option value="">Select user...</option>
              {users.map((u) => <option key={u.userId} value={u.userId}>{u.name} ({u.email})</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Role</label>
            <select required value={assignForm.roleId}
              onChange={(e) => setAssignForm((f) => ({ ...f, roleId: e.target.value }))}
              className="form-select">
              <option value="">Select role...</option>
              {roles.map((r) => <option key={r.roleId} value={r.roleId}>{r.roleType}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setAssignModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}
