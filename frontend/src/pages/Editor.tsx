import React, { useEffect, useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { generationApi } from '../api/generation'
import { ContextCardBoard } from '../components/context-cards/ContextCardBoard'
import { ContextCardEditor } from '../components/context-cards/ContextCardEditor'
import { GenerationPanel } from '../components/generation/GenerationPanel'
import { useCardTypeStore } from '../store/useCardTypeStore'
import { useContextCardStore } from '../store/useContextCardStore'
import { useProjectStore } from '../store/useProjectStore'
import type { GenerationJob } from '../types'

type Tab = 'cards' | 'generate'

export default function Editor() {
  const { projectId } = useParams<{ projectId: string }>()
  const id = Number(projectId)
  const location = useLocation()
  const navigate = useNavigate()
  const { fetchProject } = useProjectStore()
  const { fetchCards, selectedCard, setSelectedCard, updateCard } = useContextCardStore()
  const { fetchTypes } = useCardTypeStore()
  const [tab, setTab] = useState<Tab>(location.pathname.endsWith('/generate') ? 'generate' : 'cards')
  const [latestJob, setLatestJob] = useState<GenerationJob | null>(null)

  useEffect(() => {
    setTab(location.pathname.endsWith('/generate') ? 'generate' : 'cards')
  }, [location.pathname])

  useEffect(() => {
    fetchProject(id)
    fetchCards(id)
    fetchTypes()
    generationApi.listJobs(id).then(jobs => setLatestJob(jobs[0] || null)).catch(() => setLatestJob(null))
  }, [id, fetchCards, fetchProject, fetchTypes])

  const jobIsActive = latestJob?.status === 'queued' || latestJob?.status === 'running'
  const jobIsComplete = latestJob?.status === 'completed'

  return (
    <div className="flex h-full min-h-0 flex-col">
      {(jobIsActive || jobIsComplete) && (
        <button
          type="button"
          onClick={() => navigate(jobIsActive ? `/editor/${id}/generating?job=${latestJob.id}` : `/editor/${id}/output`)}
          className="mx-3 mt-3 flex min-h-11 shrink-0 items-center justify-between gap-3 rounded-lg border border-[#9b59b6]/40 bg-[#9b59b6]/10 px-4 py-2 text-left text-sm text-gray-200 transition-colors hover:bg-[#9b59b6]/20 lg:mx-5"
        >
          <span className="flex min-w-0 items-center gap-2">
            {jobIsActive ? <Loader2 size={17} className="shrink-0 animate-spin text-[#bb7bd0]" /> : <CheckCircle2 size={17} className="shrink-0 text-emerald-400" />}
            <span className="truncate">
              {jobIsActive
                ? `Geração em andamento${latestJob.current_step ? `: ${latestJob.current_step}` : ''}`
                : 'A última geração foi concluída'}
            </span>
          </span>
          <span className="shrink-0 font-medium text-[#c889df]">{jobIsActive ? 'Acompanhar' : 'Ver resultado'}</span>
        </button>
      )}

      <div className="hidden min-h-0 flex-1 lg:flex">
        <ContextCardBoard projectId={id} onSelectCard={setSelectedCard} />
        {selectedCard && (
          <ContextCardEditor
            card={selectedCard}
            onClose={() => setSelectedCard(null)}
            onSave={updateCard}
            desktop
          />
        )}
        <GenerationPanel projectId={id} desktop />
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {tab === 'cards' && <ContextCardBoard projectId={id} onSelectCard={setSelectedCard} />}
          {tab === 'generate' && <GenerationPanel projectId={id} />}
        </div>

        <ContextCardEditor
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onSave={updateCard}
        />
      </div>
    </div>
  )
}
