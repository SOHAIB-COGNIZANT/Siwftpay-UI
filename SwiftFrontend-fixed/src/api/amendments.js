import api from './axios'

export const amendmentsAPI = {
  create: (data) => api.post('/api/amendment', data),
  getById: (id) => api.get(`/api/amendment/${id}`),
  getAll: () => api.get('/api/amendment'),
  update: (id, data) => api.put(`/api/amendment/${id}`, data),
  updateStatus: (id, data) => api.patch(`/api/amendment/${id}/status`, data),
  delete: (id) => api.delete(`/api/amendment/${id}`),
}
