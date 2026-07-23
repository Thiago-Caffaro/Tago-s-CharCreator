import React, { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import toast from 'react-hot-toast'
import type { ContextCard as ContextCardType } from '../../types'
import { ContextCard } from './ContextCard'
import { AddCardMenu } from './AddCardMenu'
import { SearchInput } from '../ui/SearchInput'
import { ConfirmModal } from '../ui/ConfirmModal'
import { useContextCardStore } from '../../store/useContextCardStore'

interface Props {
  projectId: number
  onSelectCard: (card: ContextCardType) => void
}

export function ContextCardBoard({ projectId, onSelectCard }: Props) {
  const { cards, createCard, updateCard, duplicateCard, deleteCard, reorderCards } = useContextCardStore()
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<ContextCardType | null>(null)

  const query = search.trim().toLowerCase()
  const filteredCards = query
    ? cards.filter(c =>
        c.title.toLowerCase().includes(query) ||
        c.content.toLowerCase().includes(query)
      )
    : cards

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = cards.findIndex(c => c.id === active.id)
    const newIndex = cards.findIndex(c => c.id === over.id)
    const newCards = arrayMove(cards, oldIndex, newIndex)
    reorderCards(projectId, newCards)
  }

  const handleAdd = async (type: string, label: string) => {
    try {
      await createCard(projectId, { title: label, card_type: type })
    } catch {
      toast.error('Erro ao criar card')
    }
  }

  const handleToggle = async (card: ContextCardType, active: boolean) => {
    try {
      await updateCard(card.id, { is_active: active })
    } catch {
      toast.error('Erro ao atualizar card')
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await deleteCard(confirmDelete.id)
      toast.success('Card removido')
    } catch {
      toast.error('Erro ao remover card')
    } finally {
      setConfirmDelete(null)
    }
  }

  const handleDuplicate = async (card: ContextCardType) => {
    try {
      await duplicateCard(projectId, card)
      toast.success('Card duplicado')
    } catch {
      toast.error('Erro ao duplicar card')
    }
  }

  return (
    <div className="flex-1 overflow-auto p-5">
      <div className="flex items-center justify-between mb-4 gap-3">
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider shrink-0">
          Context Cards ({cards.filter(c => c.is_active).length}/{cards.length} ativos)
        </span>
        <div className="flex items-center gap-2">
          {cards.length > 0 && (
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar card..." className="w-44" />
          )}
          <AddCardMenu onAdd={handleAdd} />
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={filteredCards.map(c => c.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredCards.map(card => (
              <ContextCard
                key={card.id}
                card={card}
                onSelect={onSelectCard}
                onToggle={handleToggle}
                onDelete={setConfirmDelete}
                onDuplicate={handleDuplicate}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {cards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-gray-500 text-sm">Nenhum context card ainda</p>
          <p className="text-gray-700 text-xs mt-1">Clique em "Adicionar Card" para começar</p>
        </div>
      )}

      {cards.length > 0 && filteredCards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-gray-500 text-sm">Nenhum card encontrado para "{search.trim()}"</p>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        message={<>Deletar o card <strong className="text-white">{confirmDelete?.title}</strong>?</>}
      />
    </div>
  )
}
