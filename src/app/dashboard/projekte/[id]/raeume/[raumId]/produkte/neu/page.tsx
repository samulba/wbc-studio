import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ProduktFormular from '@/components/ProduktFormular'
import { produktAnlegen } from '@/app/actions/produkte'
import type { Partner } from '@/lib/supabase/types'

async function getPartner(): Promise<Pick<Partner, 'id' | 'name'>[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('partner')
    .select('id, name')
    .is('deleted_at', null)
    .order('name')
  return data ?? []
}

async function getRaum(raumId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('raeume')
    .select('id, name, projekte(id, name)')
    .eq('id', raumId)
    .is('deleted_at', null)
    .single()
  return data as { id: string; name: string; projekte: { id: string; name: string } | null } | null
}

export default async function NeuesProduktPage({
  params,
}: {
  params: { id: string; raumId: string }
}) {
  const [raum, partner] = await Promise.all([
    getRaum(params.raumId),
    getPartner(),
  ])

  if (!raum) notFound()

  const projekt = raum.projekte
  const aktion = produktAnlegen.bind(null, params.raumId, params.id)
  const zurueck = `/dashboard/projekte/${params.id}/raeume/${params.raumId}`

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <nav className="flex items-center gap-1.5 text-xs text-wbc-grau/40 mb-3">
          <Link href={`/dashboard/projekte/${params.id}`} className="hover:text-wbc-gruen transition-colors">
            {projekt?.name ?? 'Projekt'}
          </Link>
          <span>›</span>
          <Link href={zurueck} className="hover:text-wbc-gruen transition-colors">
            {raum.name}
          </Link>
          <span>›</span>
          <span className="text-wbc-grau/70">Neues Produkt</span>
        </nav>
        <h1 className="font-heading text-3xl font-light text-wbc-gruen tracking-wide">Neues Produkt</h1>
      </div>

      <div className="bg-white border border-[#ede4d9] rounded-xl p-6">
        <ProduktFormular
          aktion={aktion}
          partner={partner}
          abbrechen={zurueck}
        />
      </div>
    </div>
  )
}
