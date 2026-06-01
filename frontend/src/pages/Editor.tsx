import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Layers2, Wand2 } from 'lucide-react'
import { useProjectStore } from '../store/useProjectStore'
import { useContextCardStore } from '../store/useContextCardStore'
import { ContextCardBoard } from '../components/context-cards/ContextCardBoard'
import { ContextCardEditor } from '../components/context-cards/ContextCardEditor'
import { GenerationPanel } from '../components/generation/GenerationPanel'

type Tab = 'cards' | 'generate'

export default function Editor() {
  const { projectId } = useParams<{ projectId: string }>()
  const id = Number(projectId)
  const { fetchProject } = useProjectStore()
  const { fetchCards, selectedCard, setSelectedCard, updateCard } = useContextCardStore()
  const [tab, setTab] = useState<Tab>('cards')

  useEffect(() => {
    fetchProject(id)
    fetchCards(id)
  }, [id])

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'cards',    label: 'Context Cards', icon: Layers2 },
    { id: 'generate', label: 'Gerar',          icon: Wand2   },
  ]

  return (
    <div className="flex flex-col h-full">

      {/* Tab bar */}
      <div className="flex border-b border-[#2a2a2a] bg-[#1a1a1a] shrink-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium
              border-b-2 transition-colors
              ${tab === t.id
                ? 'text-[#9b59b6] border-[#9b59b6]'
                : 'text-gray-500 border-transparent active:text-gray-300'
              }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'cards' && (
          <ContextCardBoard projectId={id} onSelectCard={setSelectedCard} />
        )}
        {tab === 'generate' && (
          <GenerationPanel projectId={id} />
        )}
      </div>

      {/* Card editor as full-screen sheet overlay */}
      <ContextCardEditor
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
        onSave={updateCard}
      />
    </div>
  )
}
