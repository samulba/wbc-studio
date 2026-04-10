import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ProjektFormular from '@/components/ProjektFormular'
import { projektAnlegen } from '@/app/actions/projekte'
import type { Kunde } from '@/lib/supabase/types'

async function getKunden(): Promise<Pick<Kunde, 'id' | 'name'>[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('kunden')
    .select('id, name')
    .is('deleted_at', null)
    .order('name')
  return data ?? []
}

export default async function NeuesProjektPage({
  searchParams,
}: {
  searchParams: { kunde?: string }
}) {
  const kunden = await getKunden()

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link
          href="/dashboard/projekte"
          className="text-xs text-wbc-grau/40 hover:text-wbc-gruen transition-colors mb-3 inline-block"
        >
          ← Zurück zu Projekte
        </Link>
        <h1 className="font-heading text-3xl font-light text-wbc-gruen tracking-wide">Neues Projekt</h1>
      </div>

      {kunden.length === 0 ? (
        <div className="bg-wbc-terra/5 border border-wbc-terra/20 rounded-xl p-5 text-sm text-wbc-terra/80">
          Bitte zuerst einen{' '}
          <Link href="/dashboard/kunden/neu" className="underline underline-offset-2">
            Kunden anlegen
          </Link>
          , bevor ein Projekt erstellt werden kann.
        </div>
      ) : (
        <div className="bg-white border border-[#ede4d9] rounded-xl p-6">
          <ProjektFormular
            aktion={projektAnlegen}
            kunden={kunden}
            abbrechen="/dashboard/projekte"
            vorausgewaehlterKundeId={searchParams.kunde}
          />
        </div>
      )}
    </div>
  )
}
