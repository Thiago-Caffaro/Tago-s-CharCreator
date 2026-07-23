import React from 'react'
import { Modal } from './Modal'
import { Button } from './Button'

interface Props {
  open: boolean
  title?: string
  message: React.ReactNode
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  open, title = 'Confirmar exclusão', message, confirmLabel = 'Deletar', onConfirm, onCancel,
}: Props) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <p className="text-sm text-gray-300 mb-5">{message}</p>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onCancel} className="flex-1">Cancelar</Button>
        <Button variant="danger" onClick={onConfirm} className="flex-1">{confirmLabel}</Button>
      </div>
    </Modal>
  )
}
