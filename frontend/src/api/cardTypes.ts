import client from './client'

export interface CardTypeConfig {
  id: number
  slug: string
  label: string
  color: string
  is_builtin: boolean
  order_index: number
}

export const cardTypesApi = {
  list: () => client.get<CardTypeConfig[]>('/card-types').then(r => r.data),
  create: (data: { slug: string; label: string; color: string; order_index?: number }) =>
    client.post<CardTypeConfig>('/card-types', data).then(r => r.data),
  update: (id: number, data: Partial<Pick<CardTypeConfig, 'label' | 'color' | 'order_index'>>) =>
    client.put<CardTypeConfig>(`/card-types/${id}`, data).then(r => r.data),
  delete: (id: number) => client.delete(`/card-types/${id}`),
}
