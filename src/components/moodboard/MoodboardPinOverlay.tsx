'use client'

/**
 * Pin-Overlay: rendert Kommentar-Pins als HTML-Elemente ueber dem Canvas.
 * Positionen kommen in Welt-Koordinaten und werden via worldToScreen
 * in Screen-Pixel umgerechnet (mitfliegen mit Zoom + Pan).
 */

import { useState } from 'react'
import { MessageSquare, Check, Trash2, CornerDownRight, X, Loader2 } from 'lucide-react'
import type { MoodboardKommentar } from '@/lib/supabase/types'

interface Props {
  pins:           MoodboardKommentar[]
  // Welt → Screen Konverter
  worldToScreen:  (wx: number, wy: number) => { x: number; y: number } | null
  aktiverPinId:   string | null
  setAktiverPinId: (id: string | null) => void
  onAntworten:    (parentId: string, text: string) => Promise<boolean>
  onErledigen:    (id: string, erledigt: boolean) => void
  onLoeschen:     (id: string) => void
  /** Optional: Kunden-Modus (zeigt Antworten-Box mit Name-Eingabe) */
  kundenModus?: boolean
}

export default function MoodboardPinOverlay({
  pins, worldToScreen, aktiverPinId, setAktiverPinId,
  onAntworten, onErledigen, onLoeschen,
}: Props) {
  // Top-Level Pins (parent_id = null) mit Antworten-Liste
  const topPins = pins.filter((p) => !p.parent_id)
  const antwortenByParent = new Map<string, MoodboardKommentar[]>()
  pins.forEach((p) => {
    if (p.parent_id) {
      const list = antwortenByParent.get(p.parent_id) ?? []
      list.push(p)
      antwortenByParent.set(p.parent_id, list)
    }
  })

  return (
    <>
      {topPins.map((pin, idx) => {
        if (pin.pos_x === null || pin.pos_y === null) return null
        const pos = worldToScreen(pin.pos_x, pin.pos_y)
        if (!pos) return null
        const aktiv = aktiverPinId === pin.id
        const antworten = antwortenByParent.get(pin.id) ?? []

        return (
          <div
            key={pin.id}
            className="absolute z-30"
            style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -100%)' }}
          >
            <PinBubble
              pin={pin}
              nummer={idx + 1}
              aktiv={aktiv}
              onClick={() => setAktiverPinId(aktiv ? null : pin.id)}
            />
            {aktiv && (
              <PinThread
                pin={pin}
                antworten={antworten}
                onClose={() => setAktiverPinId(null)}
                onAntworten={onAntworten}
                onErledigen={onErledigen}
                onLoeschen={onLoeschen}
              />
            )}
          </div>
        )
      })}
    </>
  )
}

// ── Pin-Bubble (kleiner Kreis mit Nummer) ───────────────────────
function PinBubble({
  pin, nummer, aktiv, onClick,
}: {
  pin: MoodboardKommentar
  nummer: number
  aktiv: boolean
  onClick: () => void
}) {
  const istErledigt = pin.erledigt
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative pointer-events-auto inline-flex items-center justify-center
        w-7 h-7 rounded-full shadow-md text-[11px] font-bold
        transition-all hover:scale-110
        ${istErledigt
          ? 'bg-emerald-100 text-emerald-700 border border-emerald-400'
          : pin.ist_kunde
            ? 'bg-amber-400 text-amber-950 border border-amber-600'
            : 'bg-wellbeing-green text-white border border-wellbeing-green-dark'
        }
        ${aktiv ? 'ring-2 ring-white ring-offset-2 ring-offset-black/40 scale-110' : ''}
      `}
      title={pin.inhalt}
    >
      {istErledigt ? <Check className="w-3.5 h-3.5" /> : nummer}
      {/* kleiner Pfeil unten */}
      <span
        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45"
        style={{
          background: istErledigt ? '#a7f3d0' : pin.ist_kunde ? '#fbbf24' : '#445c49',
        }}
      />
    </button>
  )
}

// ── Pin-Thread (offene Bubble) ──────────────────────────────────
function PinThread({
  pin, antworten, onClose, onAntworten, onErledigen, onLoeschen,
}: {
  pin: MoodboardKommentar
  antworten: MoodboardKommentar[]
  onClose: () => void
  onAntworten: (parentId: string, text: string) => Promise<boolean>
  onErledigen: (id: string, erledigt: boolean) => void
  onLoeschen: (id: string) => void
}) {
  const [neueAntwort, setNeueAntwort] = useState('')
  const [sending, setSending] = useState(false)

  async function submitAntwort() {
    if (!neueAntwort.trim()) return
    setSending(true)
    const ok = await onAntworten(pin.id, neueAntwort)
    setSending(false)
    if (ok) setNeueAntwort('')
  }

  return (
    <div
      className="pointer-events-auto absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className={`px-3 py-2 flex items-center justify-between gap-2 ${pin.ist_kunde ? 'bg-amber-50' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <MessageSquare className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          <span className="text-[11px] font-medium text-gray-700 truncate">
            {pin.autor_name ?? 'Unbekannt'}
          </span>
          {pin.ist_kunde && (
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] rounded font-medium uppercase tracking-wider">
              Kunde
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onErledigen(pin.id, !pin.erledigt)}
            title={pin.erledigt ? 'Wieder offen markieren' : 'Erledigt markieren'}
            className={`p-1 rounded hover:bg-white/60 ${pin.erledigt ? 'text-emerald-600' : 'text-gray-400'}`}
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onLoeschen(pin.id)}
            title="Pin löschen"
            className="p-1 rounded hover:bg-white/60 text-gray-400 hover:text-red-600"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Schließen"
            className="p-1 rounded hover:bg-white/60 text-gray-400 hover:text-gray-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Hauptkommentar + Antworten */}
      <div className="max-h-[260px] overflow-y-auto">
        <div className="px-3 py-2 border-b border-gray-100">
          <p className={`text-xs leading-relaxed ${pin.erledigt ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
            {pin.inhalt}
          </p>
          <span className="text-[10px] text-gray-400 mt-1 block">
            {new Date(pin.created_at).toLocaleString('de-DE')}
          </span>
        </div>
        {antworten.map((a) => (
          <div key={a.id} className="px-3 py-2 border-b border-gray-100 flex gap-1.5 bg-gray-50/50">
            <CornerDownRight className="w-3 h-3 text-gray-300 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-gray-700 truncate">{a.autor_name ?? 'Unbekannt'}</span>
                {a.ist_kunde && (
                  <span className="px-1 py-0.5 bg-amber-100 text-amber-800 text-[8px] rounded uppercase tracking-wider">Kunde</span>
                )}
              </div>
              <p className="text-xs text-gray-700 leading-relaxed mt-0.5">{a.inhalt}</p>
              <span className="text-[10px] text-gray-400 mt-0.5 block">
                {new Date(a.created_at).toLocaleString('de-DE')}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Antwort-Input */}
      <div className="p-2.5 border-t border-gray-100">
        <textarea
          value={neueAntwort}
          onChange={(e) => setNeueAntwort(e.target.value)}
          placeholder="Antwort schreiben…"
          rows={2}
          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded resize-none focus:outline-none focus:border-wellbeing-green focus:ring-1 focus:ring-wellbeing-green/30"
        />
        <div className="flex justify-end mt-1.5">
          <button
            type="button"
            onClick={submitAntwort}
            disabled={!neueAntwort.trim() || sending}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-wellbeing-green hover:bg-wellbeing-green-dark text-white text-[11px] font-medium rounded transition-colors disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Antworten
          </button>
        </div>
      </div>
    </div>
  )
}
