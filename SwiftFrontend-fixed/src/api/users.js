import api from './axios'

export const usersAPI = {
  create: (data) => api.post('/api/users', data),
  getById: (userId) => api.get(`/api/users/${userId}`),
  getByEmail: (email) => api.get(`/api/users/email/${email}`),
  getAll: () => api.get('/api/users'),
  update: (userId, data) => api.put(`/api/users/${userId}`, data),
  delete: (userId) => api.delete(`/api/users/${userId}`),
}
