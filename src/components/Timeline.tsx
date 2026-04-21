'use client'

import { useState } from 'react'
import { format, isToday, isTomorrow, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  Calendar, Flag, Truck, Clock, Layers, AlertTriangle, History,
  List, Package, CalendarDays, ChevronLeft, ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import type { TimelineEvent, TimelineEventTyp, TimelineEventStatus } from '@/lib/supabase/types'

// ── Typ-Konfiguration ─────────────────────────────────────────
const TYP_CONFIG: Record<TimelineEventTyp, {
  label: string
  farbe: string
  bgFarbe: string
  punktFarbe: string
  Icon: React.ComponentType<{ className?: string }>
}> = {
  meilenstein: { label: 'Meilenstein', farbe: 'text-purple-600', bgFarbe: 'bg-purple-50',   punktFarbe: 'bg-purple-500', Icon: Flag   },
  lieferung:   { label: 'Lieferung',   farbe: 'text-blue-600',   bgFarbe: 'bg-blue-50',     punktFarbe: 'bg-blue-500',   Icon: Truck  },
  termin:      { label: 'Termin',      farbe: 'text-emerald-600',bgFarbe: 'bg-emerald-50',  punktFarbe: 'bg-emerald-500',Icon: Clock  },
  phase:       { label: 'Phase',       farbe: 'text-gray-500',   bgFarbe: 'bg-gray-100',    punktFarbe: 'bg-gray-400',   Icon: Layers },
}

const STATUS_CONFIG: Record<TimelineEventStatus, { label: string; klasse: string }> = {
  geplant:       { label: 'Geplant',  klasse: 'bg-gray-100 text-gray-600'     },
  in_arbeit:     { label: 'In Arbeit',klasse: 'bg-blue-50 text-blue-700'      },
  abgeschlossen: { label: 'Erledigt', klasse: 'bg-emerald-50 text-emerald-700'},
  verspaetet:    { label: 'Verspätet',klasse: 'bg-red-50 text-red-700'        },
}

function datumKurz(d: string): string {
  const dt = new Date(d + 'T00:00:00')
  if (isToday(dt))    return 'Heute'
  if (isTomorrow(dt)) return 'Morgen'
  return format(dt, 'd. MMM', { locale: de })
}

function istUeberfaellig(ev: TimelineEvent): boolean {
  if (ev.status === 'abgeschlossen') return false
  const ref = ev.end_datum ?? ev.start_datum
  return ref < new Date().toISOString().split('T')[0]
}

function istVergangen(ev: TimelineEvent): boolean {
  if (ev.status !== 'abgeschlossen') return false
  const ref = ev.end_datum ?? ev.start_datum
  return ref < new Date().toISOString().split('T')[0]
}

/** Zieht den Produktnamen aus Titeln wie „Lieferung: IKEA LACK Tisch" */
function produktAusTitel(titel: string): string {
  const m = titel.match(/^(?:Lieferung|Bestellt|Geliefert):\s*(.+)$/)
  return m ? m[1] : titel
}

type AnsichtModus = 'liste' | 'gruppiert' | 'kalender'

interface TimelineProps {
  events: (TimelineEvent & { raum?: { id: string; name: string } | null })[]
  showRaumBadge?: boolean
  alleLink?: string
  limit?: number
  maxHoehe?: string
  vergangenAusgeblendetDefault?: boolean
}

export function Timeline({
  events,
  showRaumBadge = false,
  alleLink,
  limit,
  maxHoehe = '380px',
  vergangenAusgeblendetDefault = true,
}: TimelineProps) {
  const [vergangenVerstecken, setVergangenVerstecken] = useState(vergangenAusgeblendetDefault)
  const [modus, setModus] = useState<AnsichtModus>('liste')

  if (events.length === 0) {
    return (
      <div className="py-6 text-center">
        <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
        <p className="text-sm text-gray-400">Noch keine Timeline-Ereignisse</p>
        {alleLink && (
          <Link href={alleLink} className="mt-2 inline-block text-xs text-wellbeing-green hover:underline">
            Zur Timeline →
          </Link>
        )}
      </div>
    )
  }

  const vergangenCount = events.filter(istVergangen).length
  const sichtbar = vergangenVerstecken ? events.filter((e) => !istVergangen(e)) : events
  const angezeigt = limit ? sichtbar.slice(0, limit) : sichtbar

  return (
    <div>
      {/* Kopfzeile: View-Switcher + Toggle */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="inline-flex items-center gap-0.5 p-0.5 bg-gray-100 rounded-lg">
          <ViewTab aktiv={modus === 'liste'}     onClick={() => setModus('liste')}     Icon={List}         label="Liste" />
          <ViewTab aktiv={modus === 'gruppiert'} onClick={() => setModus('gruppiert')} Icon={Package}      label="Nach Produkt" />
          <ViewTab aktiv={modus === 'kalender'}  onClick={() => setModus('kalender')}  Icon={CalendarDays} label="Kalender" />
        </div>
        {vergangenCount > 0 && modus !== 'kalender' && (
          <button
            type="button"
            onClick={() => setVergangenVerstecken((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-700 transition-colors"
          >
            <History className="w-3 h-3" />
            {vergangenVerstecken
              ? `+ ${vergangenCount} vergangene anzeigen`
              : 'Vergangene ausblenden'}
          </button>
        )}
      </div>

      {/* View-Inhalt */}
      {modus === 'liste'     && <ListenView     events={angezeigt} showRaumBadge={showRaumBadge} maxHoehe={maxHoehe} />}
      {modus === 'gruppiert' && <GruppiertView  events={sichtbar}  showRaumBadge={showRaumBadge} maxHoehe={maxHoehe} />}
      {modus === 'kalender'  && <KalenderView   events={events} />}

      {alleLink && (
        <div className="mt-2">
          <Link href={alleLink} className="text-xs text-wellbeing-green hover:underline">
            Alle Ereignisse anzeigen →
          </Link>
        </div>
      )}
    </div>
  )
}

// ── View-Tab-Knopf ────────────────────────────────────────────
function ViewTab({
  aktiv, onClick, Icon, label,
}: {
  aktiv: boolean
  onClick: () => void
  Icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
        aktiv
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
  )
}

// ── Liste (Einzeiler, scrollbar) ──────────────────────────────
function ListenView({
  events, showRaumBadge, maxHoehe,
}: {
  events: (TimelineEvent & { raum?: { id: string; name: string } | null })[]
  showRaumBadge: boolean
  maxHoehe: string
}) {
  if (events.length === 0) {
    return <div className="py-4 text-center"><p className="text-xs text-gray-400">Keine anstehenden Ereignisse</p></div>
  }
  return (
    <div className="overflow-y-auto pr-1" style={{ maxHeight: maxHoehe }}>
      <div className="space-y-0.5">
        {events.map((ev) => <EventZeile key={ev.id} ev={ev} showRaumBadge={showRaumBadge} />)}
      </div>
    </div>
  )
}

function EventZeile({
  ev, showRaumBadge,
}: {
  ev: TimelineEvent & { raum?: { id: string; name: string } | null }
  showRaumBadge: boolean
}) {
  const cfg   = TYP_CONFIG[ev.typ] ?? TYP_CONFIG.termin
  const stCfg = STATUS_CONFIG[ev.status] ?? STATUS_CONFIG.geplant
  const Icon  = cfg.Icon
  const ueberfaellig = istUeberfaellig(ev)
  return (
    <div
      className={`flex items-center gap-3 px-2 py-2 rounded-lg transition-colors ${
        ueberfaellig ? 'bg-red-50/30 hover:bg-red-50/50' : 'hover:bg-gray-50'
      }`}
    >
      <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${cfg.bgFarbe}`}>
        <Icon className={`w-3.5 h-3.5 ${cfg.farbe}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-900 truncate">{ev.titel}</span>
          {showRaumBadge && ev.raum && (
            <span className="text-[10px] px-1.5 py-0.5 bg-wellbeing-green/10 text-wellbeing-green rounded shrink-0 font-medium">
              {ev.raum.name}
            </span>
          )}
        </div>
        {ev.beschreibung && <p className="text-[11px] text-gray-500 truncate">{ev.beschreibung}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {ueberfaellig && <AlertTriangle className="w-3 h-3 text-red-500" />}
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${stCfg.klasse}`}>
          {stCfg.label}
        </span>
        <span className="text-[11px] text-gray-400 tabular-nums min-w-[48px] text-right">
          {datumKurz(ev.start_datum)}
        </span>
      </div>
    </div>
  )
}

// ── Gruppiert nach Produkt ────────────────────────────────────
function GruppiertView({
  events, showRaumBadge, maxHoehe,
}: {
  events: (TimelineEvent & { raum?: { id: string; name: string } | null })[]
  showRaumBadge: boolean
  maxHoehe: string
}) {
  if (events.length === 0) {
    return <div className="py-4 text-center"><p className="text-xs text-gray-400">Keine Ereignisse</p></div>
  }
  const gruppen = new Map<string, typeof events>()
  for (const ev of events) {
    const key = produktAusTitel(ev.titel)
    const bestehend = gruppen.get(key) ?? []
    bestehend.push(ev)
    gruppen.set(key, bestehend)
  }
  // Nach erstem Datum sortieren
  const eintraege = Array.from(gruppen.entries()).sort(([, a], [, b]) => {
    const dA = a[0]?.start_datum ?? '9999'
    const dB = b[0]?.start_datum ?? '9999'
    return dA.localeCompare(dB)
  })
  return (
    <div className="overflow-y-auto pr-1 space-y-2" style={{ maxHeight: maxHoehe }}>
      {eintraege.map(([produkt, evs]) => {
        const raum = evs.find((e) => e.raum)?.raum
        return (
          <div key={produkt} className="border border-gray-100 rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border-b border-gray-100">
              <Package className="w-3 h-3 text-gray-400 shrink-0" />
              <p className="text-xs font-semibold text-gray-700 truncate flex-1">{produkt}</p>
              {showRaumBadge && raum && (
                <span className="text-[10px] px-1.5 py-0.5 bg-wellbeing-green/10 text-wellbeing-green rounded shrink-0 font-medium">
                  {raum.name}
                </span>
              )}
              <span className="text-[10px] text-gray-400 shrink-0">{evs.length} Event{evs.length === 1 ? '' : 's'}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {evs.sort((a, b) => a.start_datum.localeCompare(b.start_datum)).map((ev) => {
                const cfg   = TYP_CONFIG[ev.typ] ?? TYP_CONFIG.termin
                const stCfg = STATUS_CONFIG[ev.status] ?? STATUS_CONFIG.geplant
                const Icon  = cfg.Icon
                const titelKurz = ev.titel.match(/^(Lieferung|Bestellt|Geliefert):/)?.[1] ?? ev.titel
                const ueberfaellig = istUeberfaellig(ev)
                return (
                  <div key={ev.id} className="flex items-center gap-3 px-3 py-1.5">
                    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${cfg.bgFarbe}`}>
                      <Icon className={`w-3 h-3 ${cfg.farbe}`} />
                    </div>
                    <span className="text-xs text-gray-700 flex-1">{titelKurz}</span>
                    {ueberfaellig && <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />}
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${stCfg.klasse}`}>
                      {stCfg.label}
                    </span>
                    <span className="text-[11px] text-gray-400 tabular-nums min-w-[48px] text-right shrink-0">
                      {datumKurz(ev.start_datum)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Kalender (Monatsraster) ───────────────────────────────────
function KalenderView({
  events,
}: {
  events: (TimelineEvent & { raum?: { id: string; name: string } | null })[]
}) {
  const heute = new Date()
  const [monat, setMonat] = useState(startOfMonth(heute))

  const monatsStart = startOfMonth(monat)
  const monatsEnde  = endOfMonth(monat)
  const rasterStart = startOfWeek(monatsStart, { weekStartsOn: 1 })
  const rasterEnde  = endOfWeek(monatsEnde,   { weekStartsOn: 1 })
  const tage = eachDayOfInterval({ start: rasterStart, end: rasterEnde })

  const eventsAnTag = (tag: Date) =>
    events.filter((e) => isSameDay(new Date(e.start_datum + 'T00:00:00'), tag))

  return (
    <div>
      {/* Monats-Navigation */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setMonat(subMonths(monat, 1))}
          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          aria-label="Vorheriger Monat"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <p className="text-xs font-semibold text-gray-700">
          {format(monat, 'MMMM yyyy', { locale: de })}
        </p>
        <button
          type="button"
          onClick={() => setMonat(addMonths(monat, 1))}
          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          aria-label="Nächster Monat"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      {/* Wochentage */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((w) => (
          <div key={w} className="text-[10px] font-medium text-gray-400 text-center">{w}</div>
        ))}
      </div>
      {/* Tage */}
      <div className="grid grid-cols-7 gap-1">
        {tage.map((tag) => {
          const tagEvents = eventsAnTag(tag)
          const istHeute  = isSameDay(tag, heute)
          const istImMonat = isSameMonth(tag, monat)
          return (
            <div
              key={tag.toISOString()}
              className={`min-h-[56px] p-1 rounded border text-[10px] ${
                istHeute
                  ? 'border-wellbeing-green/40 bg-wellbeing-green/5'
                  : 'border-gray-100'
              } ${istImMonat ? '' : 'opacity-40'}`}
            >
              <p className={`text-right mb-0.5 ${istHeute ? 'font-bold text-wellbeing-green-dark' : 'text-gray-400'}`}>
                {format(tag, 'd')}
              </p>
              <div className="space-y-0.5">
                {tagEvents.slice(0, 3).map((ev) => {
                  const cfg = TYP_CONFIG[ev.typ] ?? TYP_CONFIG.termin
                  const ueberfaellig = istUeberfaellig(ev)
                  return (
                    <div
                      key={ev.id}
                      className={`flex items-center gap-1 px-1 py-0.5 rounded truncate ${cfg.bgFarbe} ${
                        ueberfaellig ? 'ring-1 ring-red-300' : ''
                      }`}
                      title={ev.titel}
                    >
                      <span className={`w-1 h-1 rounded-full shrink-0 ${cfg.punktFarbe}`} />
                      <span className={`truncate ${cfg.farbe}`}>{ev.titel}</span>
                    </div>
                  )
                })}
                {tagEvents.length > 3 && (
                  <p className="text-[9px] text-gray-500 px-1">+{tagEvents.length - 3} weitere</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
