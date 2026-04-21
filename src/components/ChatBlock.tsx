'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import type { ClientNachricht } from '@/lib/supabase/types'
import {
  getNachrichtenFuerProjekt,
  adminNachrichtenAlsGelesen,
} from '@/app/actions/nachrichten'
import { teamNachrichtSenden } from '@/app/actions/portal'

interface Props {
  projektId:          string
  kundeName:          string
  initialNachrichten: ClientNachricht[]
  /** Polling-Intervall in ms. Default 10s. Polling pausiert bei hidden tab. */
  pollingMs?:         number
  /** Kompaktere Darstellung (z.B. für Projekt-Detailseite). */
  compact?:           boolean
}

/**
 * Admin-Seite des Kunden-Portal-Chats. Zeigt bestehende Nachrichten,
 * markiert Kunden-Nachrichten als gelesen und ermöglicht dem Admin
 * zu antworten. Polling alle 10s mit document.hidden-Pause.
 *
 * UI-Konvention (gespiegelt zum Portal):
 *  - Admin-Nachrichten: rechts, wellbeing-green Bubble
 *  - Kunden-Nachrichten: links, hellgraue Bubble
 */
export default function ChatBlock({
  projektId,
  kundeName,
  initialNachrichten,
  pollingMs = 10_000,
  compact = false,
}: Props) {
  const [nachrichten, setNachrichten] = useState<ClientNachricht[]>(initialNachrichten)
  const [eingabe,     setEingabe]     = useState('')
  const [fehler,      setFehler]      = useState<string | null>(null)
  const [isSending,   startSend]      = useTransition()
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Mark-as-read beim ersten Mount + bei Projekt-Wechsel
  useEffect(() => {
    adminNachrichtenAlsGelesen(projektId).catch(() => { /* ignore */ })
  }, [projektId])

  // Polling + Hidden-Tab-Pause
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null

    async function refetch() {
      try {
        const fresh = await getNachrichtenFuerProjekt(projektId)
        setNachrichten(fresh)
      } catch { /* ignore */ }
    }

    function startPolling() {
      if (interval !== null) return
      interval = setInterval(refetch, pollingMs)
    }
    function stopPolling() {
      if (interval === null) return
      clearInterval(interval)
      interval = null
    }

    function onVisibility() {
      if (document.hidden) {
        stopPolling()
      } else {
        refetch()      // sofort eine Aktualisierung holen
        startPolling()
      }
    }

    if (!document.hidden) startPolling()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [projektId, pollingMs])

  // Auto-Scroll zum Ende bei neuer Nachricht
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [nachrichten.length])

  function handleSenden() {
    const text = eingabe.trim()
    if (!text || isSending) return
    setFehler(null)

    // Optimistisches Einfügen
    const temp: ClientNachricht = {
      id:              `temp-${Date.now()}`,
      organisation_id: null,
      projekt_id:      projektId,
      client_user_id:  null,
      team_user_id:    null,
      von_kunde:       false,
      nachricht:       text,
      gelesen:         false,
      gelesen_am:      null,
      created_at:      new Date().toISOString(),
    }
    setNachrichten((prev) => [...prev, temp])
    setEingabe('')

    startSend(async () => {
      const res = await teamNachrichtSenden(projektId, text)
      if (res.fehler) {
        setFehler(res.fehler)
        // Temp-Eintrag entfernen
        setNachrichten((prev) => prev.filter((n) => n.id !== temp.id))
        setEingabe(text)
        return
      }
      // Frische Daten vom Server holen (ersetzt Temp durch echte ID)
      try {
        const fresh = await getNachrichtenFuerProjekt(projektId)
        setNachrichten(fresh)
      } catch { /* ignore */ }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSenden()
    }
  }

  const boxHeight = compact ? 'h-80' : 'h-[520px]'

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-wellbeing-cream flex items-center justify-center">
          <MessageCircle className="w-4 h-4 text-wellbeing-green" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">Chat mit {kundeName}</p>
          <p className="text-[11px] text-gray-400">Aktualisiert alle {pollingMs / 1000}s</p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className={`flex-1 ${boxHeight} overflow-y-auto px-4 py-4 space-y-3 bg-gray-50/30`}
      >
        {nachrichten.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
            <MessageCircle className="w-8 h-8 text-gray-200" />
            <p className="text-sm text-gray-400">Noch keine Nachrichten</p>
            <p className="text-xs text-gray-300 max-w-xs">
              Schreib {kundeName} die erste Nachricht — sie erscheint sofort im Kundenportal.
            </p>
          </div>
        ) : (
          nachrichten.map((n) => {
            const ausAdmin = !n.von_kunde
            return (
              <div key={n.id} className={`flex ${ausAdmin ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
                  ausAdmin
                    ? 'bg-wellbeing-green text-white rounded-br-md'
                    : 'bg-white border border-gray-200 text-gray-700 rounded-bl-md'
                }`}>
                  <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap break-words">
                    {n.nachricht}
                  </p>
                  <p className={`text-[10px] mt-1 ${ausAdmin ? 'text-white/60' : 'text-gray-400'}`}>
                    {new Date(n.created_at).toLocaleString('de-DE', {
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="border-t border-gray-100 p-3 bg-white shrink-0">
        {fehler && (
          <p className="text-xs text-red-500 mb-2">{fehler}</p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={eingabe}
            onChange={(e) => setEingabe(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nachricht an den Kunden…"
            rows={1}
            disabled={isSending}
            className="flex-1 resize-none text-sm border border-gray-200 rounded-xl px-3 py-2.5 max-h-32 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light disabled:opacity-60"
          />
          <button
            type="button"
            onClick={handleSenden}
            disabled={!eingabe.trim() || isSending}
            className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
            aria-label="Senden"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">
          Enter = senden · Shift+Enter = Zeilenumbruch
        </p>
      </div>
    </div>
  )
}
