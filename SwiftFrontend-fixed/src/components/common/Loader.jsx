import React from 'react'

export default function Loader({ size = 'md', center = false }) {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' }
  const el = (
    <div className={`${sizes[size]} border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin`}
      style={{ borderWidth: '3px' }} />
  )
  if (center) return <div className="flex items-center justify-center py-12">{el}</div>
  return el
}
