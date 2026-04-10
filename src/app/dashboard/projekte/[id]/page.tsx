import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import RaumHinzufuegen from '@/components/RaumHinzufuegen'
import FreigabeLinkKarte from '@/components/FreigabeLinkKarte'
import { raumAnlegen, raumSoftDelete } from '@/app/actions/raeume'
import { projektSoftDelete, projektStatusAendern } from '@/app/actions/projekte'
import type { ProjektMitKunde, Raum } from '@/lib/supabase/types'

const statusOptionen = [
  { wert: 'offen',          label: 'Offen',          farbe: 'bg-wbc-creme text-wbc-grau' },
  { wert: 'in_bearbeitung', label: 'In Bearbeitung',  farbe: 'bg-wbc-mint/25 text-wbc-gruen' },
  { wert: 'freigegeben',    label: 'Freigegeben',     farbe: 'bg-wbc-mint/40 text-wbc-gruen' },
  { wert: 'abgeschlossen',  label: 'Abgeschlossen',   farbe: 'bg-[#ede4d9] text-wbc-grau' },
]

async function getProjekt(id: string): Promise<ProjektMitKunde | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('projekte')
    .select('*, kunden(id, name)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  return data as ProjektMitKunde | null
}

async function getRaeume(projektId: string): Promise<Raum[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('raeume')
    .select('*')
    .eq('projekt_id', projektId)
    .is('deleted_at', null)
    .order('reihenfolge')
    .order('created_at')
  return data ?? []
}

async function getAktivenToken(projektId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('freigabe_tokens')
    .select('id, token')
    .eq('projekt_id', projektId)
    .eq('aktiv', true)
    .maybeSingle()
  return data
}

export default async function ProjektDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const [projekt, raeume, aktiverToken] = await Promise.all([
    getProjekt(params.id),
    getRaeume(params.id),
    getAktivenToken(params.id),
  ])

  if (!projekt) notFound()

  const raumHinzufuegenAktion = raumAnlegen.bind(null, projekt.id)
  const loeschenAktion = projektSoftDelete.bind(null, projekt.id)

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <Link
            href="/dashboard/projekte"
            className="text-xs text-wbc-grau/40 hover:text-wbc-gruen transition-colors mb-3 inline-block"
          >
            ← Zurück zu Projekte
          </Link>
          <h1 className="font-heading text-3xl font-light text-wbc-gruen tracking-wide">{projekt.name}</h1>
          {projekt.kunden && (
            <Link
              href={`/dashboard/kunden/${projekt.kunden.id}`}
              className="text-sm text-wbc-grau/50 hover:text-wbc-gruen transition-colors mt-0.5 inline-block"
            >
              {projekt.kunden.name}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/projekte/${projekt.id}/bearbeiten`}
            className="px-4 py-2 text-xs text-wbc-grau/70 border border-[#e8ddd3] hover:border-wbc-sand/60 hover:bg-wbc-creme/40 rounded-lg transition-colors tracking-wide"
          >
            Bearbeiten
          </Link>
          <form action={loeschenAktion}>
            <button
              type="submit"
              className="px-4 py-2 text-xs text-wbc-terra/60 hover:text-wbc-terra transition-colors"
              onClick={(e) => {
                if (!confirm(`„${projekt.name}" wirklich löschen?`)) e.preventDefault()
              }}
            >
              Löschen
            </button>
          </form>
        </div>
      </div>

      {/* Status-Umschalter */}
      <div className="flex items-center gap-2 mb-8 mt-4">
        {statusOptionen.map((s) => {
          const istAktiv = projekt.status === s.wert
          const statusAendernAktion = projektStatusAendern.bind(null, projekt.id, s.wert as import('@/lib/supabase/types').ProjektStatus)
          return (
            <form key={s.wert} action={statusAendernAktion}>
              <button
                type="submit"
                className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition-all ${
                  istAktiv
                    ? s.farbe + ' ring-2 ring-offset-1 ring-wbc-sand/40'
                    : 'bg-white text-wbc-grau/40 border border-[#e8ddd3] hover:border-wbc-sand/60'
                }`}
              >
                {s.label}
              </button>
            </form>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Linke Spalte: Metadaten */}
        <div className="space-y-4">
          <div className="bg-white border border-[#ede4d9] rounded-xl p-5">
            <h2 className="text-xs font-medium text-wbc-grau/50 uppercase tracking-widest mb-4">
              Projektdetails
            </h2>
            <dl className="space-y-3">
              <InfoZeile label="Projektart" wert={projekt.projektart} />
              <InfoZeile label="Standort" wert={projekt.standort} />
              {projekt.gesamtbudget != null && (
                <div>
                  <dt className="text-xs text-wbc-grau/50 mb-0.5">Gesamtbudget</dt>
                  <dd className="text-sm font-medium text-wbc-gruen">
                    {new Intl.NumberFormat('de-DE', {
                      style: 'currency',
                      currency: 'EUR',
                    }).format(projekt.gesamtbudget)}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-wbc-grau/50 mb-0.5">Angelegt am</dt>
                <dd className="text-sm text-wbc-grau/70">
                  {new Date(projekt.created_at).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </dd>
              </div>
            </dl>
          </div>

          {projekt.beschreibung && (
            <div className="bg-white border border-[#ede4d9] rounded-xl p-5">
              <h2 className="text-xs font-medium text-wbc-grau/50 uppercase tracking-widest mb-3">
                Notizen
              </h2>
              <p className="text-sm text-wbc-grau/70 whitespace-pre-wrap leading-relaxed">
                {projekt.beschreibung}
              </p>
            </div>
          )}

          <FreigabeLinkKarte
            projektId={projekt.id}
            initialToken={aktiverToken ?? null}
          />
        </div>

        {/* Rechte Spalte: Räume */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-[#ede4d9] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0e8de]">
              <h2 className="text-sm font-medium text-wbc-gruen">
                Räume{' '}
                <span className="text-wbc-grau/40 font-normal">({raeume.length})</span>
              </h2>
              <RaumHinzufuegen aktion={raumHinzufuegenAktion} />
            </div>

            {raeume.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-wbc-grau/40">Noch keine Räume angelegt.</p>
                <p className="text-xs text-wbc-grau/30 mt-1">
                  Räume über &bdquo;+ Raum hinzufügen&ldquo; erstellen.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[#f5ede4]">
                {raeume.map((raum) => {
                  const raumLoeschenAktion = raumSoftDelete.bind(null, raum.id, projekt.id)
                  return (
                    <li
                      key={raum.id}
                      className="flex items-center justify-between px-5 py-4 hover:bg-wbc-creme/20 transition-colors group"
                    >
                      <div>
                        <p className="text-sm font-medium text-wbc-gruen">{raum.name}</p>
                        {raum.beschreibung && (
                          <p className="text-xs text-wbc-grau/50 mt-0.5">{raum.beschreibung}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/dashboard/projekte/${projekt.id}/raeume/${raum.id}`}
                          className="text-xs text-wbc-grau/40 hover:text-wbc-gruen transition-colors"
                        >
                          Öffnen →
                        </Link>
                        <form action={raumLoeschenAktion}>
                          <button
                            type="submit"
                            className="text-xs text-wbc-terra/50 hover:text-wbc-terra transition-colors"
                            onClick={(e) => {
                              if (!confirm(`Raum „${raum.name}" löschen?`)) e.preventDefault()
                            }}
                          >
                            Löschen
                          </button>
                        </form>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoZeile({ label, wert }: { label: string; wert: string | null }) {
  if (!wert) return null
  return (
    <div>
      <dt className="text-xs text-wbc-grau/50 mb-0.5">{label}</dt>
      <dd className="text-sm text-wbc-grau/80">{wert}</dd>
    </div>
  )
}
