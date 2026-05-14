import React, { useEffect } from 'react'
import { useParams, Outlet } from 'react-router-dom'
import { useProjectStore } from '../store/useProjectStore'
import { useContextCardStore } from '../store/useContextCardStore'
import { ContextCardBoard } from '../components/context-cards/ContextCardBoard'
import { ContextCardEditor } from '../components/context-cards/ContextCardEditor'
import { GenerationPanel } from '../components/generation/GenerationPanel'

export default function Editor() {
  const { projectId } = useParams<{ projectId: string }>()
  const id = Number(projectId)
  const { fetchProject } = useProjectStore()
  const { fetchCards, selectedCard, setSelectedCard, updateCard } = useContextCardStore()

  useEffect(() => {
    fetchProject(id)
    fetchCards(id)
  }, [id])

  return (
    <div className="flex h-full">
      <ContextCardBoard
        projectId={id}
        onSelectCard={setSelectedCard}
      />
      {selectedCard && (
        <ContextCardEditor
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onSave={updateCard}
        />
      )}
      <GenerationPanel projectId={id} />
    </div>
  )
}
