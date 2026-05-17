import React, { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Image as ImageIcon, Loader2 } from 'lucide-react'
import { useImageStore } from '../store/useImageStore'
import { ProviderToggle } from '../components/image-generator/ProviderToggle'
import { PresetSelector } from '../components/image-generator/PresetSelector'
import { ModelSelect } from '../components/image-generator/ModelSelect'
import { DimensionControls } from '../components/image-generator/DimensionControls'
import { AdvancedSettings } from '../components/image-generator/AdvancedSettings'
import { ImageReferenceInput } from '../components/image-generator/ImageReferenceInput'
import { ImageGallery } from '../components/image-generator/ImageGallery'

export default function ImageGenerator() {
  const { projectId } = useParams<{ projectId: string }>()
  const pid = Number(projectId)

  const {
    provider,
    prompt,
    setPrompt,
    negativePrompt,
    setNegativePrompt,
    generating,
    generate,
    fetchImages,
    fetchPresets,
    images,
    loadingImages,
  } = useImageStore()

  useEffect(() => {
    fetchImages(pid)
    fetchPresets()
  }, [pid]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGenerate() {
    await generate(pid)
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left control panel ───────────────────────────────────── */}
      <div className="w-[420px] shrink-0 border-r border-[#2a2a2a] bg-[#141414] flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#2a2a2a] flex items-center gap-2">
          <ImageIcon size={16} className="text-[#9b59b6]" />
          <h2 className="text-sm font-semibold text-gray-100">Gerador de Imagens</h2>
        </div>

        <div className="flex-1 px-4 py-4 space-y-5">
          {/* Provider toggle */}
          <ProviderToggle />

          {/* Main prompt */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Descreva a imagem que você quer gerar..."
              rows={4}
              className="bg-[#1e1e1e] border border-[#333] text-gray-200 text-sm rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:border-[#9b59b6] placeholder-gray-600"
            />
          </div>

          {/* Negative prompt — OpenRouter only */}
          {provider === 'openrouter' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Prompt Negativo
              </label>
              <textarea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="O que evitar na imagem..."
                rows={2}
                className="bg-[#1e1e1e] border border-[#333] text-gray-200 text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-[#9b59b6] placeholder-gray-600"
              />
            </div>
          )}

          {/* Style presets */}
          <PresetSelector />

          <div className="border-t border-[#2a2a2a]" />

          {/* Model */}
          <ModelSelect />

          {/* Dimensions */}
          <DimensionControls />

          {/* Advanced settings */}
          <AdvancedSettings />

          {/* Image reference */}
          <ImageReferenceInput />
        </div>

        {/* Generate button */}
        <div className="px-4 py-4 border-t border-[#2a2a2a]">
          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-colors ${
              generating || !prompt.trim()
                ? 'bg-[#9b59b6]/30 text-[#9b59b6]/50 cursor-not-allowed'
                : 'bg-[#9b59b6] hover:bg-[#8e44ad] text-white'
            }`}
          >
            {generating ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <ImageIcon size={15} />
                Gerar Imagem
              </>
            )}
          </button>
          {generating && (
            <p className="text-center text-xs text-gray-600 mt-2">
              {provider === 'kie_ai'
                ? 'Kie.ai pode levar 30–60s...'
                : 'Aguardando resposta do OpenRouter...'}
            </p>
          )}
        </div>
      </div>

      {/* ── Right gallery panel ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-[#0f0f0f] overflow-y-auto">
        <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {images.length} {images.length === 1 ? 'imagem' : 'imagens'} geradas
          </span>
        </div>
        <ImageGallery images={images} loading={loadingImages} />
      </div>
    </div>
  )
}
