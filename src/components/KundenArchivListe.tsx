'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, RotateCcw, Mail } from 'lucide-react'
import { kundeWiederherstellen } from '@/app/actions/kunden'

interface ArchivKunde {
  id:         string
  name:       string
  email:      string | null
  deleted_at: string
}

export default function KundenArchivListe({ kunden }: { kunden: ArchivKunde[] }) {
  const router = useRouter()
  const [fehler, setFehler] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleWiederherstellen(id: string) {
    setFehler(null)
    setPendingId(id)
    startTransition(async () => {
      const res = await kundeWiederherstellen(id)
      setPendingId(null)
      if (res.fehler) { setFehler(res.fehler); return }
      router.refresh()
    })
  }

  if (kunden.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
          <Archive className="w-6 h-6 text-gray-300" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">Archiv ist leer</p>
          <p className="text-xs text-gray-400 mt-1">Gelöschte Kunden tauchen hier auf und können wiederhergestellt werden.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {fehler && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{fehler}</p>}

      {kunden.map((k) => {
        const geloeschtVor = formatRelativ(k.deleted_at)
        const isPending = pendingId === k.id
        return (
          <div key={k.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 hover:shadow-sm transition-shadow">
            <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
              <Archive className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{k.name}</p>
              <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                {k.email && (
                  <span className="flex items-center gap-1 truncate">
                    <Mail className="w-3 h-3 shrink-0" />
                    <span className="truncate">{k.email}</span>
                  </span>
                )}
                <span className="shrink-0">Gelöscht {geloeschtVor}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleWiederherstellen(k.id)}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-wellbeing-green border border-wellbeing-green/30 hover:bg-wellbeing-green/5 rounded-lg transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3 h-3" />
              {isPending ? 'Wird wiederhergestellt…' : 'Wiederherstellen'}
            </button>
          </div>
        )
      })}

      <p className="text-[11px] text-gray-400 text-center pt-4">
        Archivierte Kunden bleiben 30 Tage wiederherstellbar.
      </p>
    </div>
  )
}

function formatRelativ(iso: string): string {
  const datum = new Date(iso)
  const diffMin = (Date.now() - datum.getTime()) / 1000 / 60
  if (diffMin < 60) return 'gerade eben'
  if (diffMin < 60 * 24) return `vor ${Math.floor(diffMin / 60)} Std.`
  const diffTage = Math.floor(diffMin / (60 * 24))
  if (diffTage === 1) return 'gestern'
  if (diffTage < 30) return `vor ${diffTage} Tagen`
  return datum.toLocaleDateString('de-DE')
}
