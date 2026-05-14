import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Download, Trash2, Wand2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { lorebookApi } from '../api/lorebook'
import { generationApi } from '../api/generation'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Textarea } from '../components/ui/Textarea'
import { EntryForm } from '../components/lorebook/EntryForm'
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
      name: 'Nova Entry',
      keys: '[]', secondary_keys: '[]',
      content: '', enabled: true,
      insertion_order: 10, position: 1,
      constant: false, selective: false,
      probability: 100, depth: 4, comment: '',
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

  const handleDelete = async (entry: LorebookEntry) => {
    await lorebookApi.delete(entry.id)
    setEntries(e => e.filter(x => x.id !== entry.id))
    if (selected?.id === entry.id) setSelected(null)
    toast.success('Entry removida')
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
            name: e.name || '',
            keys: JSON.stringify(e.keys || []),
            secondary_keys: JSON.stringify(e.secondary_keys || []),
            content: e.content || '',
            enabled: e.enabled ?? true,
            insertion_order: e.insertion_order ?? 10,
            position: e.position ?? 1,
            constant: e.constant ?? false,
            selective: e.selective ?? false,
            probability: e.probability ?? 100,
            depth: e.depth ?? 4,
            comment: e.comment || '',
          })
          setEntries(prev => [...prev, created])
        }
        toast.success(`${parsed.length} entries geradas!`)
        setShowGenModal(false)
      }
    } catch {
      toast.error('Erro ao gerar entries')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a2a]">
          <span className="text-sm font-semibold text-gray-200">
            Lorebook <span className="text-gray-600 font-normal">({entries.length})</span>
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowGenModal(true)}>
              <Wand2 size={13} /> Gerar Entries
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

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <span className="w-5 h-5 border-2 border-[#9b59b6] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-sm">Nenhuma entry ainda</div>
          ) : (
            <table className="w-full text-xs">
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
                        <button
                          className="text-gray-600 hover:text-red-400 p-1 rounded transition-colors"
                          onClick={() => handleDelete(entry)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected && (
        <EntryForm
          entry={selected}
          onClose={() => setSelected(null)}
          onSave={handleSave}
        />
      )}

      <Modal open={showGenModal} onClose={() => setShowGenModal(false)} title="Gerar Entries de Lorebook" size="md">
        <div className="space-y-4">
          <Textarea
            label="Descreva o que gerar"
            placeholder="ex: 3 entries sobre os poderes mágicos da personagem, 2 sobre locais importantes..."
            rows={4}
            value={genDescription}
            onChange={e => setGenDescription(e.target.value)}
          />
          {streamText && (
            <pre className="text-xs text-gray-400 font-mono max-h-40 overflow-auto bg-[#1a1a1a] rounded-lg p-3">
              {streamText}
            </pre>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowGenModal(false)}>Cancelar</Button>
            <Button loading={generating} onClick={handleGenerate} disabled={!genDescription.trim()}>
              <Wand2 size={13} /> Gerar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
