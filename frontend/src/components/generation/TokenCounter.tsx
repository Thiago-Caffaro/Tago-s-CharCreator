import React, { useEffect, useCallback } from 'react'
import { Hash } from 'lucide-react'
import { generationApi } from '../../api/generation'
import { useGenerationStore } from '../../store/useGenerationStore'

interface Props {
  projectId: number
}

export function TokenCounter({ projectId }: Props) {
  const { tokenEstimate, selectedPresetId, setTokenEstimate } = useGenerationStore()

  const estimate = useCallback(async () => {
    try {
      const n = await generationApi.tokenEstimate(projectId, selectedPresetId ?? undefined)
      setTokenEstimate(n)
    } catch {
      // silently ignore
    }
  }, [projectId, selectedPresetId])

  useEffect(() => { estimate() }, [estimate])

  if (!tokenEstimate) return null

  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500">
      <Hash size={11} />
      <span>~{tokenEstimate.toLocaleString()} tokens de entrada</span>
    </div>
  )
}
