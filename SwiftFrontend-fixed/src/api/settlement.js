import api from './axios'

export const settlementAPI = {
  generate: (data) => api.post('/api/settlementbatch/generate', data),
  getById: (id) => api.get(`/api/settlementbatch/${id}`),
  updateStatus: (id, data) => api.patch(`/api/settlementbatch/${id}/status`, data),
}
