import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useProjectStore } from '../../store/useProjectStore'

export function Header() {
  const { projectId } = useParams()
  const currentProject = useProjectStore(s => s.currentProject)

  return (
    <header className="h-12 bg-[#1a1a1a] border-b border-[#2a2a2a] flex items-center px-5 gap-2 shrink-0">
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
        </>
      ) : (
        <span className="text-xs text-gray-500">Tago's CharCreator</span>
      )}
    </header>
  )
}
