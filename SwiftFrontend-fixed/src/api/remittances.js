import api from './axios'

export const remittancesAPI = {
  create: (data) => api.post('/api/remittances', data),
  uploadDocument: (remitId, data) => api.post(`/api/remittances/${remitId}/documents`, data),
  validate: (remitId) => api.post(`/api/remittances/${remitId}/validate`),
  getAll: () => api.get('/api/remittances'),
  getById: (id) => api.get(`/api/remittances/${id}`),
  getValidations: (id) => api.get(`/api/remittances/${id}/validations`),
  updateValidation: (validationId, data) =>
    api.put(`/api/remittances/validations/${validationId}`, data),
  updateVerificationStatus: (id, data) =>
    api.put(`/api/remittances/${id}/verification-status`, data),
  // Agent / Admin actions
  approve: (id) => api.post(`/api/remittances/${id}/approve`),
  reject: (id, reason) => api.post(`/api/remittances/${id}/reject`, { reason }),
  delete: (id) => api.delete(`/api/remittances/${id}`),
}
