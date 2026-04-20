'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react'
import type { ChangelogEntry, ChangelogPunkt } from '@/lib/changelog'

const SEEN_KEY = 'changelog-last-seen'

/**
 * Zeigt den Changelog aus CHANGELOG.md als einklappbare Datum-Blöcke.
 * Standard: neuester Block offen, ältere zu.
 * Beim Öffnen wird localStorage "changelog-last-seen" auf das neueste Datum
 * gesetzt — Badge in NavSidebar verschwindet via window-Event.
 */
export default function ChangelogTab({ eintraege }: { eintraege: ChangelogEntry[] }) {
  // Offen-State: erster Eintrag default offen, alle anderen zu
  const [offeneDaten, setOffeneDaten] = useState<Set<string>>(
    () => new Set(eintraege.length > 0 ? [eintraege[0].datum] : []),
  )

  function toggle(datum: string) {
    setOffeneDaten((prev) => {
      const next = new Set(prev)
      if (next.has(datum)) next.delete(datum)
      else next.add(datum)
      return next
    })
  }

  useEffect(() => {
    if (eintraege.length === 0) return
    const neuestes = eintraege[0].datum
    try {
      localStorage.setItem(SEEN_KEY, neuestes)
      window.dispatchEvent(new CustomEvent('changelog:seen'))
    } catch { /* ignore */ }
  }, [eintraege])

  if (eintraege.length === 0) {
    return (
      <div className="text-center py-16">
        <Sparkles className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-sm text-gray-400">Noch keine Änderungen dokumentiert.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-4 h-4 text-wellbeing-green" />
        <h2 className="text-sm font-semibold text-gray-900">Was ist neu?</h2>
        <span className="text-xs text-gray-400">Automatisch bei jedem Update gepflegt.</span>
      </div>

      <div className="space-y-2">
        {eintraege.map((eintrag) => {
          const offen = offeneDaten.has(eintrag.datum)
          const punkteGesamt = eintrag.sektionen.reduce((sum, s) => sum + s.punkte.length, 0)
          return (
            <section
              key={eintrag.datum}
              className="border border-gray-200 rounded-xl overflow-hidden bg-white"
            >
              <button
                type="button"
                onClick={() => toggle(eintrag.datum)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                aria-expanded={offen}
              >
                {offen
                  ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                }
                <span className="text-sm font-semibold text-gray-900 flex-1">
                  {formatDatum(eintrag.datum)}
                </span>
                <span className="text-xs text-gray-400">
                  {punkteGesamt} {punkteGesamt === 1 ? 'Eintrag' : 'Einträge'}
                </span>
              </button>

              {offen && (
                <div className="px-4 pb-4 pt-1 space-y-5 border-t border-gray-100">
                  {eintrag.sektionen.map((sek, idx) => (
                    <div key={idx}>
                      {sek.titel && (
                        <h4 className="text-sm font-semibold text-gray-800 mb-2 mt-3">{sek.titel}</h4>
                      )}
                      <ul className="space-y-1.5">
                        {sek.punkte.map((p, i) => (
                          <li key={i} className="flex gap-2 text-sm text-gray-600 leading-relaxed">
                            <span className="text-wellbeing-green shrink-0 mt-[7px] text-[9px]">●</span>
                            <span>{renderPunkt(p)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function renderPunkt(p: ChangelogPunkt): React.ReactNode {
  return p.segmente.map((seg, i) =>
    seg.bold
      ? <strong key={i} className="font-semibold text-gray-800">{seg.text}</strong>
      : <span   key={i}>{seg.text}</span>,
  )
}

function formatDatum(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('de-DE', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}
