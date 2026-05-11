import React from 'react'

const STATUS_MAP = {
  // Remittance statuses
  Draft:           'bg-gray-100 text-gray-600',
  Validated:       'bg-blue-100 text-blue-700',
  ComplianceHold:  'bg-yellow-100 text-yellow-700',
  Routing:         'bg-indigo-100 text-indigo-700',
  Queued:          'bg-purple-100 text-purple-700',
  Paid:            'bg-green-100 text-green-700',
  Cancelled:       'bg-red-100 text-red-600',
  Refunded:        'bg-orange-100 text-orange-700',
  // KYC / verification
  Pending:         'bg-yellow-100 text-yellow-700',
  Verified:        'bg-green-100 text-green-700',
  Rejected:        'bg-red-100 text-red-600',
  // Compliance
  Clear:           'bg-green-100 text-green-700',
  Flag:            'bg-yellow-100 text-yellow-700',
  Hold:            'bg-red-100 text-red-600',
  Approve:         'bg-green-100 text-green-700',
  // Settlement
  Open:            'bg-gray-100 text-gray-600',
  Posted:          'bg-blue-100 text-blue-700',
  Reconciled:      'bg-green-100 text-green-700',
  // Recon
  Matched:         'bg-green-100 text-green-700',
  Mismatched:      'bg-red-100 text-red-600',
  // General
  Active:          'bg-green-100 text-green-700',
  Expired:         'bg-red-100 text-red-600',
  Locked:          'bg-blue-100 text-blue-700',
  Released:        'bg-gray-100 text-gray-500',
  // Severity
  Low:             'bg-green-100 text-green-700',
  Medium:          'bg-yellow-100 text-yellow-700',
  High:            'bg-red-100 text-red-600',
  // Partner status
  Sent:            'bg-blue-100 text-blue-700',
  Ack:             'bg-indigo-100 text-indigo-700',
  Settled:         'bg-green-100 text-green-700',
}

export default function StatusBadge({ status, className = '' }) {
  const cls = STATUS_MAP[status] || 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls} ${className}`}>
      {status}
    </span>
  )
}
