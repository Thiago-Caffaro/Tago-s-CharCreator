import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Folder, Trash2, Edit2, User, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { useProjectStore } from '../store/useProjectStore'
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Projetos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {projects.length} projeto{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Novo Projeto
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="w-6 h-6 border-2 border-[#9b59b6] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Folder size={48} className="text-gray-700 mb-4" />
          <p className="text-gray-400 text-sm">Nenhum projeto ainda</p>
          <p className="text-gray-600 text-xs mt-1">Crie seu primeiro projeto para começar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
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
      )}

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
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button loading={saving} onClick={handleCreate} disabled={!form.name.trim()}>
              Criar Projeto
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Confirmar exclusão" size="sm">
        <p className="text-sm text-gray-300 mb-4">
          Deletar <strong>{confirmDelete?.name}</strong>? Todos os context cards e lorebook entries serão removidos.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete}>Deletar</Button>
        </div>
      </Modal>
    </div>
  )
}
