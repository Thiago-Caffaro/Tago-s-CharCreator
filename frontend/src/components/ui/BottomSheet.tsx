import React, { useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  /** Extra padding at bottom (default true — adds safe-area inset) */
  safeArea?: boolean
}

/**
 * Slide-up bottom sheet with backdrop.
 * Usage: wrap any content that should appear as a mobile panel.
 */
export function BottomSheet({ open, onClose, title, children, safeArea = true }: Props) {
  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="relative bg-[#1a1a1a] rounded-t-2xl border-t border-[#2a2a2a] shadow-2xl sheet-up"
        style={{ paddingBottom: safeArea ? 'env(safe-area-inset-bottom, 0px)' : undefined }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#444]" />
        </div>

        {title && (
          <div className="px-5 pb-3 border-b border-[#2a2a2a]">
            <h2 className="text-sm font-semibold text-gray-200">{title}</h2>
          </div>
        )}

        {children}
      </div>
    </div>
  )
}
