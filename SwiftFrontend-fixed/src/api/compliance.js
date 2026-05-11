import api from './axios'

export const complianceAPI = {
  createCheck: (data) => api.post('/api/compliance', data),
  createDecision: (data) => api.post('/api/compliancedecision', data),
  getDecisionsByRemit: (remitId) => api.get(`/api/compliancedecision/remit/${remitId}`),
  getDecisionById: (id) => api.get(`/api/compliancedecision/${id}`),
  updateDecision: (id, data) => api.put(`/api/compliancedecision/${id}`, data),
  deleteDecision: (id) => api.delete(`/api/compliancedecision/${id}`),
}
