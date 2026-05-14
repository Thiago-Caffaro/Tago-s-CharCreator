import React, { useEffect, useState } from 'react'
import { Plus, Layers, Tag } from 'lucide-react'
import toast from 'react-hot-toast'
import { presetsApi } from '../api/presets'
import { cardTypesApi } from '../api/cardTypes'
import type { CardTypeConfig } from '../api/cardTypes'
import type { FieldPreset } from '../types'
import { CHARA_FIELDS } from '../types'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'
import { Toggle } from '../components/ui/Toggle'
import { PresetCard } from '../components/presets/PresetCard'
import { PresetEditor } from '../components/presets/PresetEditor'
import { CardTypeCard } from '../components/presets/CardTypeCard'
import { CardTypeEditor } from '../components/presets/CardTypeEditor'

type Tab = 'presets' | 'tipos'

const FIELD_OPTIONS = [
  { value: '', label: 'Todos os campos' },
  ...CHARA_FIELDS.map(f => ({ value: f, label: f })),
]

const PRESET_FIELD_OPTIONS = CHARA_FIELDS.map(f => ({ value: f, label: f }))

const PRESET_COLORS = [
  '#3498db', '#2ecc71', '#e67e22', '#e91e63',
  '#9b59b6', '#1abc9c', '#f1c40f', '#95a5a6',
  '#e74c3c', '#00bcd4', '#ff9800', '#ecf0f1',
]

// ──────────────────────────────────────────
// Presets Tab
// ──────────────────────────────────────────
function PresetsTab() {
  const [presets, setPresets] = useState<FieldPreset[]>([])
  const [selected, setSelected] = useState<FieldPreset | null>(null)
  const [fieldFilter, setFieldFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    name: '',
    target_field: CHARA_FIELDS[0],
    system_prompt_override: '',
    is_default: false,
  })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      setPresets(await presetsApi.list())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = fieldFilter
    ? presets.filter(p => p.target_field === fieldFilter)
    : presets

  // group by field
  const groups = filtered.reduce<Record<string, FieldPreset[]>>((acc, p) => {
    if (!acc[p.target_field]) acc[p.target_field] = []
    acc[p.target_field].push(p)
    return acc
  }, {})

  const handleCreate = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const p = await presetsApi.create(form)
      setPresets(prev => [...prev, p])
      setShowCreate(false)
      setForm({ name: '', target_field: CHARA_FIELDS[0], system_prompt_override: '', is_default: false })
      toast.success('Preset criado!')
      setSelected(p)
    } catch {
      toast.error('Erro ao criar preset')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async (id: number, data: Partial<FieldPreset>) => {
    const updated = await presetsApi.update(id, data)
    setPresets(prev => prev.map(p => p.id === id ? updated : p))
    setSelected(updated)
    toast.success('Preset salvo')
  }

  const handleDelete = async (preset: FieldPreset) => {
    await presetsApi.delete(preset.id)
    setPresets(prev => prev.filter(p => p.id !== preset.id))
    if (selected?.id === preset.id) setSelected(null)
    toast.success('Preset removido')
  }

  const handleToggleDefault = async (preset: FieldPreset) => {
    const updated = await presetsApi.update(preset.id, { is_default: !preset.is_default })
    setPresets(prev => prev.map(p => p.id === preset.id ? updated : p))
    if (selected?.id === preset.id) setSelected(updated)
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[#2a2a2a]">
          <select
            value={fieldFilter}
            onChange={e => setFieldFilter(e.target.value)}
            className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-xs text-gray-300
              focus:outline-none focus:ring-2 focus:ring-[#9b59b6]/50"
          >
            {FIELD_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span className="text-xs text-gray-600">
            {filtered.length} preset{filtered.length !== 1 ? 's' : ''}
          </span>
          <div className="ml-auto">
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus size={13} /> Novo Preset
            </Button>
          </div>
        </div>

        {/* Board */}
        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="w-5 h-5 border-2 border-[#9b59b6] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : Object.keys(groups).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Layers size={40} className="text-gray-700 mb-3" />
              <p className="text-gray-500 text-sm">Nenhum preset ainda</p>
              <p className="text-gray-700 text-xs mt-1">Clique em "Novo Preset" para começar</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groups).map(([field, group]) => (
                <div key={field}>
                  <div className="flex items-center gap-2 mb-3">
                    <Tag size={12} className="text-gray-600" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-mono">
                      {field}
                    </span>
                    <span className="text-[10px] text-gray-700">({group.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {group.map(p => (
                      <PresetCard
                        key={p.id}
                        preset={p}
                        onSelect={setSelected}
                        onDelete={handleDelete}
                        onToggleDefault={handleToggleDefault}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <PresetEditor
          preset={selected}
          onClose={() => setSelected(null)}
          onSave={handleSave}
        />
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Novo Preset" size="md">
        <div className="space-y-4">
          <Input
            label="Nome"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="ex: Descrição Detalhada NSFW"
          />
          <Select
            label="Campo-alvo"
            value={form.target_field}
            onChange={e => setForm(f => ({ ...f, target_field: e.target.value }))}
            options={PRESET_FIELD_OPTIONS}
          />
          <Textarea
            label="System Prompt Override (opcional)"
            value={form.system_prompt_override}
            onChange={e => setForm(f => ({ ...f, system_prompt_override: e.target.value }))}
            rows={4}
            placeholder="Deixe vazio para editar depois..."
          />
          <Toggle
            label="Definir como padrão para este campo"
            checked={form.is_default}
            onChange={v => setForm(f => ({ ...f, is_default: v }))}
          />
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button loading={saving} onClick={handleCreate} disabled={!form.name.trim()}>
              Criar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ──────────────────────────────────────────
// Tipos Tab
// ──────────────────────────────────────────
function TiposTab() {
  const [types, setTypes] = useState<CardTypeConfig[]>([])
  const [selected, setSelected] = useState<CardTypeConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ slug: '', label: '', color: '#9b59b6' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      setTypes(await cardTypesApi.list())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.slug.trim() || !form.label.trim()) return
    setSaving(true)
    try {
      const ct = await cardTypesApi.create(form)
      setTypes(prev => [...prev, ct])
      setShowCreate(false)
      setForm({ slug: '', label: '', color: '#9b59b6' })
      toast.success('Tipo criado!')
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Erro ao criar tipo')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async (id: number, data: { label: string; color: string }) => {
    const updated = await cardTypesApi.update(id, data)
    setTypes(prev => prev.map(t => t.id === id ? updated : t))
    setSelected(updated)
    toast.success('Tipo salvo')
  }

  const handleDelete = async (ct: CardTypeConfig) => {
    try {
      await cardTypesApi.delete(ct.id)
      setTypes(prev => prev.filter(t => t.id !== ct.id))
      if (selected?.id === ct.id) setSelected(null)
      toast.success('Tipo removido')
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Erro ao remover tipo')
    }
  }

  const builtin = types.filter(t => t.is_builtin)
  const custom = types.filter(t => !t.is_builtin)

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a2a]">
          <span className="text-xs text-gray-600">
            {builtin.length} nativos · {custom.length} personalizados
          </span>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={13} /> Novo Tipo
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="w-5 h-5 border-2 border-[#9b59b6] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {builtin.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipos Nativos</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {builtin.map(ct => (
                      <CardTypeCard key={ct.id} cardType={ct} onSelect={setSelected} onDelete={handleDelete} />
                    ))}
                  </div>
                </div>
              )}

              {custom.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Personalizados</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {custom.map(ct => (
                      <CardTypeCard key={ct.id} cardType={ct} onSelect={setSelected} onDelete={handleDelete} />
                    ))}
                  </div>
                </div>
              )}

              {custom.length === 0 && (
                <div className="flex flex-col items-center py-6 text-center border border-dashed border-[#2a2a2a] rounded-xl">
                  <p className="text-xs text-gray-600">Nenhum tipo personalizado</p>
                  <p className="text-[11px] text-gray-700 mt-0.5">Crie novos tipos para organizar seus context cards</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {selected && (
        <CardTypeEditor
          cardType={selected}
          onClose={() => setSelected(null)}
          onSave={handleSave}
        />
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Novo Tipo de Card" size="sm">
        <div className="space-y-4">
          <Input
            label="Slug (identificador único)"
            value={form.slug}
            onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
            placeholder="ex: backstory"
          />
          <Input
            label="Rótulo"
            value={form.label}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            placeholder="ex: Backstory"
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-400">Cor</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="w-9 h-9 rounded-lg cursor-pointer border-0 bg-transparent p-0.5"
              />
              <span className="text-xs font-mono text-gray-400">{form.color}</span>
            </div>
            <div className="grid grid-cols-8 gap-1.5 mt-1">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  className={`w-7 h-7 rounded-lg border-2 transition-all ${
                    form.color === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ background: c }}
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button
              loading={saving}
              onClick={handleCreate}
              disabled={!form.slug.trim() || !form.label.trim()}
            >
              Criar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ──────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────
export default function Presets() {
  const [tab, setTab] = useState<Tab>('presets')

  const tabs = [
    { id: 'presets' as Tab, label: 'Presets de Prompt', icon: Layers },
    { id: 'tipos' as Tab, label: 'Tipos de Card', icon: Tag },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-5 pt-3 border-b border-[#2a2a2a] shrink-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2 -mb-px
              ${tab === t.id
                ? 'text-[#9b59b6] border-[#9b59b6] bg-[#9b59b6]/5'
                : 'text-gray-500 border-transparent hover:text-gray-300'}`}
          >
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {tab === 'presets' ? <PresetsTab /> : <TiposTab />}
      </div>
    </div>
  )
}
