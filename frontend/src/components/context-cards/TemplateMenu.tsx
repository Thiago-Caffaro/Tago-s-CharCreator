import React, { useState, useRef, useEffect } from 'react'
import { LayoutTemplate } from 'lucide-react'
import { projectTemplatesApi } from '../../api/projectTemplates'
import type { ProjectTemplate } from '../../types'

interface Props {
  onApply: (template: ProjectTemplate) => void
}

export function TemplateMenu({ onApply }: Props) {
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = () => {
    setOpen(v => !v)
    if (!open && templates.length === 0) {
      setLoading(true)
      projectTemplatesApi.list().then(setTemplates).finally(() => setLoading(false))
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[#242424] transition-colors"
        onClick={handleOpen}
        title="Aplicar template"
      >
        <LayoutTemplate size={15} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-[#1e1e1e] border border-[#333] rounded-xl shadow-xl z-10 py-1 overflow-hidden max-h-72 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-4">
              <span className="w-4 h-4 border-2 border-[#9b59b6] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <p className="px-3 py-3 text-[11px] text-gray-600">
              Nenhum template ainda — salve a estrutura de um projeto como template primeiro.
            </p>
          ) : (
            templates.map(t => (
              <button
                key={t.id}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-[#242424] transition-colors"
                onClick={() => { onApply(t); setOpen(false) }}
              >
                <span className="truncate">{t.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
