import React from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { BookOpen, FileOutput, Layers2, Wand2 } from 'lucide-react'

export function ProjectTabs() {
  const { projectId } = useParams()
  if (!projectId) return null
  const tabs = [
    { to: `/editor/${projectId}`, label: 'Contexto', icon: Layers2, end: true },
    { to: `/editor/${projectId}/generate`, label: 'Gerar', icon: Wand2 },
    { to: `/editor/${projectId}/output`, label: 'Resultado', icon: FileOutput },
    { to: `/editor/${projectId}/lorebook`, label: 'Lorebook', icon: BookOpen },
  ]
  return <nav className="lg:hidden flex bg-[#141414] border-b border-[#2a2a2a] overflow-x-auto shrink-0">{tabs.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `min-w-[88px] min-h-11 flex-1 flex items-center justify-center gap-1.5 px-3 text-xs border-b-2 ${isActive ? 'text-[#9b59b6] border-[#9b59b6]' : 'text-gray-500 border-transparent'}`}><Icon size={14}/>{label}</NavLink>)}</nav>
}
