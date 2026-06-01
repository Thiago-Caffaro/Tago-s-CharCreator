import React, { useState } from 'react'
import { NavLink, useParams, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, PenTool, FileOutput, BookOpen,
  BookMarked, Settings, MoreHorizontal,
} from 'lucide-react'
import { BottomSheet } from '../ui/BottomSheet'

const navCls = ({ isActive }: { isActive: boolean }) =>
  `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors min-w-[56px] ${
    isActive
      ? 'text-[#9b59b6]'
      : 'text-gray-500 active:text-gray-300'
  }`

const iconSize = 20

export function BottomNav() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#1a1a1a] border-t border-[#2a2a2a]
          flex items-center justify-around px-2"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 8px)',
          height: 'calc(56px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {projectId ? (
          /* ── In-project navigation ── */
          <>
            <NavLink to="/" end className={navCls}>
              <LayoutDashboard size={iconSize} />
              <span className="text-[10px] font-medium">Início</span>
            </NavLink>

            <NavLink to={`/editor/${projectId}`} end className={navCls}>
              <PenTool size={iconSize} />
              <span className="text-[10px] font-medium">Editor</span>
            </NavLink>

            <NavLink to={`/editor/${projectId}/output`} className={navCls}>
              <FileOutput size={iconSize} />
              <span className="text-[10px] font-medium">Output</span>
            </NavLink>

            <button
              onClick={() => setMoreOpen(true)}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-gray-500 active:text-gray-300 min-w-[56px]"
            >
              <MoreHorizontal size={iconSize} />
              <span className="text-[10px] font-medium">Mais</span>
            </button>
          </>
        ) : (
          /* ── Global navigation ── */
          <>
            <NavLink to="/" end className={navCls}>
              <LayoutDashboard size={iconSize} />
              <span className="text-[10px] font-medium">Projetos</span>
            </NavLink>

            <NavLink to="/presets" className={navCls}>
              <BookMarked size={iconSize} />
              <span className="text-[10px] font-medium">Presets</span>
            </NavLink>

            <NavLink to="/settings" className={navCls}>
              <Settings size={iconSize} />
              <span className="text-[10px] font-medium">Config</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* "Mais" bottom sheet (project context) */}
      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Mais opções">
        <div className="px-3 py-3 space-y-1">
          {[
            { icon: BookOpen, label: 'Lorebook', path: `/editor/${projectId}/lorebook` },
            { icon: BookMarked, label: 'Presets & Tipos', path: '/presets' },
            { icon: Settings, label: 'Configurações', path: '/settings' },
          ].map(({ icon: Icon, label, path }) => (
            <button
              key={path}
              onClick={() => { setMoreOpen(false); navigate(path) }}
              className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl
                bg-[#242424] active:bg-[#2a2a2a] transition-colors text-left"
            >
              <Icon size={20} className="text-[#9b59b6] shrink-0" />
              <span className="text-sm font-medium text-gray-200">{label}</span>
            </button>
          ))}
        </div>
        <div className="h-3" />
      </BottomSheet>
    </>
  )
}
