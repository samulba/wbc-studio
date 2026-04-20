import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Users } from 'lucide-react'
import KundenGrid, { type KundeKarte } from '@/components/KundenGrid'
import StickyPageHeader from '@/components/StickyPageHeader'

async function getKunden(): Promise<KundeKarte[]> {
  const supabase = await createClient()

  const [{ data: kundenDaten }, { data: projekteDaten }] = await Promise.all([
    supabase.from('kunden').select('*').is('deleted_at', null).order('name'),
    supabase.from('projekte').select('kunde_id').is('deleted_at', null),
  ])

  const projektCounts: Record<string, number> = {}
  for (const p of projekteDaten ?? []) {
    projektCounts[p.kunde_id] = (projektCounts[p.kunde_id] ?? 0) + 1
  }

  return (kundenDaten ?? []).map((k) => ({
    id: k.id,
    name: k.name,
    ansprechpartner: k.ansprechpartner ?? null,
    email: k.email ?? null,
    telefon: k.telefon ?? null,
    projektCount: projektCounts[k.id] ?? 0,
    status: (k.status as string) ?? 'aktiv',
    logo_url: k.logo_url ?? null,
  }))
}

export default async function KundenPage() {
  const kunden = await getKunden()

  return (
    <div className="flex-1 overflow-y-auto animate-fadeIn">
      <StickyPageHeader
        title="Kunden"
        count={kunden.length}
        action={
          <Link
            href="/dashboard/kunden/neu"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-wellbeing-green hover:bg-wellbeing-green-dark text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Neuer Kunde
          </Link>
        }
      />
      <div className="px-6 py-6">
      {kunden.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-wellbeing-cream flex items-center justify-center">
            <Users className="w-7 h-7 text-wellbeing-green-light" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">Noch keine Kunden angelegt</p>
            <p className="text-xs text-gray-400 mt-1">Lege deinen ersten Kunden an, um loszulegen.</p>
          </div>
          <Link
            href="/dashboard/kunden/neu"
            className="text-sm px-4 py-2.5 bg-wellbeing-green hover:bg-wellbeing-green-dark text-white rounded-lg font-medium transition-colors"
          >
            + Ersten Kunden anlegen
          </Link>
        </div>
      ) : (
        <KundenGrid kunden={kunden} />
      )}
      </div>
    </div>
  )
}
