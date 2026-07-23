import client from './client'
import type { GenerationRule } from '../types'

export const rulesApi = {
  list: () => client.get<GenerationRule[]>('/rules').then(r => r.data),
  // is_builtin is server-assigned (only the default-rule seeder sets it) — never sent on create
  create: (data: Omit<GenerationRule, 'id' | 'is_builtin'>) =>
    client.post<GenerationRule>('/rules', data).then(r => r.data),
  update: (id: number, data: Partial<GenerationRule>) =>
    client.put<GenerationRule>(`/rules/${id}`, data).then(r => r.data),
  delete: (id: number) => client.delete(`/rules/${id}`),
  reorder: (items: { id: number; order_index: number }[]) =>
    client.post('/rules/reorder', items),
  resetDefaults: () => client.post<GenerationRule[]>('/rules/reset-defaults').then(r => r.data),
}
