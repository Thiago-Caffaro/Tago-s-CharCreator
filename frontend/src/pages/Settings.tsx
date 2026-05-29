import React, { useEffect, useState, useRef } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus, Trash2, Search, ExternalLink, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSettingsStore } from '../store/useSettingsStore'
import { rulesApi } from '../api/rules'
import client from '../api/client'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Toggle } from '../components/ui/Toggle'
import type { GenerationRule } from '../types'

interface ORModel {
  id: string
  name: string
}

function ModelPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [models, setModels] = useState<ORModel[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const fetchModels = async () => {
    setLoading(true)
    try {
      const res = await client.get<{ models: ORModel[] }>('/settings/models')
      setModels(res.data.models)
    } catch {
      toast.error('Não foi possível buscar modelos do OpenRouter')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = models.filter(
    m =>
      m.id.toLowerCase().includes(search.toLowerCase()) ||
      m.name.toLowerCase().includes(search.toLowerCase()),
  ).slice(0, 60)

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-400">Modelo padrão</label>
      <div className="flex gap-2">
        <div ref={ref} className="relative flex-1">
          <input
            value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={() => { setOpen(true); if (models.length === 0) fetchModels() }}
            placeholder="ex: anthropic/claude-sonnet-4-5"
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-md px-3 py-2 text-sm text-gray-100
              placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#9b59b6]/50 focus:border-[#9b59b6] transition-colors"
          />
          {open && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e1e1e] border border-[#333] rounded-xl shadow-2xl z-20 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2a2a2a]">
                <Search size={12} className="text-gray-500 shrink-0" />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Filtrar modelos..."
                  className="flex-1 bg-transparent text-xs text-gray-200 placeholder-gray-600 outline-none"
                />
                {loading && (
                  <span className="w-3 h-3 border-2 border-[#9b59b6] border-t-transparent rounded-full animate-spin shrink-0" />
                )}
              </div>
              <div className="max-h-60 overflow-auto">
                {filtered.length === 0 && !loading && (
                  <div className="px-3 py-4 text-xs text-gray-600 text-center">
                    {models.length === 0 ? 'Carregando…' : 'Nenhum modelo encontrado'}
                  </div>
                )}
                {filtered.map(m => (
                  <button
                    key={m.id}
                    className="w-full text-left px-3 py-2 hover:bg-[#242424] transition-colors"
                    onMouseDown={e => { e.preventDefault(); onChange(m.id); setOpen(false); setSearch('') }}
                  >
                    <div className="text-xs text-gray-200 font-mono">{m.id}</div>
                    {m.name !== m.id && (
                      <div className="text-[10px] text-gray-500">{m.name}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <button
          className="px-2 py-2 rounded-md border border-[#333] text-gray-500 hover:text-gray-300 hover:border-[#444] transition-colors"
          title="Recarregar lista de modelos"
          onClick={() => { fetchModels(); setOpen(true) }}
        >
          <RefreshCw size={14} />
        </button>
      </div>
      <p className="text-[10px] text-gray-600">
        Digite qualquer ID de modelo do OpenRouter ou selecione da lista.{' '}
        <a
          href="https://openrouter.ai/models"
          target="_blank"
          rel="noreferrer"
          className="text-[#9b59b6] hover:underline inline-flex items-center gap-0.5"
        >
          Ver todos <ExternalLink size={9} />
        </a>
      </p>
    </div>
  )
}

interface ORProvider { id: string; label: string }

function ProviderPicker({
  model,
  value,
  onChange,
}: {
  model: string
  value: string
  onChange: (v: string) => void
}) {
  const [providers, setProviders] = useState<ORProvider[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const fetchProviders = async () => {
    setLoading(true)
    try {
      const res = await client.get<{ providers: ORProvider[] }>(
        `/settings/providers${model ? `?model=${encodeURIComponent(model)}` : ''}`,
      )
      setProviders(res.data.providers)
    } catch {
      toast.error('Não foi possível buscar provedores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = providers.filter(p =>
    p.label.toLowerCase().includes(value.toLowerCase()),
  )

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-400">
        Provedor preferido{' '}
        <span className="text-gray-600 font-normal">(opcional)</span>
      </label>
      <div className="flex gap-2">
        <div ref={ref} className="relative flex-1">
          <input
            value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={() => { setOpen(true); if (providers.length === 0) fetchProviders() }}
            placeholder="ex: Anthropic, Together, Groq…"
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-md px-3 py-2 text-sm text-gray-100
              placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#9b59b6]/50 focus:border-[#9b59b6] transition-colors"
          />
          {value && (
            <button
              onMouseDown={e => { e.preventDefault(); onChange(''); setOpen(false) }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 text-xs px-1"
              title="Limpar (usar qualquer provedor)"
            >
              ✕
            </button>
          )}
          {open && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e1e1e] border border-[#333] rounded-xl shadow-2xl z-20 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2a2a2a]">
                <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                  {model ? `Provedores para ${model.split('/')[0]}` : 'Provedores OpenRouter'}
                </span>
                {loading && (
                  <span className="ml-auto w-3 h-3 border-2 border-[#9b59b6] border-t-transparent rounded-full animate-spin shrink-0" />
                )}
              </div>
              <div className="max-h-48 overflow-auto">
                <button
                  className="w-full text-left px-3 py-2 hover:bg-[#242424] transition-colors"
                  onMouseDown={e => { e.preventDefault(); onChange(''); setOpen(false) }}
                >
                  <div className="text-xs text-gray-400 italic">Qualquer provedor (padrão)</div>
                </button>
                {(filtered.length > 0 ? filtered : providers).map(p => (
                  <button
                    key={p.id}
                    className={`w-full text-left px-3 py-2 hover:bg-[#242424] transition-colors ${
                      value === p.id ? 'bg-[#9b59b6]/10' : ''
                    }`}
                    onMouseDown={e => { e.preventDefault(); onChange(p.id); setOpen(false) }}
                  >
                    <div className="text-xs text-gray-200">{p.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <button
          className="px-2 py-2 rounded-md border border-[#333] text-gray-500 hover:text-gray-300 hover:border-[#444] transition-colors"
          title="Recarregar lista de provedores"
          onClick={() => { fetchProviders(); setOpen(true) }}
        >
          <RefreshCw size={14} />
        </button>
      </div>
      <p className="text-[10px] text-gray-600">
        Força todas as requisições a usarem um provedor específico do OpenRouter.
        Deixe vazio para balanceamento automático.{' '}
        <a
          href="https://openrouter.ai/docs/provider-routing"
          target="_blank"
          rel="noreferrer"
          className="text-[#9b59b6] hover:underline inline-flex items-center gap-0.5"
        >
          Docs <ExternalLink size={9} />
        </a>
      </p>
    </div>
  )
}

function SortableRule({
  rule, onToggle, onDelete,
}: { rule: GenerationRule; onToggle: (id: number, v: boolean) => void; onDelete: (id: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rule.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2 p-3 bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg">
      <button {...attributes} {...listeners} className="mt-0.5 text-gray-600 hover:text-gray-400 cursor-grab">
        <GripVertical size={14} />
      </button>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-gray-300 block">{rule.name}</span>
        <span className="text-xs text-gray-600 font-mono">{rule.content}</span>
      </div>
      <Toggle checked={rule.is_active} onChange={v => onToggle(rule.id, v)} size="sm" />
      <button
        className="text-gray-600 hover:text-red-400 transition-colors p-0.5"
        onClick={() => onDelete(rule.id)}
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// Fields generated in chunked mode, in display order
const CHUNKED_FIELDS: { key: string; label: string; hint: string }[] = [
  { key: 'description',               label: 'description',               hint: 'Appearance, personality, relationship sections' },
  { key: 'personality',               label: 'personality',               hint: 'Compressed dual-nature summary' },
  { key: 'scenario',                  label: 'scenario',                  hint: 'Opening scene (< 100 words target)' },
  { key: 'first_mes',                 label: 'first_mes',                 hint: 'Opening message with action + dialogue' },
  { key: 'mes_example',               label: 'mes_example',               hint: '3+ <START> blocks, everyday → explicit' },
  { key: 'system_prompt',             label: 'system_prompt',             hint: '5-component role + format + rules prompt' },
  { key: 'post_history_instructions', label: 'post_history_instructions', hint: 'Format + behavioral anchor (< 100 words)' },
  { key: 'alternate_greetings',       label: 'alternate_greetings',       hint: '4 distinct opening situations (JSON array)' },
]

export default function Settings() {
  const { settings, fetchSettings, updateSettings } = useSettingsStore()
  const [rules, setRules] = useState<GenerationRule[]>([])
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [provider, setProvider] = useState('')
  const [maxTokens, setMaxTokens] = useState(8192)
  const [temperature, setTemperature] = useState(1.0)
  const [fieldMaxTokens, setFieldMaxTokens] = useState<Record<string, number>>({})
  const [newRuleName, setNewRuleName] = useState('')
  const [newRuleContent, setNewRuleContent] = useState('')
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor))

  useEffect(() => {
    fetchSettings().catch(() => {})
    rulesApi.list().then(setRules).catch(() => {})
  }, [])

  useEffect(() => {
    if (settings) {
      setModel(settings.default_model)
      setProvider(settings.preferred_provider ?? '')
      setMaxTokens(settings.max_tokens)
      setTemperature(settings.temperature)
      setFieldMaxTokens(settings.field_max_tokens ?? {})
    }
  }, [settings])

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      await updateSettings({
        ...(apiKey ? { openrouter_api_key: apiKey } : {}),
        default_model: model,
        preferred_provider: provider,
        max_tokens: maxTokens,
        temperature,
        field_max_tokens: fieldMaxTokens,
      })
      setApiKey('')
      toast.success('Configurações salvas!')
    } catch {
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const handleRuleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = rules.findIndex(r => r.id === active.id)
    const newIndex = rules.findIndex(r => r.id === over.id)
    const newRules = arrayMove(rules, oldIndex, newIndex)
    setRules(newRules)
    await rulesApi.reorder(newRules.map((r, i) => ({ id: r.id, order_index: i })))
  }

  const handleToggleRule = async (id: number, v: boolean) => {
    const updated = await rulesApi.update(id, { is_active: v })
    setRules(rs => rs.map(r => r.id === id ? updated : r))
  }

  const handleDeleteRule = async (id: number) => {
    await rulesApi.delete(id)
    setRules(rs => rs.filter(r => r.id !== id))
    toast.success('Regra removida')
  }

  const handleAddRule = async () => {
    if (!newRuleName.trim() || !newRuleContent.trim()) return
    const rule = await rulesApi.create({
      name: newRuleName, content: newRuleContent,
      scope: 'global', is_active: true, order_index: rules.length,
    })
    setRules(rs => [...rs, rule])
    setNewRuleName('')
    setNewRuleContent('')
    toast.success('Regra adicionada')
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <h1 className="text-xl font-semibold text-gray-100">Configurações</h1>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-300 border-b border-[#2a2a2a] pb-2">
          OpenRouter — API & Modelo
        </h2>

        <div className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
          <div className="w-2 h-2 rounded-full bg-[#9b59b6] shrink-0" />
          <p className="text-xs text-gray-500">
            O OpenRouter dá acesso a modelos da Anthropic, OpenAI, Google, Meta e mais —
            com uma única chave de API.{' '}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noreferrer"
              className="text-[#9b59b6] hover:underline inline-flex items-center gap-0.5"
            >
              Obter chave <ExternalLink size={9} />
            </a>
          </p>
        </div>

        {settings && (
          <p className="text-xs text-gray-600">
            Chave atual:{' '}
            <span className="font-mono text-gray-500">{settings.api_key_masked}</span>
          </p>
        )}

        <Input
          label="Nova API Key do OpenRouter (deixe vazio para manter)"
          type="password"
          placeholder="sk-or-v1-..."
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
        />

        <ModelPicker value={model} onChange={setModel} />

        <ProviderPicker model={model} value={provider} onChange={setProvider} />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Max Tokens"
            type="number"
            value={maxTokens}
            onChange={e => setMaxTokens(Number(e.target.value))}
          />
          <Input
            label="Temperature"
            type="number"
            step="0.05"
            min="0"
            max="2"
            value={temperature}
            onChange={e => setTemperature(Number(e.target.value))}
          />
        </div>

        <Button loading={saving} onClick={handleSaveSettings}>Salvar</Button>
      </section>

      {/* ── Per-field token budgets ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="border-b border-[#2a2a2a] pb-2">
          <h2 className="text-sm font-semibold text-gray-300">
            Tokens por Campo — Geração Chunked
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            Cada campo é gerado em uma chamada separada. Aumente o limite se o campo estiver sendo cortado
            (finish_reason: <span className="font-mono text-gray-500">length</span> no OpenRouter).
            Diminua se quiser economizar créditos.
          </p>
        </div>

        <div className="rounded-lg border border-[#2a2a2a] overflow-hidden">
          <div className="grid grid-cols-[1fr_auto] text-[10px] font-semibold text-gray-600 uppercase tracking-wider
            px-3 py-2 bg-[#161616] border-b border-[#2a2a2a]">
            <span>Campo</span>
            <span className="w-24 text-right">Max tokens</span>
          </div>

          {CHUNKED_FIELDS.map(({ key, label, hint }, i) => (
            <div
              key={key}
              className={`grid grid-cols-[1fr_auto] items-center gap-3 px-3 py-2.5
                ${i % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-[#1e1e1e]'}
                ${i < CHUNKED_FIELDS.length - 1 ? 'border-b border-[#242424]' : ''}`}
            >
              <div className="min-w-0">
                <span className="text-xs font-mono text-gray-300">{label}</span>
                <span className="text-[10px] text-gray-600 ml-2">{hint}</span>
              </div>
              <input
                type="number"
                min={256}
                max={32768}
                step={256}
                value={fieldMaxTokens[key] ?? ''}
                onChange={e => setFieldMaxTokens(prev => ({
                  ...prev,
                  [key]: Math.max(256, Math.min(32768, Number(e.target.value) || 256)),
                }))}
                className="w-24 bg-[#242424] border border-[#333] rounded-md px-2 py-1 text-xs text-right
                  text-gray-200 font-mono focus:outline-none focus:ring-1 focus:ring-[#9b59b6]/50
                  focus:border-[#9b59b6] transition-colors"
              />
            </div>
          ))}
        </div>

        <p className="text-[10px] text-gray-600">
          Salvo junto com as configurações principais acima. Não esqueça de clicar em{' '}
          <span className="text-gray-400">Salvar</span>.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-300 border-b border-[#2a2a2a] pb-2">
          Regras Globais de Geração
        </h2>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleRuleDragEnd}>
          <SortableContext items={rules.map(r => r.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {rules.map(rule => (
                <SortableRule key={rule.id} rule={rule} onToggle={handleToggleRule} onDelete={handleDeleteRule} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="space-y-2 border border-dashed border-[#333] rounded-lg p-3">
          <p className="text-xs text-gray-500 font-medium">Nova regra</p>
          <Input
            placeholder="Nome da regra..."
            value={newRuleName}
            onChange={e => setNewRuleName(e.target.value)}
          />
          <Textarea
            placeholder="Conteúdo da regra..."
            rows={2}
            value={newRuleContent}
            onChange={e => setNewRuleContent(e.target.value)}
          />
          <Button size="sm" variant="secondary" onClick={handleAddRule}>
            <Plus size={13} /> Adicionar Regra
          </Button>
        </div>
      </section>
    </div>
  )
}
