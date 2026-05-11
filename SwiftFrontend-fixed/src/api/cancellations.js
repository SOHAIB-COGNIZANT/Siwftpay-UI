import api from './axios'

export const cancellationsAPI = {
  create: (data) => api.post('/api/cancellation', data),
  getById: (id) => api.get(`/api/cancellation/${id}`),
  getAll: () => api.get('/api/cancellation'),
  update: (id, data) => api.put(`/api/cancellation/${id}`, data),
  updateStatus: (id, data) => api.patch(`/api/cancellation/${id}/status`, data),
  delete: (id) => api.delete(`/api/cancellation/${id}`),
}
