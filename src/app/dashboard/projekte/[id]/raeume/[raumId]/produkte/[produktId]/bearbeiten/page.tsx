import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import ProduktFormular from '@/components/ProduktFormular'
import { produktAktualisieren } from '@/app/actions/produkte'
import { getMwstSatz, getKategorien } from '@/app/actions/einstellungen'
import type { Partner, ProduktMitDetails } from '@/lib/supabase/types'
import type { Notiz } from '@/components/NotizBlock'

async function getPartner(): Promise<Pick<Partner, 'id' | 'name'>[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('partner').select('id, name').is('deleted_at', null).order('name')
  return data ?? []
}

async function getProdukt(produktId: string): Promise<ProduktMitDetails | null> {
  const supabase = await createClient()
  // Mig. 078: produktstatus-JOIN entfernt (Status ist pro raum_produkte)
  const { data } = await supabase
    .from('produkte')
    .select('*, partner(id, name)')
    .eq('id', produktId)
    .is('deleted_at', null)
    .single()
  if (!data) return null
  return { ...data, produktstatus: null } as ProduktMitDetails
}

async function getProduktNotizen(produktId: string): Promise<Notiz[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('notizen')
    .select('id, inhalt, erstellt_von, erstellt_am, bearbeitet_am')
    .eq('typ', 'produkt')
    .eq('referenz_id', produktId)
    .is('deleted_at', null)
    .order('erstellt_am', { ascending: false })
  return (data ?? []) as Notiz[]
}

export default async function ProduktBearbeitenPage({
  params,
}: {
  params: { id: string; raumId: string; produktId: string }
}) {
  const [produkt, partner, notizen, mwst, kategorienRoh] = await Promise.all([
    getProdukt(params.produktId),
    getPartner(),
    getProduktNotizen(params.produktId),
    getMwstSatz(),
    getKategorien('produktkategorie'),
  ])
  const kategorienListe = kategorienRoh.map((k) => ({ name: k.name }))

  if (!produkt) notFound()

  const aktion   = produktAktualisieren.bind(null, produkt.id, params.raumId, params.id)
  const zurueck  = `/dashboard/projekte/${params.id}/raeume/${params.raumId}`

  return (
    <div className="flex-1 overflow-hidden flex flex-col animate-fadeIn">
      {/* Kompakter Header */}
      <div className="shrink-0 px-6 pt-4 pb-3 border-b border-gray-100 flex items-center gap-3">
        <Link
          href={zurueck}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-wellbeing-green transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Zurück zum Raum
        </Link>
        <span className="text-gray-200">/</span>
        <p className="text-sm font-medium text-gray-700 truncate">{produkt.name}</p>
      </div>

      {/* Formular nimmt den Rest der Höhe ein */}
      <div className="flex-1 overflow-hidden bg-white">
        <ProduktFormular
          aktion={aktion}
          partner={partner}
          kategorienListe={kategorienListe}
          initialData={produkt}
          abbrechen={zurueck}
          mwst={mwst}
          notizen={notizen}
          produktId={produkt.id}
        />
      </div>
    </div>
  )
}
