import React from 'react'
import Loader from './Loader'

export default function Table({ columns, data, loading, emptyMessage = 'No records found.' }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="table-th">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center">
                <Loader center />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-10 text-center text-gray-400 text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={i} className="hover:bg-primary-50/30 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="table-td">
                    {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
