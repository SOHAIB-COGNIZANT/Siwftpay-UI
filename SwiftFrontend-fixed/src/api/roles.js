import api from './axios'

export const rolesAPI = {
  getById: (id) => api.get(`/api/roles/${id}`),
  getAll: () => api.get('/api/roles'),
  delete: (id) => api.delete(`/api/roles/${id}`),
  assignRole: (userId, data) => api.post(`/api/roles/users/${userId}/roles`, data),
  removeRole: (userId, userRoleId) =>
    api.delete(`/api/roles/users/${userId}/roles/${userRoleId}`),
  createStaff: (data) => api.post('/api/roles/staff', data),
}
