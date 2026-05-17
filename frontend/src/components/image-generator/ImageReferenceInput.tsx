import React, { useRef } from 'react'
import { Upload, X, Link } from 'lucide-react'
import { useImageStore, supportsImageRef } from '../../store/useImageStore'

function resizeToBase64(file: File, maxPx = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.9))
    }
    img.onerror = reject
    img.src = url
  })
}

export function ImageReferenceInput() {
  const {
    provider,
    selectedModel,
    imageRefB64,
    setImageRefB64,
    inputImageUrl,
    setInputImageUrl,
  } = useImageStore()

  const fileRef = useRef<HTMLInputElement>(null)
  const active = supportsImageRef(provider, selectedModel)

  async function handleFile(file: File) {
    try {
      const b64 = await resizeToBase64(file)
      setImageRefB64(b64)
    } catch {
      // ignore
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleFile(file)
  }

  if (provider === 'kie_ai') {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
          <Link size={11} />
          URL de Referência (opcional)
        </label>
        <input
          type="url"
          placeholder="https://..."
          value={inputImageUrl ?? ''}
          onChange={(e) => setInputImageUrl(e.target.value || null)}
          className="bg-[#1e1e1e] border border-[#333] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#9b59b6] placeholder-gray-600"
        />
        <p className="text-[11px] text-gray-600">
          URL pública acessível ao Kie.ai para edição/referência
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
        <Upload size={11} />
        Imagem de Referência
        {!active && (
          <span className="text-[10px] text-gray-600 normal-case font-normal">
            — requer modelo Pro Ultra
          </span>
        )}
      </label>

      {imageRefB64 ? (
        <div className="relative w-full h-28 rounded-lg overflow-hidden border border-[#333]">
          <img src={imageRefB64} alt="referência" className="w-full h-full object-cover" />
          <button
            onClick={() => setImageRefB64(null)}
            className="absolute top-1.5 right-1.5 bg-black/60 rounded-full p-1 text-gray-300 hover:text-white"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => active && fileRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-1.5 h-20 rounded-lg border border-dashed text-sm transition-colors ${
            active
              ? 'border-[#444] text-gray-500 hover:border-[#9b59b6] hover:text-gray-300 cursor-pointer'
              : 'border-[#2a2a2a] text-gray-700 cursor-not-allowed'
          }`}
        >
          <Upload size={16} />
          <span className="text-xs">Arrastar ou clicar para enviar</span>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
