import React from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { LayoutDashboard, PenTool, BookOpen, Settings, Layers, BookMarked } from 'lucide-react'

export function Sidebar() {
  const { projectId } = useParams()

  return (
    <aside className="w-[240px] bg-[#1a1a1a] border-r border-[#2a2a2a] flex flex-col shrink-0">
      <div className="px-5 py-5 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2">
          <Layers size={20} className="text-[#9b59b6]" />
          <span className="font-semibold text-sm text-gray-100">Tago's CharCreator</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive ? 'bg-[#9b59b6]/20 text-[#9b59b6]' : 'text-gray-400 hover:text-gray-200 hover:bg-[#242424]'
            }`
          }
          end
        >
          <LayoutDashboard size={16} />
          Dashboard
        </NavLink>

        {projectId && (
          <>
            <NavLink
              to={`/editor/${projectId}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-[#9b59b6]/20 text-[#9b59b6]' : 'text-gray-400 hover:text-gray-200 hover:bg-[#242424]'
                }`
              }
              end
            >
              <PenTool size={16} />
              Editor
            </NavLink>

            <NavLink
              to={`/editor/${projectId}/output`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-[#9b59b6]/20 text-[#9b59b6]' : 'text-gray-400 hover:text-gray-200 hover:bg-[#242424]'
                }`
              }
            >
              <LayoutDashboard size={16} />
              Output
            </NavLink>

            <NavLink
              to={`/editor/${projectId}/lorebook`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-[#9b59b6]/20 text-[#9b59b6]' : 'text-gray-400 hover:text-gray-200 hover:bg-[#242424]'
                }`
              }
            >
              <BookOpen size={16} />
              Lorebook
            </NavLink>
          </>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-[#2a2a2a] space-y-1">
        <NavLink
          to="/presets"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive ? 'bg-[#9b59b6]/20 text-[#9b59b6]' : 'text-gray-400 hover:text-gray-200 hover:bg-[#242424]'
            }`
          }
        >
          <BookMarked size={16} />
          Presets & Tipos
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive ? 'bg-[#9b59b6]/20 text-[#9b59b6]' : 'text-gray-400 hover:text-gray-200 hover:bg-[#242424]'
            }`
          }
        >
          <Settings size={16} />
          Configurações
        </NavLink>
      </div>
    </aside>
  )
}
