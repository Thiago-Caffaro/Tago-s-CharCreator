import React, { useEffect } from 'react'
import { X, Download, Star, Trash2 } from 'lucide-react'
import type { GeneratedImage } from '../../api/images'
import { projectImagesApi } from '../../api/images'
import { useImageStore } from '../../store/useImageStore'

interface Props {
  image: GeneratedImage
  onClose: () => void
}

export function ImageLightbox({ image, onClose }: Props) {
  const { deleteImage, setAvatarImage } = useImageStore()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleDownload() {
    const a = document.createElement('a')
    a.href = projectImagesApi.fileUrl(image.id)
    a.download = image.filename
    a.click()
  }

  async function handleDelete() {
    await deleteImage(image.id)
    onClose()
  }

  async function handleSetAvatar() {
    await setAvatarImage(image.id)
    onClose()
  }

  const date = new Date(image.created_at).toLocaleString('pt-BR')

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full max-h-[90vh] flex gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <div className="flex-1 flex items-center justify-center">
          <img
            src={projectImagesApi.fileUrl(image.id)}
            alt="generated"
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
          />
        </div>

        {/* Info panel */}
        <div className="w-64 flex-shrink-0 bg-[#1a1a1a] rounded-lg p-4 flex flex-col gap-4 overflow-y-auto max-h-[85vh]">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-200 transition-colors"
          >
            <X size={18} />
          </button>

          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Prompt</p>
            <p className="text-xs text-gray-300 leading-relaxed break-words">{image.prompt}</p>
          </div>

          {image.negative_prompt && (
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Negativo</p>
              <p className="text-xs text-gray-500 leading-relaxed break-words">
                {image.negative_prompt}
              </p>
            </div>
          )}

          <div className="space-y-1 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>Modelo</span>
              <span className="text-gray-300 truncate max-w-[130px] text-right">{image.model}</span>
            </div>
            <div className="flex justify-between">
              <span>Provedor</span>
              <span className="text-gray-300">
                {image.provider === 'kie_ai' ? 'Kie.ai' : 'OpenRouter'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Dimensões</span>
              <span className="text-gray-300">
                {image.width}×{image.height}
              </span>
            </div>
            {image.seed !== null && (
              <div className="flex justify-between">
                <span>Seed</span>
                <span className="text-gray-300">{image.seed}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Data</span>
              <span className="text-gray-300">{date}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-auto pt-2 border-t border-[#2a2a2a]">
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#242424] text-gray-300 hover:text-white hover:bg-[#2a2a2a] text-sm transition-colors"
            >
              <Download size={14} /> Download
            </button>
            {!image.is_avatar && (
              <button
                onClick={handleSetAvatar}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#9b59b6]/20 text-[#9b59b6] hover:bg-[#9b59b6]/30 text-sm transition-colors"
              >
                <Star size={14} /> Definir como avatar
              </button>
            )}
            <button
              onClick={handleDelete}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-900/20 text-red-400 hover:bg-red-900/30 text-sm transition-colors"
            >
              <Trash2 size={14} /> Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
