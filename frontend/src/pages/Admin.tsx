import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import client from '../api/client'
import type { AuthUser } from '../types'

interface StatsRow {
  user: AuthUser
  default_model: string
  last_model?: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  real_tokens: number
  estimated_tokens: number
  estimated_calls: number
  active_job?: { id: number; project_id?: number; kind: string; status: string; current_step?: string }
  jobs: Record<string, number>
}

interface UsageRow {
  id: number
  job_id: number
  project_name: string
  step?: string
  model: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  is_estimated: boolean
  created_at: string
}

export default function Admin() {
  const [rows, setRows] = useState<StatsRow[]>([])
  const [details, setDetails] = useState<Record<number, UsageRow[]>>({})
  const [openUser, setOpenUser] = useState<number | null>(null)
  const [days, setDays] = useState('30')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const stats = await client.get('/admin/stats', { params: days ? { days } : {} })
    setRows(stats.data.users)
    setDetails({})
    setOpenUser(null)
  }

  useEffect(() => {
    load().catch(() => toast.error('Não foi possível carregar o painel'))
  }, [days])

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      await client.post('/admin/users', { username, password })
      setUsername('')
      setPassword('')
      await load()
      toast.success('Usuário criado')
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Erro ao criar usuário')
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (user: AuthUser) => {
    try {
      await client.patch(`/admin/users/${user.id}`, { is_active: !user.is_active })
      await load()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Erro ao atualizar usuário')
    }
  }

  const resetPassword = async (user: AuthUser) => {
    const nextPassword = window.prompt(`Nova senha para ${user.username}:`)
    if (!nextPassword) return
    if (nextPassword.length < 4) {
      toast.error('Use pelo menos 4 caracteres')
      return
    }
    try {
      await client.patch(`/admin/users/${user.id}`, { password: nextPassword })
      toast.success('Senha redefinida')
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Erro ao redefinir senha')
    }
  }

  const showDetails = async (userId: number) => {
    if (openUser === userId) {
      setOpenUser(null)
      return
    }
    setOpenUser(userId)
    if (details[userId]) return
    try {
      const response = await client.get('/admin/usage', { params: { user_id: userId, ...(days ? { days } : {}) } })
      setDetails(current => ({ ...current, [userId]: response.data.usage }))
    } catch {
      toast.error('Não foi possível carregar o detalhamento')
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-6">
      <div className="flex items-end justify-between gap-3">
        <div><h1 className="text-xl font-semibold">Administração</h1><p className="text-xs text-gray-500">Contas, modelos e consumo acumulado</p></div>
        <label className="text-[10px] text-gray-500">Período
          <select value={days} onChange={event => setDays(event.target.value)} className="mt-1 block min-h-11 rounded-xl border border-[#333] bg-[#1a1a1a] px-3 text-xs">
            <option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option><option value="">Todo o período</option>
          </select>
        </label>
      </div>

      <form onSubmit={createUser} className="grid grid-cols-1 gap-3 rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 sm:grid-cols-[1fr_1fr_auto]">
        <input placeholder="Novo usuário" value={username} onChange={event => setUsername(event.target.value)} className="min-h-11 rounded-xl border border-[#333] bg-[#111] px-3 text-sm" />
        <input type="password" placeholder="Senha inicial" value={password} onChange={event => setPassword(event.target.value)} className="min-h-11 rounded-xl border border-[#333] bg-[#111] px-3 text-sm" />
        <button disabled={saving || !username || password.length < 4} className="min-h-11 rounded-xl bg-[#9b59b6] px-4 text-sm disabled:opacity-50">Criar conta</button>
      </form>

      <div className="space-y-3">
        {rows.map(row => (
          <article key={row.user.id} className="overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a]">
            <div className="grid grid-cols-1 items-center gap-4 p-4 lg:grid-cols-[1.2fr_1.5fr_2fr_auto]">
              <div><p className="font-medium">{row.user.username}</p><p className="text-xs text-gray-500">{row.user.role} · {row.user.is_active ? 'ativo' : 'desativado'}</p></div>
              <div className="min-w-0"><p className="text-[10px] uppercase text-gray-600">Modelo atual</p><p className="truncate font-mono text-xs">{row.last_model || row.default_model}</p>{row.active_job && <p className="mt-1 text-[10px] text-amber-400">Job #{row.active_job.id}: {row.active_job.current_step || row.active_job.status}</p>}</div>
              <div className="grid grid-cols-3 gap-2"><Metric label="Entrada" value={row.prompt_tokens} /><Metric label="Saída" value={row.completion_tokens} /><Metric label="Total" value={row.total_tokens} /><p className="col-span-3 text-[10px] text-gray-600">{row.real_tokens.toLocaleString('pt-BR')} reais · {row.estimated_tokens.toLocaleString('pt-BR')} estimados ({row.estimated_calls} chamadas) · {row.jobs.completed || 0} concluídos · {row.jobs.failed || 0} falhos</p></div>
              <div className="flex flex-wrap gap-2 lg:flex-col"><button onClick={() => showDetails(row.user.id)} className="min-h-11 rounded-xl border border-[#333] px-3 text-xs">{openUser === row.user.id ? 'Ocultar uso' : 'Detalhar uso'}</button><button onClick={() => resetPassword(row.user)} className="min-h-11 rounded-xl border border-[#333] px-3 text-xs">Nova senha</button><button onClick={() => toggle(row.user)} className="min-h-11 rounded-xl border border-[#333] px-3 text-xs">{row.user.is_active ? 'Desativar' : 'Ativar'}</button></div>
            </div>
            {openUser === row.user.id && <UsageDetails rows={details[row.user.id]} />}
          </article>
        ))}
      </div>
    </div>
  )
}

function UsageDetails({ rows }: { rows?: UsageRow[] }) {
  if (!rows) return <p className="border-t border-[#2a2a2a] p-4 text-xs text-gray-500">Carregando detalhamento…</p>
  if (!rows.length) return <p className="border-t border-[#2a2a2a] p-4 text-xs text-gray-500">Nenhuma chamada neste período.</p>
  return <div className="border-t border-[#2a2a2a] p-4"><div className="space-y-2">{rows.map(row => <div key={row.id} className="grid grid-cols-1 gap-1 rounded-xl bg-[#111] p-3 text-xs sm:grid-cols-[1.2fr_1fr_auto] sm:items-center"><div className="min-w-0"><p className="truncate text-gray-300">{row.project_name} · job #{row.job_id} · {row.step || 'chamada'}</p><p className="truncate font-mono text-[10px] text-gray-600">{row.model}</p></div><p className="text-gray-500">{new Date(row.created_at).toLocaleString('pt-BR')}</p><p className="font-medium">{row.total_tokens.toLocaleString('pt-BR')} tokens <span className={row.is_estimated ? 'text-amber-500' : 'text-emerald-500'}>({row.is_estimated ? 'estimado' : 'real'})</span></p></div>)}</div></div>
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div><p className="text-[10px] text-gray-600">{label}</p><p className="text-sm font-semibold">{value.toLocaleString('pt-BR')}</p></div>
}
