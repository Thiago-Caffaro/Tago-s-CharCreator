import React, { useState } from 'react'
import { Download, Trash2, Star } from 'lucide-react'
import type { GeneratedImage } from '../../api/images'
import { projectImagesApi } from '../../api/images'
import { useImageStore } from '../../store/useImageStore'
import { ImageLightbox } from './ImageLightbox'

interface CardProps {
  image: GeneratedImage
  onClick: () => void
}

function ImageCard({ image, onClick }: CardProps) {
  const { deleteImage, setAvatarImage } = useImageStore()

  function handleDownload(e: React.MouseEvent) {
    e.stopPropagation()
    const a = document.createElement('a')
    a.href = projectImagesApi.fileUrl(image.id)
    a.download = image.filename
    a.click()
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (confirm('Excluir esta imagem?')) {
      await deleteImage(image.id)
    }
  }

  async function handleSetAvatar(e: React.MouseEvent) {
    e.stopPropagation()
    await setAvatarImage(image.id)
  }

  return (
    <div
      onClick={onClick}
      className="relative group aspect-square rounded-lg overflow-hidden cursor-pointer border border-[#2a2a2a] hover:border-[#9b59b6]/40 transition-colors"
    >
      <img
        src={projectImagesApi.fileUrl(image.id)}
        alt="generated"
        loading="lazy"
        className="w-full h-full object-cover"
      />

      {image.is_avatar && (
        <div className="absolute top-1.5 left-1.5 bg-[#9b59b6] rounded-full p-1">
          <Star size={10} className="text-white fill-white" />
        </div>
      )}

      {/* Action overlay on hover */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-end justify-center pb-2 gap-2 opacity-0 group-hover:opacity-100">
        <button
          onClick={handleDownload}
          title="Download"
          className="bg-black/60 rounded-full p-1.5 text-gray-300 hover:text-white transition-colors"
        >
          <Download size={13} />
        </button>
        {!image.is_avatar && (
          <button
            onClick={handleSetAvatar}
            title="Definir como avatar"
            className="bg-black/60 rounded-full p-1.5 text-[#9b59b6] hover:text-white transition-colors"
          >
            <Star size={13} />
          </button>
        )}
        <button
          onClick={handleDelete}
          title="Excluir"
          className="bg-black/60 rounded-full p-1.5 text-red-400 hover:text-red-300 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

interface Props {
  images: GeneratedImage[]
  loading: boolean
}

export function ImageGallery({ images, loading }: Props) {
  const [lightboxImage, setLightboxImage] = useState<GeneratedImage | null>(null)

  if (loading) {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-lg bg-[#1e1e1e] animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-600 p-8">
        <p className="text-sm">Nenhuma imagem gerada ainda</p>
        <p className="text-xs">Configure o prompt e clique em Gerar Imagem</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 p-4 content-start">
        {images.map((img) => (
          <ImageCard key={img.id} image={img} onClick={() => setLightboxImage(img)} />
        ))}
      </div>

      {lightboxImage && (
        <ImageLightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />
      )}
    </>
  )
}
