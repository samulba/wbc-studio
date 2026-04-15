'use client'

import { useState, useTransition } from 'react'
import { ConfirmModal } from '@/components/ConfirmModal'

interface Props {
  action: (formData: FormData) => void | Promise<void>
  label?: string
  confirmMessage: string
  confirmTitle?: string
  className?: string
}

export default function ConfirmDeleteButton({
  action,
  label = 'Löschen',
  confirmMessage,
  confirmTitle = 'Wirklich löschen?',
  className = 'px-4 py-2 text-xs text-red-500/70 hover:text-red-600 transition-colors',
}: Props) {
  const [offen, setOffen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleBestaetigen() {
    setOffen(false)
    startTransition(async () => {
      await action(new FormData())
    })
  }

  return (
    <>
      <ConfirmModal
        isOpen={offen}
        onClose={() => setOffen(false)}
        onConfirm={handleBestaetigen}
        title={confirmTitle}
        message={confirmMessage}
        confirmText="Löschen"
        isLoading={isPending}
      />
      <button
        type="button"
        onClick={() => setOffen(true)}
        disabled={isPending}
        className={className}
      >
        {label}
      </button>
    </>
  )
}
