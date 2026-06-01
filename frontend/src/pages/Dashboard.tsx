import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Folder, Trash2, User, Calendar, Upload, Download, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useProjectStore } from '../store/useProjectStore'
import { projectsApi } from '../api/projects'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import type { Project } from '../types'

export default function Dashboard() {
  const navigate = useNavigate()
  const { projects, loading, fetchProjects, createProject, deleteProject } = useProjectStore()
  const [showCreate, setShowCreate] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null)
  const [form, setForm] = useState({ name: '', character_name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchProjects() }, [])

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

  return (
    <div className="p-4 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-gray-100">Projetos</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {projects.length} projeto{projects.length !== 1 ? 's' : ''}
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
          <button
            onClick={() => importRef.current?.click()}
            disabled={importing}
            className="flex items-center justify-center w-10 h-10 rounded-xl border border-[#333]
              bg-[#1e1e1e] text-gray-400 active:bg-[#2a2a2a] transition-colors disabled:opacity-50"
            title="Importar Projeto"
          >
            {importing
              ? <span className="w-4 h-4 border-2 border-[#9b59b6] border-t-transparent rounded-full animate-spin" />
              : <Upload size={16} />
            }
          </button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Novo
          </Button>
        </div>
      </div>

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
      ) : (
        <div className="space-y-3">
          {projects.map(project => (
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
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Confirmar exclusão" size="sm">
        <p className="text-sm text-gray-300 mb-5">
          Deletar <strong className="text-white">{confirmDelete?.name}</strong>? Todos os cards e lorebook entries serão removidos.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)} className="flex-1">
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDelete} className="flex-1">
            Deletar
          </Button>
        </div>
      </Modal>
    </div>
  )
}
