import api from './axios'

export const payoutInstructionsAPI = {
  create: (data) => api.post('/api/payoutinstruction', data),
  getById: (id) => api.get(`/api/payoutinstruction/${id}`),
  getAll: () => api.get('/api/payoutinstruction'),
  update: (id, data) => api.put(`/api/payoutinstruction/${id}`, data),
  delete: (id) => api.delete(`/api/payoutinstruction/${id}`),
}
