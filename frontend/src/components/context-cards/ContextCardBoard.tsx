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
import { ListChecks, X } from 'lucide-react'
import type { ContextCard as ContextCardType } from '../../types'
import { ContextCard } from './ContextCard'
import { AddCardMenu } from './AddCardMenu'
import { SearchInput } from '../ui/SearchInput'
import { ConfirmModal } from '../ui/ConfirmModal'
import { Button } from '../ui/Button'
import { useContextCardStore } from '../../store/useContextCardStore'

interface Props {
  projectId: number
  onSelectCard: (card: ContextCardType) => void
}

export function ContextCardBoard({ projectId, onSelectCard }: Props) {
  const { cards, createCard, updateCard, duplicateCard, deleteCard, reorderCards } = useContextCardStore()
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<ContextCardType | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [bulkWorking, setBulkWorking] = useState(false)

  const query = search.trim().toLowerCase()
  const filteredCards = query
    ? cards.filter(c =>
        c.title.toLowerCase().includes(query) ||
        c.content.toLowerCase().includes(query)
      )
    : cards

  const selectedCards = cards.filter(c => selectedIds.has(c.id))

  const toggleSelectMode = () => {
    setSelectMode(m => !m)
    setSelectedIds(new Set())
  }

  const toggleCheck = (card: ContextCardType) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(card.id)) next.delete(card.id)
      else next.add(card.id)
      return next
    })
  }

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filteredCards.map(c => c.id)))
  }

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

  const handleBulkToggle = async (active: boolean) => {
    setBulkWorking(true)
    try {
      await Promise.all(selectedCards.map(c => updateCard(c.id, { is_active: active })))
      toast.success(`${selectedCards.length} card(s) ${active ? 'ativado(s)' : 'desativado(s)'}`)
      toggleSelectMode()
    } catch {
      toast.error('Erro ao atualizar cards')
    } finally {
      setBulkWorking(false)
    }
  }

  const handleBulkDelete = async () => {
    setBulkWorking(true)
    try {
      await Promise.all(selectedCards.map(c => deleteCard(c.id)))
      toast.success(`${selectedCards.length} card(s) removido(s)`)
      toggleSelectMode()
    } catch {
      toast.error('Erro ao remover cards')
    } finally {
      setBulkWorking(false)
      setConfirmBulkDelete(false)
    }
  }

  return (
    <div className="flex-1 overflow-auto p-5">
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider shrink-0">
            Context Cards ({cards.filter(c => c.is_active).length}/{cards.length} ativos)
          </span>
          <div className="flex items-center gap-2">
            {cards.length > 0 && (
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar card..." className="w-44" />
            )}
            {cards.length > 0 && (
              <button
                onClick={toggleSelectMode}
                className={`p-1.5 rounded-lg transition-colors ${
                  selectMode ? 'text-[#9b59b6] bg-[#9b59b6]/10' : 'text-gray-500 hover:text-gray-300 hover:bg-[#242424]'
                }`}
                title={selectMode ? 'Cancelar seleção' : 'Selecionar vários'}
              >
                {selectMode ? <X size={15} /> : <ListChecks size={15} />}
              </button>
            )}
            {!selectMode && <AddCardMenu onAdd={handleAdd} />}
          </div>
        </div>

        {selectMode && (
          <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-[#2a2a2a]">
            <span className="text-xs text-gray-400">
              {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
            </span>
            <button onClick={selectAllFiltered} className="text-xs text-[#9b59b6] hover:underline">
              Selecionar todos
            </button>
            <Button size="sm" variant="secondary" disabled={!selectedIds.size || bulkWorking} onClick={() => handleBulkToggle(true)}>
              Ativar
            </Button>
            <Button size="sm" variant="secondary" disabled={!selectedIds.size || bulkWorking} onClick={() => handleBulkToggle(false)}>
              Desativar
            </Button>
            <Button size="sm" variant="danger" disabled={!selectedIds.size || bulkWorking} onClick={() => setConfirmBulkDelete(true)}>
              Deletar
            </Button>
          </div>
        )}
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
                selectMode={selectMode}
                checked={selectedIds.has(card.id)}
                onToggleCheck={toggleCheck}
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

      <ConfirmModal
        open={confirmBulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
        onConfirm={handleBulkDelete}
        message={<>Deletar <strong className="text-white">{selectedCards.length}</strong> card(s) selecionado(s)?</>}
      />
    </div>
  )
}
