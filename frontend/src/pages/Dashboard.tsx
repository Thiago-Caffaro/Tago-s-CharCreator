import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Folder, Trash2, Edit2, Copy, User, Calendar, Upload, FileImage, Download, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useProjectStore } from '../store/useProjectStore'
import { projectsApi } from '../api/projects'
import { contextCardsApi } from '../api/contextCards'
import { lorebookApi } from '../api/lorebook'
import { parseCardFile } from '../utils/cardImporter'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { SearchInput } from '../components/ui/SearchInput'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import type { Project } from '../types'

// Card fields brought in as context cards (with target_field set) so the
// imported character immediately has source material for regeneration,
// instead of only existing as an opaque last_generated_card blob.
const IMPORT_FIELD_CARDS: { field: string; title: string }[] = [
  { field: 'description', title: 'Descrição' },
  { field: 'personality', title: 'Personalidade' },
  { field: 'scenario', title: 'Cenário' },
  { field: 'first_mes', title: 'Primeira Mensagem' },
  { field: 'mes_example', title: 'Exemplos de Mensagem' },
  { field: 'system_prompt', title: 'System Prompt' },
  { field: 'post_history_instructions', title: 'Post-History Instructions' },
  { field: 'creator_notes', title: 'Notas do Criador' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { projects, loading, fetchProjects, createProject, duplicateProject, deleteProject } = useProjectStore()
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null)
  const [form, setForm] = useState({ name: '', character_name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importingCard, setImportingCard] = useState(false)
  const [search, setSearch] = useState('')
  const importRef = useRef<HTMLInputElement>(null)
  const cardImportRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchProjects() }, [])

  const query = search.trim().toLowerCase()
  const filteredProjects = query
    ? projects.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.character_name.toLowerCase().includes(query)
      )
    : projects

  const handleCreate = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const project = await createProject(form)
      setShowCreate(false)
      setForm({ name: '', character_name: '', description: '' })
      toast.success('Projeto criado!')
      navigate(`/editor/${project.id}`)
    } catch {
      toast.error('Erro ao criar projeto')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await deleteProject(confirmDelete.id)
      setConfirmDelete(null)
      toast.success('Projeto deletado')
    } catch {
      toast.error('Erro ao deletar projeto')
    }
  }

  const handleDuplicate = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation()
    setDuplicatingId(project.id)
    try {
      const copy = await duplicateProject(project.id)
      toast.success(`"${copy.name}" criado`)
    } catch {
      toast.error('Erro ao duplicar projeto')
    } finally {
      setDuplicatingId(null)
    }
  }

  const handleExport = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation()
    try {
      await projectsApi.exportProject(project.id, project.name)
      toast.success('Projeto exportado!')
    } catch {
      toast.error('Erro ao exportar projeto')
    }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data.project || !data.version) {
        toast.error('Arquivo inválido — não é um export de projeto')
        return
      }
      const project = await projectsApi.importProject(data)
      await fetchProjects()
      toast.success(`Projeto "${project.name}" importado!`)
      navigate(`/editor/${project.id}`)
    } catch {
      toast.error('Erro ao importar projeto')
    } finally {
      setImporting(false)
    }
  }

  const handleImportCardFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImportingCard(true)
    try {
      const { card, avatarDataUrl } = await parseCardFile(file)
      const data = card.data

      const project = await createProject({
        name: data.name || file.name.replace(/\.(png|json)$/i, ''),
        character_name: data.name || '',
      })

      await projectsApi.update(project.id, {
        ...(avatarDataUrl ? { avatar: avatarDataUrl } : {}),
        last_generated_card: JSON.stringify(card),
      })

      let order = 0
      for (const { field, title } of IMPORT_FIELD_CARDS) {
        const content = (data as any)[field]
        if (typeof content === 'string' && content.trim()) {
          await contextCardsApi.create(project.id, {
            title: `${title} (importado)`,
            card_type: 'custom',
            content,
            target_field: field,
            order_index: order++,
          })
        }
      }

      const book = data.character_book
      if (book?.entries?.length) {
        for (const entry of book.entries) {
          await lorebookApi.create(project.id, {
            name: entry.comment || '',
            keys: JSON.stringify(entry.keys || []),
            secondary_keys: JSON.stringify(entry.secondary_keys || []),
            content: entry.content || '',
            enabled: entry.enabled ?? true,
            insertion_order: entry.insertion_order ?? 10,
            position: entry.position ?? 1,
            constant: entry.constant ?? false,
            selective: entry.selective ?? false,
            probability: entry.probability ?? 100,
            depth: entry.extensions?.depth ?? 4,
            comment: entry.comment || '',
          })
        }
      }

      await fetchProjects()
      toast.success(`Card "${data.name || 'sem nome'}" importado!`)
      navigate(`/editor/${project.id}`)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao importar card')
    } finally {
      setImportingCard(false)
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto lg:p-6 lg:max-w-6xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-5 lg:mb-6">
        <div>
          <h1 className="text-lg lg:text-xl font-semibold text-gray-100">Projetos</h1>
          <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
            {query
              ? `${filteredProjects.length} de ${projects.length} projeto${projects.length !== 1 ? 's' : ''}`
              : `${projects.length} projeto${projects.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
          <input
            ref={cardImportRef}
            type="file"
            accept="image/png,.png,application/json,.json"
            className="hidden"
            onChange={handleImportCardFile}
          />
          {/* Mobile: icon-only import buttons */}
          <button
            onClick={() => cardImportRef.current?.click()}
            disabled={importingCard}
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl border border-[#333]
              bg-[#1e1e1e] text-gray-400 active:bg-[#2a2a2a] transition-colors disabled:opacity-50"
            title="Importar Card (PNG/JSON de outro app)"
          >
            {importingCard
              ? <span className="w-4 h-4 border-2 border-[#9b59b6] border-t-transparent rounded-full animate-spin" />
              : <FileImage size={16} />
            }
          </button>
          <button
            onClick={() => importRef.current?.click()}
            disabled={importing}
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl border border-[#333]
              bg-[#1e1e1e] text-gray-400 active:bg-[#2a2a2a] transition-colors disabled:opacity-50"
            title="Importar Projeto"
          >
            {importing
              ? <span className="w-4 h-4 border-2 border-[#9b59b6] border-t-transparent rounded-full animate-spin" />
              : <Upload size={16} />
            }
          </button>
          {/* Desktop: labeled import buttons */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => cardImportRef.current?.click()}
            loading={importingCard}
            className="hidden lg:inline-flex"
            title="Importa um character card (.png ou .json) do SillyTavern, Chub, etc."
          >
            <FileImage size={14} /> Importar Card
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => importRef.current?.click()}
            loading={importing}
            className="hidden lg:inline-flex"
          >
            <Upload size={14} /> Importar Projeto
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            <span className="lg:hidden">Novo</span>
            <span className="hidden lg:inline">Novo Projeto</span>
          </Button>
        </div>
      </div>

      {/* Search */}
      {!loading && projects.length > 0 && (
        <div className="mb-4 lg:mb-5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nome do projeto ou personagem..."
            className="lg:max-w-xs"
          />
        </div>
      )}

      {/* States */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="w-7 h-7 border-2 border-[#9b59b6] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mb-4">
            <Folder size={28} className="text-gray-600" />
          </div>
          <p className="text-gray-400 text-sm font-medium">Nenhum projeto ainda</p>
          <p className="text-gray-600 text-xs mt-1 mb-5">Crie seu primeiro projeto para começar</p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={15} /> Criar Projeto
          </Button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-gray-500 text-sm">Nenhum projeto encontrado para "{search.trim()}"</p>
        </div>
      ) : (
        <>
        {/* Desktop grid */}
        <div className="hidden lg:grid grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjects.map(project => (
            <div
              key={project.id}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 hover:border-[#9b59b6]/40 transition-colors cursor-pointer group"
              onClick={() => navigate(`/editor/${project.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-gray-100 truncate">{project.name}</h2>
                  {project.character_name && (
                    <div className="flex items-center gap-1 mt-1">
                      <User size={11} className="text-[#9b59b6]" />
                      <span className="text-xs text-[#9b59b6]">{project.character_name}</span>
                    </div>
                  )}
                </div>
                <div
                  className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    title="Exportar projeto"
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[#242424] transition-colors"
                    onClick={e => handleExport(e, project)}
                  >
                    <Download size={13} />
                  </button>
                  <button
                    title="Duplicar projeto"
                    disabled={duplicatingId === project.id}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[#242424] transition-colors disabled:opacity-50"
                    onClick={e => handleDuplicate(e, project)}
                  >
                    {duplicatingId === project.id
                      ? <span className="block w-[13px] h-[13px] border border-gray-500 border-t-transparent rounded-full animate-spin" />
                      : <Copy size={13} />
                    }
                  </button>
                  <button
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[#242424] transition-colors"
                    onClick={() => navigate(`/editor/${project.id}`)}
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                    onClick={() => setConfirmDelete(project)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {project.description && (
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{project.description}</p>
              )}

              <div className="flex items-center gap-1 text-[11px] text-gray-600">
                <Calendar size={10} />
                {new Date(project.updated_at).toLocaleDateString('pt-BR')}
              </div>
            </div>
          ))}
        </div>

        {/* Mobile list */}
        <div className="lg:hidden space-y-3">
          {filteredProjects.map(project => (
            <div
              key={project.id}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4
                active:bg-[#1e1e1e] transition-colors cursor-pointer"
              onClick={() => navigate(`/editor/${project.id}`)}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-[#9b59b6]/15 border border-[#9b59b6]/20
                  flex items-center justify-center shrink-0 mt-0.5">
                  <Folder size={18} className="text-[#9b59b6]" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-gray-100 truncate">{project.name}</h2>
                  {project.character_name && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <User size={10} className="text-[#9b59b6]" />
                      <span className="text-xs text-[#9b59b6]">{project.character_name}</span>
                    </div>
                  )}
                  {project.description && (
                    <p className="text-xs text-gray-600 line-clamp-1 mt-1">{project.description}</p>
                  )}
                  <div className="flex items-center gap-1 text-[10px] text-gray-700 mt-1.5">
                    <Calendar size={9} />
                    {new Date(project.updated_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>

                {/* Chevron */}
                <ChevronRight size={16} className="text-gray-700 shrink-0 mt-1" />
              </div>

              {/* Action row — always visible, no hover needed on mobile */}
              <div
                className="flex items-center gap-2 mt-3 pt-3 border-t border-[#2a2a2a]"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={e => handleExport(e, project)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl
                    bg-[#242424] border border-[#2a2a2a] text-xs text-gray-400
                    active:bg-[#2a2a2a] transition-colors"
                >
                  <Download size={12} />
                  Exportar
                </button>
                <button
                  onClick={e => handleDuplicate(e, project)}
                  disabled={duplicatingId === project.id}
                  className="flex items-center justify-center w-10 h-9 rounded-xl
                    bg-[#242424] border border-[#2a2a2a] text-gray-600
                    active:bg-[#2a2a2a] transition-colors disabled:opacity-50"
                >
                  {duplicatingId === project.id
                    ? <span className="block w-3.5 h-3.5 border border-gray-500 border-t-transparent rounded-full animate-spin" />
                    : <Copy size={13} />
                  }
                </button>
                <button
                  onClick={() => setConfirmDelete(project)}
                  className="flex items-center justify-center w-10 h-9 rounded-xl
                    bg-[#242424] border border-[#2a2a2a] text-gray-600
                    active:bg-red-900/20 active:text-red-400 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Novo Projeto">
        <div className="space-y-4">
          <Input
            label="Nome do Projeto"
            placeholder="ex: Minha Waifu"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Nome do Personagem"
            placeholder="ex: Aria"
            value={form.character_name}
            onChange={e => setForm(f => ({ ...f, character_name: e.target.value }))}
          />
          <Textarea
            label="Descrição (opcional)"
            placeholder="Descrição do projeto..."
            rows={3}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)} className="flex-1">
              Cancelar
            </Button>
            <Button loading={saving} onClick={handleCreate} disabled={!form.name.trim()} className="flex-1">
              Criar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <ConfirmModal
        open={!!confirmDelete}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        message={
          <>Deletar <strong className="text-white">{confirmDelete?.name}</strong>? Todos os cards e lorebook entries serão removidos.</>
        }
      />
    </div>
  )
}
