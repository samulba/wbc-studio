import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Kunde } from '@/lib/supabase/types'

async function getKunden(): Promise<Kunde[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('kunden')
    .select('*')
    .is('deleted_at', null)
    .order('name')
  return data ?? []
}

export default async function KundenPage() {
  const kunden = await getKunden()

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-light text-wbc-gruen tracking-wide">Kunden</h1>
          <p className="text-sm text-wbc-grau/50 mt-0.5">{kunden.length} Einträge</p>
        </div>
        <Link
          href="/dashboard/kunden/neu"
          className="px-4 py-2.5 bg-wbc-gruen hover:bg-wbc-gruen-dark text-white text-xs font-medium tracking-[0.12em] uppercase rounded-lg transition-colors"
        >
          + Neuer Kunde
        </Link>
      </div>

      {/* Leerzustand */}
      {kunden.length === 0 && (
        <div className="text-center py-16 bg-white border border-[#ede4d9] rounded-xl">
          <p className="text-wbc-grau/50 text-sm">Noch keine Kunden angelegt.</p>
          <Link
            href="/dashboard/kunden/neu"
            className="inline-block mt-3 text-sm text-wbc-gruen underline underline-offset-2"
          >
            Ersten Kunden anlegen
          </Link>
        </div>
      )}

      {/* Tabelle */}
      {kunden.length > 0 && (
        <div className="bg-white border border-[#ede4d9] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#f0e8de] bg-wbc-creme/30">
                <th className={thKlasse}>Firmenname</th>
                <th className={thKlasse}>Ansprechpartner</th>
                <th className={thKlasse}>E-Mail</th>
                <th className={thKlasse}>Telefon</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {kunden.map((kunde, i) => (
                <tr
                  key={kunde.id}
                  className={`hover:bg-wbc-creme/20 transition-colors ${
                    i < kunden.length - 1 ? 'border-b border-[#f5ede4]' : ''
                  }`}
                >
                  <td className="px-5 py-3.5 font-medium text-wbc-gruen">
                    {kunde.name}
                  </td>
                  <td className="px-5 py-3.5 text-wbc-grau/70">
                    {kunde.ansprechpartner ?? '–'}
                  </td>
                  <td className="px-5 py-3.5 text-wbc-grau/70">
                    {kunde.email ? (
                      <a
                        href={`mailto:${kunde.email}`}
                        className="hover:text-wbc-gruen transition-colors"
                      >
                        {kunde.email}
                      </a>
                    ) : (
                      '–'
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-wbc-grau/70">
                    {kunde.telefon ?? '–'}
                  </td>
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/dashboard/kunden/${kunde.id}`}
                      className="text-xs text-wbc-grau/40 hover:text-wbc-gruen transition-colors"
                    >
                      Öffnen →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const thKlasse =
  'px-5 py-3 text-left text-xs font-medium text-wbc-grau/50 uppercase tracking-widest'
