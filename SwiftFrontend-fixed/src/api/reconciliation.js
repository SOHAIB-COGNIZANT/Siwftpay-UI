import api from './axios'

export const reconciliationAPI = {
  reconcileBatch: (batchId) => api.post(`/api/reconciliation/batch/${batchId}`),
  autoReconcile: (type, referenceId) =>
    api.post(`/api/reconciliation/auto/${type}/${referenceId}`),
  getAll: () => api.get('/api/reconciliation'),
  getById: (id) => api.get(`/api/reconciliation/${id}`),
  getMismatches: () => api.get('/api/reconciliation/mismatches'),
  getByType: (type) => api.get(`/api/reconciliation/type/${type}`),
  create: (data) => api.post('/api/reconciliation', data),
  update: (id, data) => api.put(`/api/reconciliation/${id}`, data),
  delete: (id) => api.delete(`/api/reconciliation/${id}`),
}
