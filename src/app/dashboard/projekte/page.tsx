import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import ProjekteGrid, { type ProjektMitStats } from '@/components/ProjekteGrid'
import StickyPageHeader from '@/components/StickyPageHeader'

async function getProjekteMitStats(): Promise<ProjektMitStats[]> {
  const supabase = await createClient()

  const [{ data: projekte }, { data: raeume }, { data: produkte }] = await Promise.all([
    supabase.from('projekte').select('*, kunden(id, name, logo_url)').is('deleted_at', null).order('archiviert').order('created_at', { ascending: false }),
    supabase.from('raeume').select('id, projekt_id').is('deleted_at', null),
    supabase.from('produkte').select('raum_id, verkaufspreis, menge, produktstatus(status)').is('deleted_at', null),
  ])

  // raum_id → projekt_id
  const raumProjektMap: Record<string, string> = {}
  const raumCount: Record<string, number> = {}
  for (const r of raeume ?? []) {
    raumProjektMap[r.id] = r.projekt_id
    raumCount[r.projekt_id] = (raumCount[r.projekt_id] ?? 0) + 1
  }

  const offeneFreigaben: Record<string, number> = {}
  const vpGesamt: Record<string, number> = {}

  for (const p of produkte ?? []) {
    const pid = raumProjektMap[p.raum_id]
    if (!pid) continue
    const statusObj = Array.isArray(p.produktstatus) ? p.produktstatus[0] : p.produktstatus
    const status = statusObj?.status ?? 'ausstehend'
    if (status === 'ausstehend' || status === 'ueberarbeitung') {
      offeneFreigaben[pid] = (offeneFreigaben[pid] ?? 0) + 1
    }
    vpGesamt[pid] = (vpGesamt[pid] ?? 0) + (p.verkaufspreis ?? 0) * p.menge
  }

  return (projekte ?? []).map((p) => ({
    ...p,
    kunden:          p.kunden as { id: string; name: string; logo_url: string | null } | null,
    archiviert:      p.archiviert ?? false,
    archiviert_am:   p.archiviert_am ?? null,
    deadline:        p.deadline ?? null,
    raeumCount:      raumCount[p.id]      ?? 0,
    offeneFreigaben: offeneFreigaben[p.id] ?? 0,
    vpGesamt:        Math.round((vpGesamt[p.id] ?? 0) * 100) / 100,
  }))
}

export default async function ProjektePage() {
  const projekte = await getProjekteMitStats()

  const aktiveCount = projekte.filter((p) => !p.archiviert).length

  return (
    <div className="flex-1 overflow-y-auto animate-fadeIn">
      <StickyPageHeader
        title="Projekte"
        count={aktiveCount}
        countLabel="aktive Projekte"
        action={
          <Link
            href="/dashboard/projekte/neu"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-wellbeing-green hover:bg-wellbeing-green-dark hover:scale-[1.02] active:scale-[0.98] text-white text-sm font-medium rounded-lg transition-all duration-200"
          >
            <Plus className="w-4 h-4" />Neues Projekt
          </Link>
        }
      />
      <div className="px-6 py-6">
        {projekte.length === 0 ? (
          <div className="text-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm">
            <p className="text-gray-500 text-sm">Noch keine Projekte angelegt.</p>
            <Link href="/dashboard/projekte/neu" className="inline-block mt-3 text-sm text-wellbeing-green underline underline-offset-2">
              Erstes Projekt anlegen
            </Link>
          </div>
        ) : (
          <ProjekteGrid projekte={projekte} />
        )}
      </div>
    </div>
  )
}
