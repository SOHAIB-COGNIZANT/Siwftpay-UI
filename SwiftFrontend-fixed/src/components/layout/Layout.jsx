import React, { useState } from 'react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-bg flex">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-64'}`}>
        <Navbar sidebarCollapsed={collapsed} />
        <main className="flex-1 p-6 pt-22 mt-16 min-h-screen overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
