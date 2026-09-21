import client from './client'
import type { AuthUser } from '../types'

export const authApi = {
  me: () => client.get<AuthUser>('/auth/me').then(r => r.data),
  login: (username: string, password: string) => client.post<AuthUser>('/auth/login', { username, password }).then(r => r.data),
  logout: () => client.post('/auth/logout'),
}
