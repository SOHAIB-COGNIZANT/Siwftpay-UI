import api from './axios'

export const auditLogsAPI = {
  getFiltered: (params) => api.get('/api/auditlogs/filter', { params }),
  getById: (id) => api.get(`/api/auditlogs/${id}`),
  getByUser: (userId) => api.get(`/api/auditlogs/user/${userId}`),
  getByResource: (resource) => api.get(`/api/auditlogs/resource/${resource}`),
  getAll: () => api.get('/api/auditlogs'),
  getByDateRange: (startDate, endDate) =>
    api.get(`/api/auditlogs/date-range?startDate=${startDate}&endDate=${endDate}`),
  delete: (id) => api.delete(`/api/auditlogs/${id}`),
}
