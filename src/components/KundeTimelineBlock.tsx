'use client'

import { useState } from 'react'
import { CalendarClock, ChevronDown } from 'lucide-react'
import { Timeline } from '@/components/Timeline'
import type { TimelineEvent } from '@/lib/supabase/types'

type KundeEvent = TimelineEvent & {
  raum?: { id: string; name: string } | null
  projekt: { id: string; name: string }
}

/**
 * Multi-Projekt-Timeline für die Kunden-Detailseite.
 * Zeigt alle Events über alle Projekte mit Projekt- + Raum-Badge.
 * Filter-Dropdown: Alle Projekte · einzelnes Projekt.
 */
export default function KundeTimelineBlock({
  events,
  projekte,
}: {
  events: KundeEvent[]
  projekte: { id: string; name: string }[]
}) {
  const [gewaehltesProjekt, setGewaehltesProjekt] = useState<string>('alle')
  const [dropdownOffen, setDropdownOffen] = useState(false)

  const gefilterteEvents = gewaehltesProjekt === 'alle'
    ? events
    : events.filter((e) => e.projekt.id === gewaehltesProjekt)

  const aktiverName = gewaehltesProjekt === 'alle'
    ? 'Alle Projekte'
    : (projekte.find((p) => p.id === gewaehltesProjekt)?.name ?? 'Alle Projekte')

  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 gap-2 flex-wrap">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-gray-400" />
          Timeline
          <span className="text-xs font-normal text-gray-400 tabular-nums">({gefilterteEvents.length})</span>
        </h2>

        {/* Filter-Dropdown */}
        {projekte.length > 1 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOffen((v) => !v)}
              onBlur={() => setTimeout(() => setDropdownOffen(false), 150)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
            >
              {aktiverName}
              <ChevronDown className="w-3 h-3" />
            </button>
            {dropdownOffen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                <button
                  type="button"
                  onClick={() => { setGewaehltesProjekt('alle'); setDropdownOffen(false) }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                    gewaehltesProjekt === 'alle'
                      ? 'bg-wellbeing-green/10 text-wellbeing-green-dark font-medium'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  Alle Projekte
                  <span className="text-[10px] text-gray-400 ml-2 tabular-nums">({events.length})</span>
                </button>
                <div className="border-t border-gray-100" />
                {projekte.map((p) => {
                  const count = events.filter((e) => e.projekt.id === p.id).length
                  const aktiv = gewaehltesProjekt === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setGewaehltesProjekt(p.id); setDropdownOffen(false) }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between ${
                        aktiv
                          ? 'bg-wellbeing-green/10 text-wellbeing-green-dark font-medium'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="text-[10px] text-gray-400 ml-2 tabular-nums shrink-0">({count})</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="p-5">
        <Timeline
          events={gefilterteEvents}
          showRaumBadge
          showProjektBadge={gewaehltesProjekt === 'alle'}
          maxHoehe="440px"
        />
      </div>
    </section>
  )
}
