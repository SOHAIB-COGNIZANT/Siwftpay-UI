import React, { useEffect, useState } from 'react'
import { usersAPI } from '../../api/users'
import { rolesAPI } from '../../api/roles'
import Layout from '../../components/layout/Layout'
import Card from '../../components/common/Card'
import Table from '../../components/common/Table'
import Modal from '../../components/common/Modal'
import StatusBadge from '../../components/common/StatusBadge'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, Search, UserPlus, Shield } from 'lucide-react'

const ROLES = ['Admin', 'Customer', 'Agent', 'Compliance', 'Ops', 'Treasury']

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [staffModalOpen, setStaffModalOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', status: 'Active' })
  const [staffForm, setStaffForm] = useState({ name: '', email: '', phone: '', password: '', role: 'Compliance' })
  const [saving, setSaving] = useState(false)

  const load = () => {
    usersAPI.getAll()
      .then((r) => setUsers(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openEdit = (u) => { setEditUser(u); setForm({ name: u.name, email: u.email, phone: u.phone, status: u.status }); setModalOpen(true) }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await usersAPI.update(editUser.userId, form)
      toast.success('User updated')
      setModalOpen(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this user?')) return
    try {
      await usersAPI.delete(id)
      toast.success('User deactivated')
      load()
    } catch { toast.error('Failed') }
  }

  const handleCreateStaff = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await rolesAPI.createStaff(staffForm)
      toast.success('Staff user created')
      setStaffModalOpen(false)
      setStaffForm({ name: '', email: '', phone: '', password: '', role: 'Compliance' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const filtered = users.filter((u) =>
    !search || `${u.name} ${u.email} ${u.userId}`.toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    { key: 'userId', label: 'ID',     render: (v) => <span className="font-mono">#{v}</span> },
    { key: 'name',   label: 'Name' },
    { key: 'email',  label: 'Email',  render: (v) => <span className="text-xs text-gray-600">{v}</span> },
    { key: 'phone',  label: 'Phone',  render: (v) => <span className="text-xs">{v || '—'}</span> },
    // Backend returns roles:[{roleType}] array, not a single 'role' field
    { key: 'roles',  label: 'Role',   render: (v, row) => {
        const roleStr = row.role ?? (Array.isArray(v) && v.length > 0 ? (v[0].roleType ?? v[0].RoleType ?? v[0]) : null)
        return roleStr ? <span className="px-2 py-0.5 bg-primary-50 text-primary-700 text-xs rounded-full">{roleStr}</span> : '—'
      }
    },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v || 'Active'} /> },
    { key: 'userId', label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-2">
          <button onClick={() => openEdit(row)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600"><Edit2 size={13} /></button>
          <button onClick={() => handleDelete(row.userId)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={13} /></button>
        </div>
      )
    },
  ]

  if (loading) return <Layout><Loader center /></Layout>

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-500 text-sm">{users.length} registered users</p>
          </div>
          <button onClick={() => setStaffModalOpen(true)} className="btn-primary flex items-center gap-2">
            <UserPlus size={16} /> Create Staff
          </button>
        </div>

        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search users..." value={search}
                onChange={(e) => setSearch(e.target.value)} className="form-input pl-9" />
            </div>
          </div>
          <Table columns={columns} data={filtered} loading={false} emptyMessage="No users found" />
        </Card>
      </div>

      {/* Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`Edit User – #${editUser?.userId}`}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="form-label">Full Name</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="form-input" />
          </div>
          <div>
            <label className="form-label">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="form-input" />
          </div>
          <div>
            <label className="form-label">Phone</label>
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="form-input" />
          </div>
          <div>
            <label className="form-label">Status</label>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="form-select">
              {['Active', 'Locked', 'Disabled'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Update'}</button>
          </div>
        </form>
      </Modal>

      {/* Create Staff Modal */}
      <Modal open={staffModalOpen} onClose={() => setStaffModalOpen(false)} title="Create Staff User">
        <form onSubmit={handleCreateStaff} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Full Name *</label>
              <input required value={staffForm.name} onChange={(e) => setStaffForm((f) => ({ ...f, name: e.target.value }))} className="form-input" />
            </div>
            <div>
              <label className="form-label">Email *</label>
              <input type="email" required value={staffForm.email} onChange={(e) => setStaffForm((f) => ({ ...f, email: e.target.value }))} className="form-input" />
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input value={staffForm.phone} onChange={(e) => setStaffForm((f) => ({ ...f, phone: e.target.value }))} className="form-input" />
            </div>
            <div>
              <label className="form-label">Role *</label>
              <select value={staffForm.role} onChange={(e) => setStaffForm((f) => ({ ...f, role: e.target.value }))} className="form-select">
                {['Agent', 'Compliance', 'Ops', 'Treasury', 'Admin'].map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="form-label">Password *</label>
              <input type="password" required minLength={8} value={staffForm.password}
                onChange={(e) => setStaffForm((f) => ({ ...f, password: e.target.value }))} className="form-input" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setStaffModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Shield size={14} /> {saving ? 'Creating...' : 'Create Staff User'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}
