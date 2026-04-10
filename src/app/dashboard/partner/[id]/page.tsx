import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { partnerSoftDelete } from '@/app/actions/partner'

type ProduktMitRaum = {
  id: string
  name: string
  menge: number
  einheit: string
  verkaufspreis: number | null
  raeume: { id: string; name: string; projekte: { id: string; name: string } | null } | null
}

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

const modellLabel: Record<string, string> = {
  Prozent:     'Prozent vom VP netto',
  Fix:         'Fixbetrag pro Einheit',
  Individuell: 'Individuell',
}

export default async function PartnerDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const [{ data: partner }, { data: produkte }] = await Promise.all([
    supabase.from('partner').select('*').eq('id', params.id).is('deleted_at', null).single(),
    supabase
      .from('produkte')
      .select('id, name, menge, einheit, verkaufspreis, raeume!inner(id, name, projekte!inner(id, name))')
      .eq('partner_id', params.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ])

  if (!partner) notFound()

  const loeschenAktion = partnerSoftDelete.bind(null, partner.id)
  const gesamtProduktwert = (produkte ?? []).reduce(
    (s, p) => s + (p.verkaufspreis ?? 0) * p.menge, 0
  )

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link href="/dashboard/partner" className="text-xs text-wbc-grau/40 hover:text-wbc-gruen transition-colors mb-3 inline-block">
            ← Zurück zu Partner
          </Link>
          <h1 className="font-heading text-3xl font-light text-wbc-gruen tracking-wide">{partner.name}</h1>
          {partner.website && (
            <a href={partner.website} target="_blank" rel="noopener noreferrer"
              className="text-sm text-wbc-grau/40 hover:text-wbc-gruen transition-colors mt-0.5 inline-block">
              {partner.website} ↗
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/partner/${partner.id}/bearbeiten`}
            className="px-4 py-2 text-xs text-wbc-grau/70 border border-[#e8ddd3] hover:border-wbc-sand/60 hover:bg-wbc-creme/40 rounded-lg transition-colors tracking-wide">
            Bearbeiten
          </Link>
          <form action={loeschenAktion}>
            <button type="submit" className="px-4 py-2 text-xs text-wbc-terra/60 hover:text-wbc-terra transition-colors"
              onClick={(e) => { if (!confirm(`„${partner.name}" wirklich löschen?`)) e.preventDefault() }}>
              Löschen
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stammdaten + Konditionen */}
        <div className="space-y-4">
          <div className="bg-white border border-[#ede4d9] rounded-xl p-5">
            <h2 className="text-xs font-medium text-wbc-grau/50 uppercase tracking-widest mb-4">Kontakt</h2>
            <dl className="space-y-3">
              <InfoZeile label="Ansprechpartner" wert={partner.ansprechpartner} />
              <InfoZeile label="E-Mail" wert={partner.email} link={partner.email ? `mailto:${partner.email}` : undefined} />
              <InfoZeile label="Telefon" wert={partner.telefon} link={partner.telefon ? `tel:${partner.telefon}` : undefined} />
            </dl>
          </div>

          <div className="bg-white border border-[#ede4d9] rounded-xl p-5">
            <h2 className="text-xs font-medium text-wbc-grau/50 uppercase tracking-widest mb-4">Provisionsmodell</h2>
            {partner.provisionsmodell ? (
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-wbc-grau/50 mb-0.5">Modell</dt>
                  <dd className="text-sm text-wbc-grau/80">{modellLabel[partner.provisionsmodell]}</dd>
                </div>
                {partner.provisions_wert != null && partner.provisionsmodell !== 'Individuell' && (
                  <div>
                    <dt className="text-xs text-wbc-grau/50 mb-0.5">
                      {partner.provisionsmodell === 'Prozent' ? 'Satz' : 'Betrag'}
                    </dt>
                    <dd className="text-sm font-mono font-medium text-wbc-gruen">
                      {partner.provisionsmodell === 'Prozent'
                        ? `${partner.provisions_wert} %`
                        : eur(partner.provisions_wert)}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-wbc-grau/40">Kein Provisionsmodell hinterlegt.</p>
            )}
          </div>

          {partner.einkaufskonditionen && (
            <div className="bg-white border border-[#ede4d9] rounded-xl p-5">
              <h2 className="text-xs font-medium text-wbc-grau/50 uppercase tracking-widest mb-3">Einkaufskonditionen</h2>
              <p className="text-sm text-wbc-grau/70 whitespace-pre-wrap leading-relaxed">{partner.einkaufskonditionen}</p>
            </div>
          )}

          {partner.notizen && (
            <div className="bg-white border border-[#ede4d9] rounded-xl p-5">
              <h2 className="text-xs font-medium text-wbc-grau/50 uppercase tracking-widest mb-3">Notizen</h2>
              <p className="text-sm text-wbc-grau/70 whitespace-pre-wrap leading-relaxed">{partner.notizen}</p>
            </div>
          )}
        </div>

        {/* Produkte */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-[#ede4d9] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0e8de]">
              <h2 className="text-sm font-medium text-wbc-gruen">
                Zugeordnete Produkte <span className="text-wbc-grau/40 font-normal">({(produkte ?? []).length})</span>
              </h2>
              {gesamtProduktwert > 0 && (
                <span className="text-xs text-wbc-grau/60 font-mono">
                  VP gesamt: {eur(gesamtProduktwert)}
                </span>
              )}
            </div>

            {(produkte ?? []).length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-wbc-grau/40">Noch keine Produkte diesem Partner zugeordnet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-[#f5ede4]">
                {((produkte as unknown as ProduktMitRaum[]) ?? []).map((p) => (
                  <li key={p.id} className="px-5 py-3.5 hover:bg-wbc-creme/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-wbc-gruen">{p.name}</p>
                        <p className="text-xs text-wbc-grau/50 mt-0.5">
                          {p.raeume?.projekte?.name} › {p.raeume?.name}
                          {' · '}{p.menge} {p.einheit}
                        </p>
                      </div>
                      {p.verkaufspreis != null && (
                        <span className="text-sm font-mono text-wbc-grau/70">{eur(p.verkaufspreis)}</span>
                      )}
                    </div>
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

function InfoZeile({ label, wert, link }: { label: string; wert: string | null; link?: string }) {
  if (!wert) return null
  return (
    <div>
      <dt className="text-xs text-wbc-grau/50 mb-0.5">{label}</dt>
      <dd className="text-sm text-wbc-grau/80">
        {link ? <a href={link} className="hover:text-wbc-gruen transition-colors">{wert}</a> : wert}
      </dd>
    </div>
  )
}
