import api from './axios'

export const beneficiariesAPI = {
  create: (data) => api.post('/api/beneficiaries', data),
  getById: (id) => api.get(`/api/beneficiaries/${id}`),
  getByCustomer: (customerId) => api.get(`/api/beneficiaries/customer/${customerId}`),
  getAll: () => api.get('/api/beneficiaries'),
  update: (id, data) => api.put(`/api/beneficiaries/${id}`, data),
  updateVerificationStatus: (id, data) =>
    api.patch(`/api/beneficiaries/${id}/verification-status`, data),
  delete: (id) => api.delete(`/api/beneficiaries/${id}`),
}
