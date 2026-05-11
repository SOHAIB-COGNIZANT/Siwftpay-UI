import api from './axios'

export const feeRulesAPI = {
  create: (data) => api.post('/api/feerules', data),
  getAll: () => api.get('/api/feerules'),
  update: (id, data) => api.put(`/api/feerules/${id}`, data),
  delete: (id) => api.delete(`/api/feerules/${id}`),
}
