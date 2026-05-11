import api from './axios'

export const kycAPI = {
  create: (data) => api.post('/api/kycrecords', data),
  getById: (id) => api.get(`/api/kycrecords/${id}`),
  getByUser: (userId) => api.get(`/api/kycrecords/user/${userId}`),
  getAll: () => api.get('/api/kycrecords'),
  getPending: (page = 1, pageSize = 10) =>
    api.get(`/api/kycrecords/pending?pageNumber=${page}&pageSize=${pageSize}`),
  update: (id, data) => api.put(`/api/kycrecords/${id}`, data),
  updateStatus: (id, data) => api.patch(`/api/kycrecords/${id}/status`, data),
  verify: (id) => api.put(`/api/kycrecords/${id}/verify`),
  delete: (id) => api.delete(`/api/kycrecords/${id}`),
}
