import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { ProjektMitKunde } from '@/lib/supabase/types'

const statusLabel: Record<string, string> = {
  offen: 'Offen',
  in_bearbeitung: 'In Bearbeitung',
  freigegeben: 'Freigegeben',
  abgeschlossen: 'Abgeschlossen',
}

const statusFarbe: Record<string, string> = {
  offen:          'bg-wbc-creme text-wbc-grau',
  in_bearbeitung: 'bg-wbc-mint/25 text-wbc-gruen',
  freigegeben:    'bg-wbc-mint/40 text-wbc-gruen',
  abgeschlossen:  'bg-[#ede4d9] text-wbc-grau',
}

async function getProjekte(): Promise<ProjektMitKunde[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('projekte')
    .select('*, kunden(id, name)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  return (data ?? []) as ProjektMitKunde[]
}

export default async function ProjektePage() {
  const projekte = await getProjekte()

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-light text-wbc-gruen tracking-wide">Projekte</h1>
          <p className="text-sm text-wbc-grau/50 mt-0.5">{projekte.length} Einträge</p>
        </div>
        <Link
          href="/dashboard/projekte/neu"
          className="px-4 py-2.5 bg-wbc-gruen hover:bg-wbc-gruen-dark text-white text-xs font-medium tracking-[0.12em] uppercase rounded-lg transition-colors"
        >
          + Neues Projekt
        </Link>
      </div>

      {/* Leerzustand */}
      {projekte.length === 0 && (
        <div className="text-center py-16 bg-white border border-[#ede4d9] rounded-xl">
          <p className="text-wbc-grau/50 text-sm">Noch keine Projekte angelegt.</p>
          <Link
            href="/dashboard/projekte/neu"
            className="inline-block mt-3 text-sm text-wbc-gruen underline underline-offset-2"
          >
            Erstes Projekt anlegen
          </Link>
        </div>
      )}

      {/* Karten-Grid */}
      {projekte.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projekte.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/projekte/${p.id}`}
              className="bg-white border border-[#ede4d9] rounded-xl p-5 hover:border-wbc-sand/50 hover:shadow-sm transition-all group block"
            >
              {/* Status-Badge */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    statusFarbe[p.status] ?? 'bg-wbc-creme text-wbc-grau'
                  }`}
                >
                  {statusLabel[p.status] ?? p.status}
                </span>
                {p.projektart && (
                  <span className="text-xs text-wbc-grau/40">{p.projektart}</span>
                )}
              </div>

              {/* Name */}
              <h2 className="text-sm font-semibold text-wbc-gruen group-hover:text-wbc-gruen/70 transition-colors leading-snug mb-1">
                {p.name}
              </h2>

              {/* Kunde */}
              <p className="text-xs text-wbc-grau/50 mb-3">
                {p.kunden?.name ?? '–'}
              </p>

              {/* Meta */}
              <div className="flex items-center gap-3 text-xs text-wbc-grau/40 border-t border-[#f5ede4] pt-3 mt-auto">
                {p.standort && <span>{p.standort}</span>}
                {p.gesamtbudget != null && (
                  <span className="ml-auto font-medium text-wbc-grau/60">
                    {new Intl.NumberFormat('de-DE', {
                      style: 'currency',
                      currency: 'EUR',
                      maximumFractionDigits: 0,
                    }).format(p.gesamtbudget)}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
