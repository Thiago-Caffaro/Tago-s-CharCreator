import React, { useEffect, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import {
  LayoutDashboard, PenTool, BookOpen, Settings,
  Layers, BookMarked, FileOutput,
} from 'lucide-react'

const navCls = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
    isActive
      ? 'bg-[#9b59b6]/20 text-[#9b59b6]'
      : 'text-gray-400 hover:text-gray-200 hover:bg-[#242424]'
  }`

/** Sub-nav that slides in when a project is open. */
function ProjectNav({ projectId }: { projectId: string }) {
  const [visible, setVisible] = useState(false)

  // Tiny delay lets React paint the initial collapsed state first so the
  // transition actually plays instead of jumping straight to expanded.
  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(id)
  }, [])

  return (
    <div
      className={`overflow-hidden transition-all duration-200 ease-out ${
        visible ? 'max-h-48 opacity-100 mt-1' : 'max-h-0 opacity-0'
      }`}
    >
      {/* Indented group with a thin left border as visual indicator */}
      <div className="ml-4 pl-3 border-l border-[#2a2a2a] space-y-0.5 pb-1">
        <NavLink to={`/editor/${projectId}`} className={navCls} end>
          <PenTool size={14} />
          Editor
        </NavLink>

        <NavLink to={`/editor/${projectId}/output`} className={navCls}>
          <FileOutput size={14} />
          Output
        </NavLink>

        <NavLink to={`/editor/${projectId}/lorebook`} className={navCls}>
          <BookOpen size={14} />
          Lorebook
        </NavLink>
      </div>
    </div>
  )
}

export function Sidebar() {
  const { projectId } = useParams()

  return (
    <aside className="w-[220px] bg-[#1a1a1a] border-r border-[#2a2a2a] flex flex-col shrink-0">
      <div className="px-5 py-5 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2">
          <Layers size={20} className="text-[#9b59b6]" />
          <span className="font-semibold text-sm text-gray-100">Tago's CharCreator</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <NavLink to="/" className={navCls} end>
          <LayoutDashboard size={15} />
          Dashboard
        </NavLink>

        {/* Project sub-nav animates in when inside a project route */}
        {projectId && <ProjectNav key={projectId} projectId={projectId} />}
      </nav>

      <div className="px-3 py-4 border-t border-[#2a2a2a] space-y-0.5">
        <NavLink to="/presets" className={navCls}>
          <BookMarked size={15} />
          Presets & Tipos
        </NavLink>
        <NavLink to="/settings" className={navCls}>
          <Settings size={15} />
          Configurações
        </NavLink>
      </div>
    </aside>
  )
}
