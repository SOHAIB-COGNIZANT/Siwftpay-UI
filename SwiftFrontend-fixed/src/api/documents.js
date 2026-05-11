import api from './axios'

export const documentsAPI = {
  create: (data) => api.post('/api/document', data),
  getById: (id) => api.get(`/api/document/${id}`),
  getByRemittance: (remitId) => api.get(`/api/document?remitId=${remitId}`),
  update: (id, data) => api.put(`/api/document/${id}`, data),
  verify: (id, data) => api.patch(`/api/document/${id}/verify`, data),
  delete: (id) => api.delete(`/api/document/${id}`),
}
