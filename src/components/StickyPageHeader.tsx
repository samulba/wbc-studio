import type { ReactNode } from 'react'

/**
 * Sticky Page Header für alle Dashboard-Listenseiten.
 * Wird vom Parent-Container (`overflow-y-auto`) „gepinnt", sodass Titel und
 * Aktionen beim Scrollen immer sichtbar bleiben.
 *
 * Nutzung:
 *   <div className="flex-1 overflow-y-auto animate-fadeIn">
 *     <StickyPageHeader title="Kunden" count={42} action={<NeuButton/>} />
 *     <div className="px-6 py-6">…Content…</div>
 *   </div>
 */
export default function StickyPageHeader({
  title,
  subtitle,
  count,
  countLabel,
  action,
  extra,
}: {
  title: string
  subtitle?: string
  count?: number
  countLabel?: string
  action?: ReactNode
  extra?: ReactNode
}) {
  return (
    <div className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-gray-100 px-6 py-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight">{title}</h1>
            {typeof count === 'number' && (
              <span className="text-sm text-gray-400 tabular-nums">
                {count} {countLabel ?? (count === 1 ? 'Eintrag' : 'Einträge')}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {extra}
          {action}
        </div>
      </div>
    </div>
  )
}
