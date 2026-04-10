import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { kundeSoftDelete } from '@/app/actions/kunden'
import type { Projekt } from '@/lib/supabase/types'

const projektStatusLabel: Record<string, string> = {
  offen: 'Offen',
  in_bearbeitung: 'In Bearbeitung',
  freigegeben: 'Freigegeben',
  abgeschlossen: 'Abgeschlossen',
}

const projektStatusFarbe: Record<string, string> = {
  offen:          'bg-wbc-creme text-wbc-grau',
  in_bearbeitung: 'bg-wbc-mint/25 text-wbc-gruen',
  freigegeben:    'bg-wbc-mint/40 text-wbc-gruen',
  abgeschlossen:  'bg-[#ede4d9] text-wbc-grau',
}

async function getKunde(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('kunden')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  return data
}

async function getProjekte(kundeId: string): Promise<Projekt[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('projekte')
    .select('*')
    .eq('kunde_id', kundeId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  return data ?? []
}

export default async function KundeDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const [kunde, projekte] = await Promise.all([
    getKunde(params.id),
    getProjekte(params.id),
  ])

  if (!kunde) notFound()

  const loeschenMitId = kundeSoftDelete.bind(null, kunde.id)

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link
            href="/dashboard/kunden"
            className="text-xs text-wbc-grau/40 hover:text-wbc-gruen transition-colors mb-3 inline-block"
          >
            ← Zurück zu Kunden
          </Link>
          <h1 className="font-heading text-3xl font-light text-wbc-gruen tracking-wide">{kunde.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/kunden/${kunde.id}/bearbeiten`}
            className="px-4 py-2 text-xs text-wbc-grau/70 border border-[#e8ddd3] hover:border-wbc-sand/60 hover:bg-wbc-creme/40 rounded-lg transition-colors tracking-wide"
          >
            Bearbeiten
          </Link>
          <form action={loeschenMitId}>
            <button
              type="submit"
              className="px-4 py-2 text-xs text-wbc-terra/60 hover:text-wbc-terra transition-colors"
              onClick={(e) => {
                if (!confirm(`„${kunde.name}" wirklich löschen?`)) e.preventDefault()
              }}
            >
              Löschen
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stammdaten */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-[#ede4d9] rounded-xl p-5">
            <h2 className="text-xs font-medium text-wbc-grau/50 uppercase tracking-widest mb-4">
              Kontaktdaten
            </h2>
            <dl className="space-y-3">
              <InfoZeile label="Ansprechpartner" wert={kunde.ansprechpartner} />
              <InfoZeile label="E-Mail" wert={kunde.email} link={kunde.email ? `mailto:${kunde.email}` : undefined} />
              <InfoZeile label="Telefon" wert={kunde.telefon} link={kunde.telefon ? `tel:${kunde.telefon}` : undefined} />
              <InfoZeile label="Adresse" wert={kunde.adresse} />
            </dl>
          </div>

          {kunde.notizen && (
            <div className="bg-white border border-[#ede4d9] rounded-xl p-5">
              <h2 className="text-xs font-medium text-wbc-grau/50 uppercase tracking-widest mb-3">
                Notizen
              </h2>
              <p className="text-sm text-wbc-grau/70 whitespace-pre-wrap leading-relaxed">
                {kunde.notizen}
              </p>
            </div>
          )}
        </div>

        {/* Projekte */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-[#ede4d9] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0e8de]">
              <h2 className="text-sm font-medium text-wbc-gruen">
                Projekte{' '}
                <span className="text-wbc-grau/40 font-normal">({projekte.length})</span>
              </h2>
              <Link
                href={`/dashboard/projekte/neu?kunde=${kunde.id}`}
                className="text-xs text-wbc-grau/50 hover:text-wbc-gruen transition-colors"
              >
                + Neues Projekt
              </Link>
            </div>

            {projekte.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-wbc-grau/40">Noch keine Projekte.</p>
              </div>
            ) : (
              <ul className="divide-y divide-[#f5ede4]">
                {projekte.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/dashboard/projekte/${p.id}`}
                      className="flex items-center justify-between px-5 py-4 hover:bg-wbc-creme/20 transition-colors group"
                    >
                      <div>
                        <p className="text-sm font-medium text-wbc-gruen group-hover:text-wbc-gruen/70">
                          {p.name}
                        </p>
                        {p.beschreibung && (
                          <p className="text-xs text-wbc-grau/50 mt-0.5 line-clamp-1">
                            {p.beschreibung}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          projektStatusFarbe[p.status] ?? 'bg-wbc-creme text-wbc-grau'
                        }`}
                      >
                        {projektStatusLabel[p.status] ?? p.status}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoZeile({
  label,
  wert,
  link,
}: {
  label: string
  wert: string | null
  link?: string
}) {
  if (!wert) return null
  return (
    <div>
      <dt className="text-xs text-wbc-grau/50 mb-0.5">{label}</dt>
      <dd className="text-sm text-wbc-grau/80">
        {link ? (
          <a href={link} className="hover:text-wbc-gruen transition-colors">
            {wert}
          </a>
        ) : (
          wert
        )}
      </dd>
    </div>
  )
}
