import React from 'react'
import { NavLink } from 'react-router-dom'
import { BookMarked, FolderKanban, Settings, UserCircle } from 'lucide-react'

const items = [
  { to: '/', label: 'Projetos', icon: FolderKanban, end: true },
  { to: '/presets', label: 'Presets', icon: BookMarked },
  { to: '/settings', label: 'Config', icon: Settings },
  { to: '/account', label: 'Conta', icon: UserCircle },
]

export function BottomNav() {
  return <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#1a1a1a] border-t border-[#2a2a2a] flex items-start justify-around px-1" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', height: 'calc(60px + env(safe-area-inset-bottom, 0px))' }}>{items.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `min-w-[64px] min-h-[56px] flex flex-col items-center justify-center gap-1 rounded-xl ${isActive ? 'text-[#9b59b6]' : 'text-gray-500'}`}><Icon size={20}/><span className="text-[10px] font-medium">{label}</span></NavLink>)}</nav>
}
