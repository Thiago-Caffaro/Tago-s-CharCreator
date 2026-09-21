import React from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Shield } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'

export default function Account() {
  const { user, logout } = useAuthStore(); const navigate = useNavigate()
  return <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-4"><h1 className="text-xl font-semibold">Conta</h1>
    <section className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-5"><p className="font-medium">{user?.username}</p><p className="text-xs text-gray-500 mt-1">{user?.role === 'admin' ? 'Administrador' : 'Usuário'}</p></section>
    {user?.role === 'admin' && <button onClick={() => navigate('/admin')} className="w-full min-h-11 rounded-xl border border-[#333] flex items-center justify-center gap-2 text-sm"><Shield size={16}/> Painel administrativo</button>}
    <button onClick={async () => { await logout(); navigate('/login') }} className="w-full min-h-11 rounded-xl border border-red-900/60 text-red-400 flex items-center justify-center gap-2 text-sm"><LogOut size={16}/> Sair</button>
  </div>
}
