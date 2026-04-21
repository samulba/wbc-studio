'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Check } from 'lucide-react'
import { syncAlleProdukteImRaum } from '@/app/actions/produkte'

export default function TimelineSyncButton({
  raumId,
  projektId,
}: {
  raumId:    string
  projektId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [erfolg, setErfolg] = useState<string | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  function handleClick() {
    setErfolg(null)
    setFehler(null)
    startTransition(async () => {
      const res = await syncAlleProdukteImRaum(raumId, projektId)
      if (res.error) {
        setFehler(res.error)
      } else {
        setErfolg(`${res.anzahl} Produkt${res.anzahl === 1 ? '' : 'e'} synchronisiert`)
      }
      router.refresh()
      setTimeout(() => {
        setErfolg(null)
        setFehler(null)
      }, 4000)
    })
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors disabled:opacity-50"
        title="Alle Produkte dieses Raums mit der Timeline synchronisieren"
      >
        {erfolg ? (
          <><Check className="w-3 h-3 text-emerald-500" /> {erfolg}</>
        ) : (
          <>
            <RefreshCw className={`w-3 h-3 ${isPending ? 'animate-spin' : ''}`} />
            {isPending ? 'Synchronisiere…' : 'Timeline neu laden'}
          </>
        )}
      </button>
      {fehler && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-md bg-red-600 text-white text-sm px-4 py-3 rounded-xl shadow-2xl">
          {fehler}
        </div>
      )}
    </>
  )
}
