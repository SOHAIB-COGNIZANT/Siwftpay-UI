import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0B4FCC',
              color: '#fff',
              borderRadius: '10px',
              fontSize: '14px',
            },
            success: {
              style: { background: '#16A34A' },
              iconTheme: { primary: '#fff', secondary: '#16A34A' },
            },
            error: {
              style: { background: '#DC2626' },
              iconTheme: { primary: '#fff', secondary: '#DC2626' },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
