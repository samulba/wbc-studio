import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ProjektFormular from '@/components/ProjektFormular'
import { projektAktualisieren } from '@/app/actions/projekte'
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

export default async function ProjektBearbeitenPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const [{ data: projekt }, kunden] = await Promise.all([
    supabase
      .from('projekte')
      .select('*')
      .eq('id', params.id)
      .is('deleted_at', null)
      .single(),
    getKunden(),
  ])

  if (!projekt) notFound()

  const aktion = projektAktualisieren.bind(null, projekt.id)

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link
          href={`/dashboard/projekte/${projekt.id}`}
          className="text-xs text-wbc-grau/40 hover:text-wbc-gruen transition-colors mb-3 inline-block"
        >
          ← Zurück zu {projekt.name}
        </Link>
        <h1 className="font-heading text-3xl font-light text-wbc-gruen tracking-wide">Projekt bearbeiten</h1>
      </div>

      <div className="bg-white border border-[#ede4d9] rounded-xl p-6">
        <ProjektFormular
          aktion={aktion}
          kunden={kunden}
          initialData={projekt}
          abbrechen={`/dashboard/projekte/${projekt.id}`}
          istBearbeiten
        />
      </div>
    </div>
  )
}
