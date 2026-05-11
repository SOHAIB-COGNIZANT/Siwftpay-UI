import api from './axios'

export const kycDocumentsAPI = {
  // Legacy URI-based create — kept for backward compatibility
  create: (data) => api.post('/api/kycdocuments', data),
  // Real file upload (multipart/form-data). `file` is a File object from <input type="file">.
  upload: ({ file, kycId, docType, notes }) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('kycId', String(kycId))
    fd.append('docType', docType)
    if (notes) fd.append('notes', notes)
    // The axios instance has a default Content-Type: application/json. We have to *delete* it
    // so the browser can set the right multipart/form-data header (with boundary) automatically.
    return api.post('/api/kycdocuments/upload', fd, {
      headers: { 'Content-Type': undefined },
    })
  },
  // Stream the file as a Blob; caller can open it in a new tab via URL.createObjectURL.
  downloadFile: (id) => api.get(`/api/kycdocuments/${id}/file`, { responseType: 'blob' }),
  getById: (id) => api.get(`/api/kycdocuments/${id}`),
  getByKyc: (kycId) => api.get(`/api/kycdocuments/kyc/${kycId}`),
  getAll: () => api.get('/api/kycdocuments'),
  verify: (id, data) => api.patch(`/api/kycdocuments/${id}/verify`, data),
  delete: (id) => api.delete(`/api/kycdocuments/${id}`),
}

// Helper: opens the file in a new browser tab. Works for PDFs and images.
// Auth header is included via axios interceptor; we fetch as Blob then objectURL.
//
// IMPORTANT: window.open() must be called synchronously from the click handler,
// otherwise popup blockers kick in (the user-gesture is "lost" after `await`).
// We open a blank tab first, then redirect it once the blob is ready.
export async function openKycDocument(id) {
  const win = window.open('', '_blank')
  if (win) {
    win.document.write('<title>Loading document…</title><p style="font-family:sans-serif;padding:1em">Loading…</p>')
  }
  try {
    const res = await kycDocumentsAPI.downloadFile(id)
    // Force the Blob's MIME type from the response Content-Type so the browser
    // renders PDF/JPEG inline instead of forcing a download.
    const contentType = res.headers?.['content-type'] || 'application/octet-stream'
    const blob = new Blob([res.data], { type: contentType })
    const url = URL.createObjectURL(blob)
    if (win && !win.closed) {
      win.location.replace(url)
    } else {
      // Popup blocked — fall back to same-tab navigation (user can hit back).
      window.location.href = url
    }
    // Revoke after the new tab has loaded.
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (err) {
    if (win && !win.closed) win.close()
    throw err
  }
}
