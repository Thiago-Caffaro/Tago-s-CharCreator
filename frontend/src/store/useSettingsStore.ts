import { create } from 'zustand'
import client from '../api/client'
import type { AppSettings } from '../types'

interface SettingsStore {
  settings: AppSettings | null
  fetchSettings: () => Promise<void>
  updateSettings: (data: Partial<AppSettings> & { openrouter_api_key?: string }) => Promise<void>
}

export const useSettingsStore = create<SettingsStore>(set => ({
  settings: null,

  fetchSettings: async () => {
    const res = await client.get<AppSettings>('/settings')
    set({ settings: res.data })
  },

  updateSettings: async (data) => {
    await client.put('/settings', data)
    const res = await client.get<AppSettings>('/settings')
    set({ settings: res.data })
  },
}))
