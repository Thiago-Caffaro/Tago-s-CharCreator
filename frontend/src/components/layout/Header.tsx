import React from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, Layers } from 'lucide-react'
import { useProjectStore } from '../../store/useProjectStore'

const ROUTE_LABELS: Record<string, string> = {
  output:   'Output',
  lorebook: 'Lorebook',
  generating: 'Gerando...',
}

export function Header() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const currentProject = useProjectStore(s => s.currentProject)

  // Determine sub-route label (output, lorebook, etc.)
  const segments = location.pathname.split('/')
  const lastSegment = segments[segments.length - 1]
  const subLabel = ROUTE_LABELS[lastSegment]

  if (!projectId || !currentProject) {
    // Global pages — just show the app brand
    return (
      <header className="flex items-center gap-2 px-4 h-12 bg-[#1a1a1a] border-b border-[#2a2a2a] shrink-0"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <Layers size={17} className="text-[#9b59b6]" />
        <span className="text-sm font-semibold text-gray-100">Tago's CharCreator</span>
      </header>
    )
  }

  return (
    <header
      className="flex items-center gap-3 px-3 h-12 bg-[#1a1a1a] border-b border-[#2a2a2a] shrink-0"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
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
            <span className="text-xs text-gray-500 truncate">{currentProject.character_name || currentProject.name}</span>
            <span className="text-gray-600 text-xs">›</span>
            <span className="text-sm font-semibold text-gray-100">{subLabel}</span>
          </div>
        ) : (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-100 truncate">{currentProject.name}</p>
            {currentProject.character_name && (
              <p className="text-xs text-[#9b59b6] truncate leading-none">{currentProject.character_name}</p>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
