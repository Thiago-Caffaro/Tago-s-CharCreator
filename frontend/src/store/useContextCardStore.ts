import { create } from 'zustand'
import { contextCardsApi } from '../api/contextCards'
import type { ContextCard, CardType } from '../types'

interface ContextCardStore {
  cards: ContextCard[]
  selectedCard: ContextCard | null
  loading: boolean
  fetchCards: (projectId: number) => Promise<void>
  createCard: (projectId: number, data: { title: string; card_type: CardType }) => Promise<void>
  updateCard: (cardId: number, data: Partial<ContextCard>) => Promise<void>
  deleteCard: (cardId: number) => Promise<void>
  reorderCards: (projectId: number, cards: ContextCard[]) => Promise<void>
  setSelectedCard: (card: ContextCard | null) => void
}

export const useContextCardStore = create<ContextCardStore>((set, get) => ({
  cards: [],
  selectedCard: null,
  loading: false,

  fetchCards: async (projectId) => {
    set({ loading: true })
    try {
      const cards = await contextCardsApi.list(projectId)
      set({ cards })
    } finally {
      set({ loading: false })
    }
  },

  createCard: async (projectId, data) => {
    const card = await contextCardsApi.create(projectId, {
      ...data,
      order_index: get().cards.length,
    })
    set(s => ({ cards: [...s.cards, card] }))
  },

  updateCard: async (cardId, data) => {
    const updated = await contextCardsApi.update(cardId, data)
    set(s => ({
      cards: s.cards.map(c => (c.id === cardId ? updated : c)),
      selectedCard: s.selectedCard?.id === cardId ? updated : s.selectedCard,
    }))
  },

  deleteCard: async (cardId) => {
    await contextCardsApi.delete(cardId)
    set(s => ({
      cards: s.cards.filter(c => c.id !== cardId),
      selectedCard: s.selectedCard?.id === cardId ? null : s.selectedCard,
    }))
  },

  reorderCards: async (projectId, cards) => {
    set({ cards })
    const items = cards.map((c, i) => ({ id: c.id, order_index: i }))
    await contextCardsApi.reorder(projectId, items)
  },

  setSelectedCard: (card) => set({ selectedCard: card }),
}))
