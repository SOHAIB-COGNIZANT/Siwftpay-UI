import api from './axios'

export const notificationsAPI = {
  create: (data) => api.post('/api/notifications', data),
  getById: (id) => api.get(`/api/notifications/${id}`),
  getByUser: (userId) => api.get(`/api/notifications/user/${userId}`),
  getUnread: (userId) => api.get(`/api/notifications/user/${userId}/unread`),
  getAll: () => api.get('/api/notifications'),
  markRead: (id) => api.put(`/api/notifications/${id}/read`),
  markAllRead: (userId) => api.put(`/api/notifications/user/${userId}/read-all`),
  delete: (id) => api.delete(`/api/notifications/${id}`),
}
