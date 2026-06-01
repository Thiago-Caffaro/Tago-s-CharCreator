import React from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react'
import { useProjectStore } from '../../store/useProjectStore'

const ROUTE_LABELS: Record<string, string> = {
  output:     'Output',
  lorebook:   'Lorebook',
  generating: 'Gerando...',
}

export function Header() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const currentProject = useProjectStore(s => s.currentProject)

  const segments = location.pathname.split('/')
  const lastSegment = segments[segments.length - 1]
  const subLabel = ROUTE_LABELS[lastSegment]

  return (
    <header className="bg-[#1a1a1a] border-b border-[#2a2a2a] shrink-0 flex items-center"
      style={{ height: '48px', paddingTop: 'env(safe-area-inset-top, 0px)' }}>

      {/* ── Desktop: breadcrumb (hidden on mobile) ── */}
      <div className="hidden lg:flex items-center gap-2 px-5 w-full">
        {projectId && currentProject ? (
          <>
            <Link to="/" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
              Projetos
            </Link>
            <ChevronRight size={12} className="text-gray-600" />
            <span className="text-xs text-gray-300 font-medium">{currentProject.name}</span>
            {currentProject.character_name && (
              <>
                <ChevronRight size={12} className="text-gray-600" />
                <span className="text-xs text-[#9b59b6]">{currentProject.character_name}</span>
              </>
            )}
            {subLabel && (
              <>
                <ChevronRight size={12} className="text-gray-600" />
                <span className="text-xs text-gray-400">{subLabel}</span>
              </>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Layers size={15} className="text-[#9b59b6]" />
            <span className="text-xs text-gray-500">Tago's CharCreator</span>
          </div>
        )}
      </div>

      {/* ── Mobile: back button + project info (hidden on desktop) ── */}
      <div className="flex lg:hidden items-center gap-3 px-3 w-full">
        {projectId && currentProject ? (
          <>
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400
                active:bg-[#242424] transition-colors shrink-0"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex-1 min-w-0">
              {subLabel ? (
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <span className="text-xs text-gray-500 truncate">
                    {currentProject.character_name || currentProject.name}
                  </span>
                  <span className="text-gray-600 text-xs">›</span>
                  <span className="text-sm font-semibold text-gray-100">{subLabel}</span>
                </div>
              ) : (
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-100 truncate">{currentProject.name}</p>
                  {currentProject.character_name && (
                    <p className="text-xs text-[#9b59b6] truncate leading-none">
                      {currentProject.character_name}
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Layers size={17} className="text-[#9b59b6]" />
            <span className="text-sm font-semibold text-gray-100">Tago's CharCreator</span>
          </>
        )}
      </div>
    </header>
  )
}
