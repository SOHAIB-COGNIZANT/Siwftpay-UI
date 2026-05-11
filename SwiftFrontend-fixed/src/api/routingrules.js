import api from './axios'

export const routingRulesAPI = {
  create: (data) => api.post('/api/routingrule', data),
  getById: (id) => api.get(`/api/routingrule/${id}`),
  getAll: () => api.get('/api/routingrule'),
  update: (id, data) => api.put(`/api/routingrule/${id}`, data),
  delete: (id) => api.delete(`/api/routingrule/${id}`),
}
