import React, { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Layers } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/useAuthStore'

export default function Login() {
  const { user, login, loading } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate(); const location = useLocation()
  if (user) return <Navigate to="/" replace />
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try { await login(username, password); navigate((location.state as any)?.from || '/', { replace: true }) }
    catch (error: any) { toast.error(error?.response?.data?.detail || 'Usuário ou senha inválidos') }
  }
  return <div className="min-h-[100dvh] bg-[#0f0f0f] flex items-center justify-center p-4">
    <form onSubmit={submit} className="w-full max-w-sm bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-5 shadow-2xl">
      <div className="flex items-center gap-3"><Layers className="text-[#9b59b6]" /><div><h1 className="font-semibold text-gray-100">Tago's CharCreator</h1><p className="text-xs text-gray-500">Entre na sua conta interna</p></div></div>
      <label className="block text-xs text-gray-400">Usuário<input autoFocus autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} className="mt-1 w-full min-h-11 bg-[#111] border border-[#333] rounded-xl px-3 text-sm text-white outline-none focus:border-[#9b59b6]" /></label>
      <label className="block text-xs text-gray-400">Senha<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full min-h-11 bg-[#111] border border-[#333] rounded-xl px-3 text-sm text-white outline-none focus:border-[#9b59b6]" /></label>
      <button disabled={loading || !username || !password} className="w-full min-h-11 rounded-xl bg-[#9b59b6] text-white font-medium disabled:opacity-50">{loading ? 'Entrando…' : 'Entrar'}</button>
    </form>
  </div>
}
