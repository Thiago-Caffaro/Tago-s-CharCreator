import client from './client'
import type { ContextCard, CardType } from '../types'

interface CreateCardData {
  title: string
  card_type: CardType
  content?: string
  is_active?: boolean
  order_index?: number
  target_field?: string
}

export const contextCardsApi = {
  list: (projectId: number) =>
    client.get<ContextCard[]>(`/projects/${projectId}/cards`).then(r => r.data),
  create: (projectId: number, data: CreateCardData) =>
    client.post<ContextCard>(`/projects/${projectId}/cards`, data).then(r => r.data),
  update: (cardId: number, data: Partial<ContextCard>) =>
    client.put<ContextCard>(`/cards/${cardId}`, data).then(r => r.data),
  delete: (cardId: number) => client.delete(`/cards/${cardId}`),
  reorder: (projectId: number, items: { id: number; order_index: number }[]) =>
    client.post(`/projects/${projectId}/cards/reorder`, items),
}
