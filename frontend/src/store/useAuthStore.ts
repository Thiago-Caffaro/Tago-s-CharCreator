import { create } from 'zustand'
import { authApi } from '../api/auth'
import type { AuthUser } from '../types'

interface AuthStore {
  user: AuthUser | null
  loading: boolean
  initialized: boolean
  initialize: () => Promise<void>
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthStore>(set => ({
  user: null, loading: false, initialized: false,
  initialize: async () => {
    try { set({ user: await authApi.me() }) } catch { set({ user: null }) }
    finally { set({ initialized: true }) }
  },
  login: async (username, password) => {
    set({ loading: true })
    try { set({ user: await authApi.login(username, password), initialized: true }) }
    finally { set({ loading: false }) }
  },
  logout: async () => { try { await authApi.logout() } finally { set({ user: null, initialized: true }) } },
}))
