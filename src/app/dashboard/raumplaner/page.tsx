import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { LayoutDashboard } from 'lucide-react'
import GrundrissVorschau from '@/components/raumplaner/GrundrissVorschau'

type RaumMitProjekt = {
  id: string
  name: string
  beschreibung: string | null
  breite_m: number | null
  laenge_m: number | null
  hoehe_m: number | null
  grundriss_json: Record<string, unknown> | null
  projekt_id: string
  projekte: {
    id: string
    name: string
    kunden: { id: string; name: string } | null
  } | null
}

async function getAlleRaeume(): Promise<RaumMitProjekt[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('raeume')
    .select('id, name, beschreibung, breite_m, laenge_m, hoehe_m, grundriss_json, projekt_id, projekte(id, name, kunden(id, name))')
    .is('deleted_at', null)
    .order('name')
  return (data ?? []) as unknown as RaumMitProjekt[]
}

export default async function RaumplanerUebersichtPage() {
  const raeume = await getAlleRaeume()

  const mitGrundriss  = raeume.filter((r) => r.grundriss_json)
  const ohneGrundriss = raeume.filter((r) => !r.grundriss_json)

  // Unique Projekte für Anzeige
  const projekte = Array.from(
    new Map(
      raeume
        .filter((r) => r.projekte)
        .map((r) => [r.projekte!.id, r.projekte!])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name, 'de'))

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Raumplaner</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {raeume.length} {raeume.length === 1 ? 'Raum' : 'Räume'} gesamt
            {mitGrundriss.length > 0 && ` · ${mitGrundriss.length} mit Grundriss`}
          </p>
        </div>
      </div>

      {/* Räume ohne Grundriss – Hinweis */}
      {raeume.length === 0 && (
        <div className="text-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <LayoutDashboard className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm font-medium">Noch keine Räume vorhanden</p>
          <p className="text-xs text-gray-400 mt-1">Lege zuerst ein Projekt mit Räumen an</p>
          <Link
            href="/dashboard/projekte"
            className="inline-block mt-4 text-sm text-wellbeing-green underline underline-offset-2"
          >
            Zu den Projekten
          </Link>
        </div>
      )}

      {/* Räume mit Grundriss */}
      {mitGrundriss.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
            Grundrisse
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mitGrundriss.map((raum) => (
              <RaumCard key={raum.id} raum={raum} />
            ))}
          </div>
        </section>
      )}

      {/* Räume ohne Grundriss */}
      {ohneGrundriss.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
            Ohne Grundriss
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ohneGrundriss.map((raum) => (
              <RaumCard key={raum.id} raum={raum} />
            ))}
          </div>
        </section>
      )}

      {/* Projekte-Übersicht unten */}
      {projekte.length > 0 && (
        <section className="mt-10 pt-6 border-t border-gray-200">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
            Projekte
          </h2>
          <div className="flex flex-wrap gap-2">
            {projekte.map((p) => {
              const count = raeume.filter((r) => r.projekte?.id === p.id).length
              return (
                <Link
                  key={p.id}
                  href={`/dashboard/projekte/${p.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-wellbeing-green hover:text-wellbeing-green transition-colors"
                >
                  {p.name}
                  <span className="text-xs text-gray-400">{count}</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

function RaumCard({ raum }: { raum: RaumMitProjekt }) {
  const projekt = raum.projekte
  const planerHref = `/dashboard/projekte/${raum.projekt_id}/raeume/${raum.id}/planer`
  const raumHref   = `/dashboard/projekte/${raum.projekt_id}/raeume/${raum.id}`

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Vorschau oder Platzhalter */}
      {raum.grundriss_json ? (
        <Link href={planerHref} className="block">
          <div className="p-3 bg-gray-50 flex justify-center border-b border-gray-100">
            <GrundrissVorschau
              grundrissJson={JSON.stringify(raum.grundriss_json)}
              breiteM={raum.breite_m}
              laengeM={raum.laenge_m}
              vorschauBreite={320}
              className="shadow-sm"
            />
          </div>
        </Link>
      ) : (
        <Link href={planerHref} className="block">
          <div className="h-36 bg-gray-50 border-b border-gray-100 flex items-center justify-center">
            <div className="text-center">
              <LayoutDashboard className="w-6 h-6 text-gray-300 mx-auto mb-1" />
              <p className="text-xs text-gray-400">Noch kein Grundriss</p>
            </div>
          </div>
        </Link>
      )}

      {/* Infos */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={raumHref}
              className="text-sm font-medium text-gray-900 hover:text-wellbeing-green transition-colors truncate block"
            >
              {raum.name}
            </Link>
            {projekt && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{projekt.name}</p>
            )}
            {(raum.breite_m || raum.laenge_m) && (
              <p className="text-xs text-gray-400 mt-0.5">
                {raum.breite_m ?? '?'} m × {raum.laenge_m ?? '?'} m
                {raum.hoehe_m ? ` · H ${raum.hoehe_m} m` : ''}
              </p>
            )}
          </div>
          <Link
            href={planerHref}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 bg-wellbeing-green hover:bg-wellbeing-green-dark text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            <LayoutDashboard className="w-3 h-3" />
            Planer
          </Link>
        </div>
      </div>
    </div>
  )
}
