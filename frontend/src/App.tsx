import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Layout } from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Editor from './pages/Editor'
import Output from './pages/Output'
import GeneratingPage from './pages/GeneratingPage'
import Lorebook from './pages/Lorebook'
import Settings from './pages/Settings'
import Presets from './pages/Presets'
import Login from './pages/Login'
import Account from './pages/Account'
import Admin from './pages/Admin'
import { useAuthStore } from './store/useAuthStore'

function Protected({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  const { user, initialized, initialize } = useAuthStore(); const location = useLocation()
  useEffect(() => { if (!initialized) initialize() }, [initialized])
  if (!initialized) return <div className="h-[100dvh] bg-[#0f0f0f] flex items-center justify-center text-gray-500">Carregando…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (admin && user.role !== 'admin') return <Navigate to="/account" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1e1e1e',
            color: '#e5e5e5',
            border: '1px solid #333',
            fontSize: '13px',
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Protected><Layout /></Protected>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/editor/:projectId" element={<Editor />} />
          <Route path="/editor/:projectId/generate" element={<Editor />} />
          <Route path="/editor/:projectId/generating" element={<GeneratingPage />} />
          <Route path="/editor/:projectId/output" element={<Output />} />
          <Route path="/editor/:projectId/lorebook" element={<Lorebook />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/presets" element={<Presets />} />
          <Route path="/account" element={<Account />} />
          <Route path="/admin" element={<Protected admin><Admin /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
