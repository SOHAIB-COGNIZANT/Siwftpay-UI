import api from './axios'

export const rateLocksAPI = {
  create: (data) => api.post('/api/ratelocks', data),
  getById: (id) => api.get(`/api/ratelocks/${id}`),
  getAll: () => api.get('/api/ratelocks'),
}
