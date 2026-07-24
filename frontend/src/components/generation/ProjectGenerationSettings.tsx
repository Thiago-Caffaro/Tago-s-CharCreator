import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useProjectStore } from '../../store/useProjectStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { ModelPicker } from '../../pages/Settings'

interface Props {
  projectId: number
  open: boolean
  onClose: () => void
}

export function ProjectGenerationSettings({ projectId, open, onClose }: Props) {
  const { currentProject, updateProject } = useProjectStore()
  const { settings, fetchSettings } = useSettingsStore()
  const [model, setModel] = useState('')
  const [temperature, setTemperature] = useState('')
  const [topP, setTopP] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (!settings) fetchSettings().catch(() => {})
    setModel(currentProject?.gen_model ?? '')
    setTemperature(currentProject?.gen_temperature != null ? String(currentProject.gen_temperature) : '')
    setTopP(currentProject?.gen_top_p != null ? String(currentProject.gen_top_p) : '')
  }, [open, currentProject])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProject(projectId, {
        gen_model: model.trim() || null,
        gen_temperature: temperature.trim() === '' ? null : Number(temperature),
        gen_top_p: topP.trim() === '' ? null : Number(topP),
      })
      toast.success('Configuração de geração salva!')
      onClose()
    } catch {
      toast.error('Erro ao salvar configuração')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Geração — Este Projeto" size="md">
      <div className="space-y-4">
        <p className="text-xs text-gray-500">
          Substitui a configuração global apenas para este projeto. Deixe em branco para usar o padrão
          — útil para dar um "tom" diferente a um personagem específico (ex: mais caótico/criativo com
          temperature mais alta).
        </p>

        <ModelPicker
          value={model}
          onChange={setModel}
          label={`Modelo${settings ? ` — padrão: ${settings.default_model}` : ''}`}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={`Temperature${settings ? ` (padrão: ${settings.temperature})` : ''}`}
            type="number"
            step="0.05"
            min="0"
            max="2"
            value={temperature}
            onChange={e => setTemperature(e.target.value)}
            placeholder={settings ? String(settings.temperature) : ''}
          />
          <Input
            label={`Top P${settings ? ` (padrão: ${settings.top_p})` : ''}`}
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={topP}
            onChange={e => setTopP(e.target.value)}
            placeholder={settings ? String(settings.top_p) : ''}
          />
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={saving} onClick={handleSave}>Salvar</Button>
        </div>
      </div>
    </Modal>
  )
}
