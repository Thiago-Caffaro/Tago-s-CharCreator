import { create } from 'zustand'
import { cardTypesApi, type CardTypeConfig } from '../api/cardTypes'

interface CardTypeStore {
  types: CardTypeConfig[]
  fetchTypes: () => Promise<void>
}

export const useCardTypeStore = create<CardTypeStore>(set => ({
  types: [],
  fetchTypes: async () => {
    const types = await cardTypesApi.list().catch(() => [])
    set({ types })
  },
}))
