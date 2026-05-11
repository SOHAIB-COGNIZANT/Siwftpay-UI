import api from './axios'

export const reportsAPI = {
  create: (data) => api.post('/api/remitreport', data),
  getById: (id) => api.get(`/api/remitreport/${id}`),
  getAll: () => api.get('/api/remitreport'),
  update: (id, data) => api.put(`/api/remitreport/${id}`, data),
  delete: (id) => api.delete(`/api/remitreport/${id}`),
}
