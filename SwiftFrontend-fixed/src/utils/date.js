// Dates stored as UTC in the backend. Display in the browser's LOCAL timezone (user's PC time).

// "06 May 2026, 09:13 AM"
export function formatIST(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime()) || d.getFullYear() < 2000) return '—'
  return d.toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

// "06 May 2026"
export function formatISTDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime()) || d.getFullYear() < 2000) return '—'
  return d.toLocaleDateString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// "09:13 AM"
export function formatISTTime(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime()) || d.getFullYear() < 2000) return '—'
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

// How long ago — "3 hours ago" / "just now"
export function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime()) || d.getFullYear() < 2000) return '—'
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}