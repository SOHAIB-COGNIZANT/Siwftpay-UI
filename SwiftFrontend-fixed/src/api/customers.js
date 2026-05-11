import api from './axios'

export const customersAPI = {
  create: (data) => api.post('/api/customers', data),
  getById: (id) => api.get(`/api/customers/${id}`),
  getByUserId: (userId) => api.get(`/api/customers/user/${userId}`),
  getAll: () => api.get('/api/customers'),
  getRemittances: (customerId, page = 1, pageSize = 10) =>
    api.get(`/api/customers/${customerId}/remittances?page=${page}&limit=${pageSize}`),
  update: (id, data) => api.put(`/api/customers/${id}`, data),
  updateRiskRating: (id, data) => api.patch(`/api/customers/${id}/risk-rating`, data),
  delete: (id) => api.delete(`/api/customers/${id}`),
  deleteMe: () => api.delete('/api/customers/me'),
}
