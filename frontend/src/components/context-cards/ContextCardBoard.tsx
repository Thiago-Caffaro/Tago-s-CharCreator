import React from 'react'
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
import type { ContextCard as ContextCardType, CardType } from '../../types'
import { ContextCard } from './ContextCard'
import { AddCardMenu } from './AddCardMenu'
import { useContextCardStore } from '../../store/useContextCardStore'

interface Props {
  projectId: number
  onSelectCard: (card: ContextCardType) => void
}

export function ContextCardBoard({ projectId, onSelectCard }: Props) {
  const { cards, createCard, updateCard, deleteCard, reorderCards } = useContextCardStore()

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

  const handleAdd = async (type: CardType) => {
    try {
      await createCard(projectId, { title: type.replace('_', ' '), card_type: type })
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

  const handleDelete = async (card: ContextCardType) => {
    try {
      await deleteCard(card.id)
      toast.success('Card removido')
    } catch {
      toast.error('Erro ao remover card')
    }
  }

  return (
    <div className="flex-1 overflow-auto p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
          Context Cards ({cards.filter(c => c.is_active).length}/{cards.length} ativos)
        </span>
        <AddCardMenu onAdd={handleAdd} />
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={cards.map(c => c.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {cards.map(card => (
              <ContextCard
                key={card.id}
                card={card}
                onSelect={onSelectCard}
                onToggle={handleToggle}
                onDelete={handleDelete}
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
    </div>
  )
}
