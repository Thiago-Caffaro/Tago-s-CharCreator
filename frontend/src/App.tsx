import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Layout } from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Editor from './pages/Editor'
import Output from './pages/Output'
import GeneratingPage from './pages/GeneratingPage'
import Lorebook from './pages/Lorebook'
import Settings from './pages/Settings'
import Presets from './pages/Presets'

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
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/editor/:projectId" element={<Editor />} />
          <Route path="/editor/:projectId/generating" element={<GeneratingPage />} />
          <Route path="/editor/:projectId/output" element={<Output />} />
          <Route path="/editor/:projectId/lorebook" element={<Lorebook />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/presets" element={<Presets />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
