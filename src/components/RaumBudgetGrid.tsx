import Link from 'next/link'
import { ChevronRight, DoorOpen } from 'lucide-react'
import type { RaumBudgetDetail } from '@/app/actions/raeume'

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

// Deterministische Kategorie-Farben (hash-basiert) — damit gleicher Name
// zwischen Räumen denselben Farbton bekommt.
const KATEGORIE_FARBEN = [
  '#94c1a4', // wellbeing-green-light
  '#cba178', // wellbeing-sand
  '#823509', // wellbeing-terracotta
  '#f6ede2', // wellbeing-cream — light
  '#a78bfa', // violet
  '#60a5fa', // blue
  '#fbbf24', // amber
  '#f87171', // rose
]
function katFarbe(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return KATEGORIE_FARBEN[Math.abs(hash) % KATEGORIE_FARBEN.length]
}

/**
 * Zeile pro Raum — kompakt, alle Infos auf einen Blick:
 *   [Name + Produktzahl]   [gestackte Kategorie-Bar]   [Gesamt-VP]  [›]
 */
function RaumZeile({
  detail,
  projektId,
  isLast,
  maxVerbraucht,
}: {
  detail: RaumBudgetDetail
  projektId: string
  isLast: boolean
  maxVerbraucht: number
}) {
  const hatProdukte = detail.verbraucht > 0 && detail.top3Kategorien.length > 0

  return (
    <Link
      href={`/dashboard/projekte/${projektId}/raeume/${detail.raumId}`}
      className={`group flex items-center gap-4 px-4 py-3 hover:bg-gray-50/60 transition-colors ${
        isLast ? '' : 'border-b border-gray-100'
      }`}
    >
      {/* Links: Name + Produktzahl */}
      <div className="flex items-center gap-2 min-w-0 w-48 shrink-0">
        <DoorOpen className="w-3.5 h-3.5 text-gray-300 shrink-0" />
        <span className="text-sm font-medium text-gray-800 truncate group-hover:text-wellbeing-green transition-colors">
          {detail.name}
        </span>
      </div>

      {/* Mitte: gestackte Kategorie-Bar (proportional zur höchsten Raum-Summe) */}
      <div className="flex-1 min-w-0">
        {hatProdukte ? (
          <>
            <div
              className="h-2 rounded-full overflow-hidden flex bg-gray-100"
              style={{
                width: `${maxVerbraucht > 0 ? (detail.verbraucht / maxVerbraucht) * 100 : 0}%`,
                minWidth: '8%',
              }}
            >
              {detail.top3Kategorien.map((k) => (
                <div
                  key={k.kategorie}
                  style={{
                    width: `${k.anteil * 100}%`,
                    backgroundColor: katFarbe(k.kategorie),
                  }}
                  title={`${k.kategorie}: ${eur(k.betrag)} (${Math.round(k.anteil * 100)}%)`}
                />
              ))}
            </div>
            {/* Top-Kategorien-Legende: 1–2 prominenteste inline */}
            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400 flex-wrap">
              {detail.top3Kategorien.slice(0, 3).map((k) => (
                <span key={k.kategorie} className="inline-flex items-center gap-1">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: katFarbe(k.kategorie) }}
                  />
                  <span>{k.kategorie}</span>
                  <span className="text-gray-300">{eur(k.betrag)}</span>
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="text-[11px] text-gray-400 italic">Noch keine Produkte im Raum</p>
        )}
      </div>

      {/* Rechts: Summe + Chevron */}
      <div className="text-right shrink-0">
        <p className="text-sm font-mono font-semibold text-gray-900 tabular-nums">
          {hatProdukte ? eur(detail.verbraucht) : '—'}
        </p>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-wellbeing-green transition-colors shrink-0" />
    </Link>
  )
}

export default function RaumBudgetGrid({
  details,
  projektId,
}: {
  details: RaumBudgetDetail[]
  projektId: string
}) {
  if (details.length === 0) return null

  const maxVerbraucht = Math.max(...details.map((d) => d.verbraucht), 0)
  const summe = details.reduce((s, d) => s + d.verbraucht, 0)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Optional: dezenter Summen-Footer oben, zeigt Kontext */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/40 border-b border-gray-100">
        <span className="text-[11px] text-gray-500">
          Aufteilung nach Räumen · {details.length} {details.length === 1 ? 'Raum' : 'Räume'}
        </span>
        <span className="text-[11px] text-gray-500 tabular-nums">
          Summe <span className="font-mono font-semibold text-gray-800">{eur(summe)}</span>
        </span>
      </div>

      {/* Raum-Zeilen */}
      <div>
        {details.map((d, i) => (
          <RaumZeile
            key={d.raumId}
            detail={d}
            projektId={projektId}
            isLast={i === details.length - 1}
            maxVerbraucht={maxVerbraucht}
          />
        ))}
      </div>
    </div>
  )
}
