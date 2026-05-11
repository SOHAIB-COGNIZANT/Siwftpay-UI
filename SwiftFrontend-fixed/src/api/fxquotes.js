import api from './axios'

export const fxQuotesAPI = {
  create: (data) => api.post('/api/fxquotes', data),
  getById: (id) => api.get(`/api/fxquotes/${id}`),
  getAll: () => api.get('/api/fxquotes'),
}
