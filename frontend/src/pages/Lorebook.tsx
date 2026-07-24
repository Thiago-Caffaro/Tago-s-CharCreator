import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Download, Upload, Trash2, Copy, Wand2, BookOpen, ChevronRight, FlaskConical } from 'lucide-react'
import toast from 'react-hot-toast'
import { lorebookApi } from '../api/lorebook'
import { generationApi } from '../api/generation'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { Textarea } from '../components/ui/Textarea'
import { EntryForm } from '../components/lorebook/EntryForm'
import { KeywordTester } from '../components/lorebook/KeywordTester'
import type { LorebookEntry } from '../types'

export default function Lorebook() {
  const { projectId } = useParams<{ projectId: string }>()
  const id = Number(projectId)
  const [entries, setEntries] = useState<LorebookEntry[]>([])
  const [selected, setSelected] = useState<LorebookEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [showGenModal, setShowGenModal] = useState(false)
  const [genDescription, setGenDescription] = useState('')
  const [generating, setGenerating] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<LorebookEntry | null>(null)
  const [showTester, setShowTester] = useState(false)
  const [importing, setImporting] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    try {
      const data = await lorebookApi.list(id)
      setEntries(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const handleCreate = async () => {
    const entry = await lorebookApi.create(id, {
      name: 'Nova Entry', keys: '[]', secondary_keys: '[]',
      content: '', enabled: true, insertion_order: 10, position: 1,
      constant: false, selective: false, probability: 100, depth: 4, comment: '',
    })
    setEntries(e => [...e, entry])
    setSelected(entry)
  }

  const handleSave = async (entryId: number, data: Partial<LorebookEntry>) => {
    const updated = await lorebookApi.update(entryId, data)
    setEntries(e => e.map(x => x.id === entryId ? updated : x))
    setSelected(updated)
    toast.success('Entry salva')
  }

  const requestDelete = (e: React.MouseEvent, entry: LorebookEntry) => {
    e.stopPropagation()
    setConfirmDelete(entry)
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await lorebookApi.delete(confirmDelete.id)
      setEntries(prev => prev.filter(x => x.id !== confirmDelete.id))
      if (selected?.id === confirmDelete.id) setSelected(null)
      toast.success('Entry removida')
    } catch {
      toast.error('Erro ao remover entry')
    } finally {
      setConfirmDelete(null)
    }
  }

  const handleDuplicate = async (e: React.MouseEvent, entry: LorebookEntry) => {
    e.stopPropagation()
    try {
      const created = await lorebookApi.create(id, {
        name: `${entry.name} (cópia)`,
        keys: entry.keys,
        secondary_keys: entry.secondary_keys,
        content: entry.content,
        enabled: entry.enabled,
        insertion_order: entry.insertion_order,
        position: entry.position,
        constant: entry.constant,
        selective: entry.selective,
        probability: entry.probability,
        depth: entry.depth,
        comment: entry.comment,
      })
      setEntries(prev => [...prev, created])
      toast.success('Entry duplicada')
    } catch {
      toast.error('Erro ao duplicar entry')
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
      if (!data.entries) {
        toast.error('Arquivo inválido — não contém entries de lorebook')
        return
      }
      const result = await lorebookApi.importLorebook(id, data)
      await load()
      toast.success(`${result.imported} entrie(s) importada(s)!`)
    } catch {
      toast.error('Erro ao importar lorebook')
    } finally {
      setImporting(false)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setStreamText('')
    try {
      const result = await generationApi.lorebook(id, genDescription, chunk => setStreamText(t => t + chunk))
      const parsed = JSON.parse(result)
      if (Array.isArray(parsed)) {
        for (const e of parsed) {
          const created = await lorebookApi.create(id, {
            name: e.name || '', keys: JSON.stringify(e.keys || []),
            secondary_keys: JSON.stringify(e.secondary_keys || []),
            content: e.content || '', enabled: e.enabled ?? true,
            insertion_order: e.insertion_order ?? 10, position: e.position ?? 1,
            constant: e.constant ?? false, selective: e.selective ?? false,
            probability: e.probability ?? 100, depth: e.depth ?? 4, comment: e.comment || '',
          })
          setEntries(prev => [...prev, created])
        }
        toast.success(`${parsed.length} entries geradas!`)
        setShowGenModal(false)
      } else {
        toast.error('A IA retornou um formato inesperado — tente novamente')
      }
    } catch {
      toast.error('Erro ao gerar entries')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex h-full">
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">

      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportFile}
      />

      {/* Desktop toolbar */}
      <div className="hidden lg:flex items-center justify-between px-5 py-3 border-b border-[#2a2a2a] shrink-0">
        <span className="text-sm font-semibold text-gray-200">
          Lorebook <span className="text-gray-600 font-normal">({entries.length})</span>
        </span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowTester(true)}>
            <FlaskConical size={13} /> Testar Keywords
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowGenModal(true)}>
            <Wand2 size={13} /> Gerar Entries
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => importRef.current?.click()}
            loading={importing}
          >
            <Upload size={13} /> Importar
          </Button>
          <a href={lorebookApi.exportUrl(id)} download>
            <Button variant="secondary" size="sm">
              <Download size={13} /> Exportar
            </Button>
          </a>
          <Button size="sm" onClick={handleCreate}>
            <Plus size={13} /> Nova Entry
          </Button>
        </div>
      </div>

      {/* Mobile toolbar */}
      <div className="flex lg:hidden items-center gap-2 px-4 py-3 border-b border-[#2a2a2a] bg-[#1a1a1a] shrink-0">
        <span className="text-sm font-semibold text-gray-200 flex-1">
          Lorebook <span className="text-gray-600 font-normal text-xs">({entries.length})</span>
        </span>
        <a href={lorebookApi.exportUrl(id)} download>
          <button className="flex items-center justify-center w-9 h-9 rounded-xl border border-[#333]
            bg-[#1e1e1e] text-gray-400 active:bg-[#2a2a2a] transition-colors">
            <Download size={15} />
          </button>
        </a>
        <button
          onClick={() => setShowTester(true)}
          className="flex items-center justify-center w-9 h-9 rounded-xl border border-[#333]
            bg-[#1e1e1e] text-gray-400 active:bg-[#2a2a2a] transition-colors"
          title="Testar keywords"
        >
          <FlaskConical size={15} />
        </button>
        <button
          onClick={() => importRef.current?.click()}
          disabled={importing}
          className="flex items-center justify-center w-9 h-9 rounded-xl border border-[#333]
            bg-[#1e1e1e] text-gray-400 active:bg-[#2a2a2a] transition-colors disabled:opacity-50"
          title="Importar lorebook"
        >
          {importing
            ? <span className="w-3.5 h-3.5 border-2 border-[#9b59b6] border-t-transparent rounded-full animate-spin" />
            : <Upload size={15} />
          }
        </button>
        <button
          onClick={() => setShowGenModal(true)}
          className="flex items-center justify-center w-9 h-9 rounded-xl border border-[#333]
            bg-[#1e1e1e] text-gray-400 active:bg-[#2a2a2a] transition-colors"
          title="Gerar entries com IA"
        >
          <Wand2 size={15} />
        </button>
        <button
          onClick={handleCreate}
          className="flex items-center justify-center w-9 h-9 rounded-xl
            bg-[#9b59b6] text-white active:bg-[#8e44ad] transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="w-6 h-6 border-2 border-[#9b59b6] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a]
              flex items-center justify-center mb-3">
              <BookOpen size={24} className="text-gray-600" />
            </div>
            <p className="text-gray-500 text-sm">Nenhuma entry ainda</p>
            <button
              onClick={handleCreate}
              className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl
                bg-[#9b59b6] text-white text-sm font-medium active:bg-[#8e44ad]"
            >
              <Plus size={14} /> Nova Entry
            </button>
          </div>
        ) : (
          <>
          {/* Desktop table */}
          <table className="hidden lg:table w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-[#2a2a2a]">
                <th className="text-left py-2 px-3 font-medium">Nome</th>
                <th className="text-left py-2 px-3 font-medium">Keywords</th>
                <th className="text-left py-2 px-3 font-medium">Conteúdo</th>
                <th className="text-left py-2 px-3 font-medium">Status</th>
                <th className="py-2 px-3" />
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => {
                const keys = JSON.parse(entry.keys || '[]') as string[]
                return (
                  <tr
                    key={entry.id}
                    className="border-b border-[#1e1e1e] hover:bg-[#1e1e1e] cursor-pointer transition-colors"
                    onClick={() => setSelected(entry)}
                  >
                    <td className="py-2 px-3 text-gray-300 font-medium">{entry.name || '—'}</td>
                    <td className="py-2 px-3 text-gray-500">{keys.slice(0, 3).join(', ')}{keys.length > 3 ? '...' : ''}</td>
                    <td className="py-2 px-3 text-gray-600 max-w-[200px] truncate">{entry.content}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${entry.enabled ? 'bg-green-900/30 text-green-400' : 'bg-gray-900/30 text-gray-500'}`}>
                        {entry.enabled ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-2 px-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          className="text-gray-600 hover:text-gray-300 p-1 rounded transition-colors"
                          title="Duplicar entry"
                          onClick={e => handleDuplicate(e, entry)}
                        >
                          <Copy size={12} />
                        </button>
                        <button
                          className="text-gray-600 hover:text-red-400 p-1 rounded transition-colors"
                          onClick={e => requestDelete(e, entry)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Mobile card list */}
          <div className="lg:hidden space-y-2">
            {entries.map(entry => {
              const keys = JSON.parse(entry.keys || '[]') as string[]
              return (
                <div
                  key={entry.id}
                  onClick={() => setSelected(entry)}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4
                    active:bg-[#1e1e1e] transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-200 truncate">
                          {entry.name || '—'}
                        </span>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium
                          ${entry.enabled
                            ? 'bg-green-900/30 text-green-400'
                            : 'bg-gray-900/40 text-gray-500'
                          }`}>
                          {entry.enabled ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      {keys.length > 0 && (
                        <p className="text-[11px] text-[#9b59b6] mb-1">
                          {keys.slice(0, 4).join(', ')}{keys.length > 4 ? '…' : ''}
                        </p>
                      )}
                      {entry.content && (
                        <p className="text-xs text-gray-600 line-clamp-2">{entry.content}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={e => handleDuplicate(e, entry)}
                        className="flex items-center justify-center w-8 h-8 rounded-xl
                          text-gray-600 active:bg-[#2a2a2a] active:text-gray-300 transition-colors"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={e => requestDelete(e, entry)}
                        className="flex items-center justify-center w-8 h-8 rounded-xl
                          text-gray-600 active:bg-red-900/20 active:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                      <ChevronRight size={14} className="text-gray-700" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          </>
        )}
      </div>
    </div>

      {/* Desktop: entry editor as a sidebar */}
      {selected && (
        <div className="hidden lg:block">
          <EntryForm
            entry={selected}
            onClose={() => setSelected(null)}
            onSave={handleSave}
            desktop
          />
        </div>
      )}

      {/* Mobile: entry editor as a full-screen overlay */}
      {selected && (
        <div className="lg:hidden fixed inset-0 z-50 bg-[#0f0f0f] flex flex-col overlay-up"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <EntryForm
            entry={selected}
            onClose={() => setSelected(null)}
            onSave={handleSave}
          />
        </div>
      )}

      {/* Generate modal */}
      <Modal
        open={showGenModal}
        onClose={() => { if (!generating) setShowGenModal(false) }}
        title="Gerar Entries com IA"
        size="md"
      >
        <div className="space-y-4">
          <Textarea
            label="Descreva o que gerar"
            placeholder="ex: 3 entries sobre os poderes mágicos da personagem, 2 sobre locais importantes..."
            rows={4}
            value={genDescription}
            onChange={e => setGenDescription(e.target.value)}
          />
          {streamText && (
            <pre className="text-xs text-gray-400 font-mono max-h-40 overflow-auto bg-[#1a1a1a] rounded-xl p-3">
              {streamText}
            </pre>
          )}
          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              onClick={() => setShowGenModal(false)}
              disabled={generating}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              loading={generating}
              onClick={handleGenerate}
              disabled={generating || !genDescription.trim()}
              className="flex-1"
            >
              <Wand2 size={13} /> Gerar
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!confirmDelete}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        message={<>Deletar a entry <strong className="text-white">{confirmDelete?.name || 'sem nome'}</strong>?</>}
      />

      <KeywordTester open={showTester} onClose={() => setShowTester(false)} entries={entries} />
    </div>
  )
}
