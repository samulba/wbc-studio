'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { MessageCircle, ChevronRight } from 'lucide-react'
import ChatBlock from '@/components/ChatBlock'
import type { ClientNachricht } from '@/lib/supabase/types'
import type { ChatUebersichtEintrag } from '@/app/actions/nachrichten'

interface Props {
  uebersicht:         ChatUebersichtEintrag[]
  aktiverEintrag:     ChatUebersichtEintrag | null
  initialNachrichten: ClientNachricht[]
}

export default function ChatsClient({ uebersicht, aktiverEintrag, initialNachrichten }: Props) {
  const router       = useRouter()
  const searchParams = useSearchParams()

  function wechsle(projektId: string) {
    const next = new URLSearchParams(searchParams.toString())
    next.set('projekt', projektId)
    router.replace(`/dashboard/chats?${next.toString()}`, { scroll: false })
  }

  if (uebersicht.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
        <div className="w-14 h-14 rounded-2xl bg-wellbeing-cream flex items-center justify-center">
          <MessageCircle className="w-6 h-6 text-wellbeing-green-light" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Noch keine Chats</p>
          <p className="text-xs text-gray-400 mt-1 max-w-sm">
            Chats erscheinen automatisch, sobald du für einen Kunden das Portal aktivierst —
            der Kunde kann dir dann direkt Nachrichten senden.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 min-h-0">
      {/* Links: Projekt-Liste */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col min-h-0">
        <div className="px-4 py-3 border-b border-gray-100 shrink-0">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-500">
            Projekte mit Portal
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {uebersicht.map((e) => {
            const aktiv = aktiverEintrag?.projektId === e.projektId
            return (
              <button
                key={e.projektId}
                type="button"
                onClick={() => wechsle(e.projektId)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 transition-colors ${
                  aktiv
                    ? 'bg-wellbeing-green/5 border-l-2 border-l-wellbeing-green'
                    : 'hover:bg-gray-50 border-l-2 border-l-transparent'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-wellbeing-cream flex items-center justify-center shrink-0 text-[11px] font-semibold text-wellbeing-green">
                    {initials(e.kundeName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate flex-1">
                        {e.projektName}
                      </p>
                      {e.unreadAdmin > 0 && (
                        <span className="shrink-0 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                          {e.unreadAdmin > 99 ? '99+' : e.unreadAdmin}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{e.kundeName}</p>
                    {e.letzteNachricht ? (
                      <p className="text-xs text-gray-500 truncate mt-1">{e.letzteNachricht}</p>
                    ) : (
                      <p className="text-xs text-gray-300 italic mt-1">Noch keine Nachrichten</p>
                    )}
                    {e.letzteAktivitaet && (
                      <p className="text-[10px] text-gray-300 mt-0.5">
                        {formatRelativ(e.letzteAktivitaet)}
                      </p>
                    )}
                  </div>
                  {aktiv && <ChevronRight className="w-4 h-4 text-wellbeing-green shrink-0 mt-1" />}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Rechts: aktiver Chat */}
      <div className="min-h-0 min-w-0 flex flex-col">
        {aktiverEintrag ? (
          <ChatBlock
            key={aktiverEintrag.projektId}
            projektId={aktiverEintrag.projektId}
            kundeName={aktiverEintrag.kundeName}
            initialNachrichten={initialNachrichten}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-center text-gray-400 text-sm">
            <MessageCircle className="w-8 h-8 text-gray-200" />
            <p>Wähle links einen Chat</p>
          </div>
        )}
      </div>
    </div>
  )
}

function initials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?'
}

function formatRelativ(iso: string): string {
  const d = new Date(iso)
  const diffMin = (Date.now() - d.getTime()) / 1000 / 60
  if (diffMin < 1) return 'jetzt'
  if (diffMin < 60) return `vor ${Math.floor(diffMin)} Min.`
  if (diffMin < 60 * 24) return `vor ${Math.floor(diffMin / 60)} Std.`
  const diffTage = Math.floor(diffMin / (60 * 24))
  if (diffTage === 1) return 'gestern'
  if (diffTage < 7) return `vor ${diffTage} Tagen`
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}
