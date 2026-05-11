import api from './axios'

export const refundsAPI = {
  create: (data) => api.post('/api/refundref', data),
  getById: (id) => api.get(`/api/refundref/${id}`),
  getAll: () => api.get('/api/refundref'),
  update: (id, data) => api.put(`/api/refundref/${id}`, data),
  updateStatus: (id, data) => api.patch(`/api/refundref/${id}/status`, data),
  delete: (id) => api.delete(`/api/refundref/${id}`),
}
