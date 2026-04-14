import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { ProjektMitKunde } from '@/lib/supabase/types'
import {
  KpiKartenReihe,
  NaechsteDeadlines,
  OffeneFollowUps,
  BudgetUebersicht,
  LetzteProjekte,
  type DeadlineProjekt,
  type FollowUpEintrag,
  type BudgetProjekt,
  type LetzesProjekt,
} from '@/components/DashboardWidgets'

// ── Hilfsfunktionen ───────────────────────────────────────────

function tageDiff(isoDate: string): number {
  return Math.floor((new Date(isoDate).getTime() - Date.now()) / 86_400_000)
}

/** Führt einen Supabase-Query sicher aus und gibt null zurück wenn er fehlschlägt. */
async function safeQuery<T>(
  queryFn: () => PromiseLike<{ data: T | null; error: unknown; count?: number | null }>
): Promise<{ data: T | null; count: number | null }> {
  try {
    const result = await queryFn()
    if (result.error) return { data: null, count: null }
    return { data: result.data, count: result.count ?? null }
  } catch {
    return { data: null, count: null }
  }
}

// ── Datenabruf ────────────────────────────────────────────────

async function getDashboardData() {
  const supabase = await createClient()

  const now         = new Date()
  const monatsStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const in60Tagen   = new Date(now); in60Tagen.setDate(now.getDate() + 60)
  const in7Tagen    = new Date(now); in7Tagen.setDate(now.getDate() + 7)
  const in7TagenStr = in7Tagen.toISOString().slice(0, 10)
  const in60Str     = in60Tagen.toISOString().slice(0, 10)

  // Alle Kern-Queries parallel, jeder mit eigenem Fehler-Schutz
  const [
    aktiveKundenResult,
    laufendeProjekteResult,
    deadlineProjekteResult,
    letzteProjekteResult,
    produkteKostenResult,
    aktivProjekteBudgetResult,
  ] = await Promise.all([

    // Aktive Kunden – ohne status-Filter als Fallback falls Spalte fehlt
    safeQuery(() =>
      supabase
        .from('kunden')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
    ),

    // Laufende Projekte
    safeQuery(() =>
      supabase
        .from('projekte')
        .select('*', { count: 'exact', head: true })
        .in('status', ['offen', 'in_bearbeitung'])
        .is('deleted_at', null)
        .eq('archiviert', false)
    ),

    // Nächste Deadlines
    safeQuery(() =>
      supabase
        .from('projekte')
        .select('id, name, deadline, kunden(name)')
        .is('deleted_at', null)
        .eq('archiviert', false)
        .in('status', ['offen', 'in_bearbeitung'])
        .not('deadline', 'is', null)
        .lte('deadline', in60Str)
        .order('deadline', { ascending: true })
        .limit(6)
    ),

    // Letzte Projekte
    safeQuery(() =>
      supabase
        .from('projekte')
        .select('*, kunden(id, name)')
        .is('deleted_at', null)
        .eq('archiviert', false)
        .order('created_at', { ascending: false })
        .limit(8)
    ),

    // Budget: Ist-Kosten aus raum_produkte
    safeQuery(() =>
      supabase
        .from('raum_produkte')
        .select('menge, verkaufspreis_override, raeume!inner(projekt_id), produkte!inner(verkaufspreis)')
    ),

    // Aktive Projekte mit Budget
    safeQuery(() =>
      supabase
        .from('projekte')
        .select('id, name, gesamtbudget')
        .is('deleted_at', null)
        .eq('archiviert', false)
        .in('status', ['offen', 'in_bearbeitung'])
        .not('gesamtbudget', 'is', null)
        .order('gesamtbudget', { ascending: false })
        .limit(5)
    ),
  ])

  // Angebote (eigene try/catch – Tabelle evtl. nicht migriert)
  let offeneAngebote = 0
  let monatsumsatz   = 0
  try {
    const [r1, r2] = await Promise.all([
      safeQuery(() =>
        supabase
          .from('angebote')
          .select('*', { count: 'exact', head: true })
          .in('status', ['entwurf', 'gesendet'])
      ),
      safeQuery(() =>
        supabase
          .from('angebote')
          .select('brutto_summe')
          .eq('status', 'angenommen')
          .gte('created_at', monatsStart)
      ),
    ])
    offeneAngebote = r1.count ?? 0
    monatsumsatz   = ((r2.data ?? []) as { brutto_summe: number | null }[])
      .reduce((sum, a) => sum + (a.brutto_summe ?? 0), 0)
  } catch { /* angebote-Tabelle noch nicht migriert */ }

  // Follow-ups (eigene try/catch – Tabelle evtl. nicht migriert)
  let followUpEintraege: FollowUpEintrag[] = []
  try {
    const r = await safeQuery(() =>
      supabase
        .from('kommunikation')
        .select('id, typ, betreff, follow_up_datum, kunden!inner(id, name)')
        .eq('erledigt', false)
        .not('follow_up_datum', 'is', null)
        .lte('follow_up_datum', in7TagenStr)
        .order('follow_up_datum', { ascending: true })
        .limit(8)
    )

    type FollowUpRaw = {
      id: string
      typ: string
      betreff: string | null
      follow_up_datum: string
      kunden: { id: string; name: string } | null
    }

    followUpEintraege = ((r.data ?? []) as unknown as FollowUpRaw[]).map((e) => ({
      id:              e.id,
      kundeId:         e.kunden?.id ?? '',
      kundenName:      e.kunden?.name ?? '–',
      typ:             e.typ,
      betreff:         e.betreff,
      follow_up_datum: e.follow_up_datum,
      tageVerbleibend: Math.floor((new Date(e.follow_up_datum).getTime() - Date.now()) / 86_400_000),
    }))
  } catch { /* tabelle existiert noch nicht */ }

  // ── Berechnungen ───────────────────────────────────────────

  type DeadlineRaw = { id: string; name: string; deadline: string; kunden: { name: string } | null }
  const naechsteDeadlines: DeadlineProjekt[] = (
    (deadlineProjekteResult.data ?? []) as unknown as DeadlineRaw[]
  ).map((p) => ({
    id:              p.id,
    name:            p.name,
    kundenName:      p.kunden?.name ?? null,
    deadline:        p.deadline,
    tageVerbleibend: tageDiff(p.deadline),
  }))

  type KostenRaw = {
    menge: number
    verkaufspreis_override: number | null
    raeume:   { projekt_id: string } | null
    produkte: { verkaufspreis: number | null } | null
  }
  const kostenByProjekt = new Map<string, number>()
  for (const e of (produkteKostenResult.data ?? []) as unknown as KostenRaw[]) {
    if (!e.raeume) continue
    const ep    = e.verkaufspreis_override ?? e.produkte?.verkaufspreis ?? 0
    const prev  = kostenByProjekt.get(e.raeume.projekt_id) ?? 0
    kostenByProjekt.set(e.raeume.projekt_id, prev + ep * e.menge)
  }

  const budgetProjekte: BudgetProjekt[] = (
    (aktivProjekteBudgetResult.data ?? []) as { id: string; name: string; gesamtbudget: number | null }[]
  )
    .filter((p) => (p.gesamtbudget ?? 0) > 0)
    .map((p) => {
      const ist    = Math.round((kostenByProjekt.get(p.id) ?? 0) * 100) / 100
      const budget = p.gesamtbudget ?? 0
      return {
        id:        p.id,
        name:      p.name,
        budget,
        istKosten: ist,
        prozent:   budget > 0 ? Math.min(Math.round((ist / budget) * 100), 999) : 0,
      }
    })

  const letzteProjekte: LetzesProjekt[] = (
    (letzteProjekteResult.data ?? []) as ProjektMitKunde[]
  ).map((p) => ({
    id:           p.id,
    name:         p.name,
    kundenName:   p.kunden?.name ?? null,
    status:       p.status,
    gesamtbudget: p.gesamtbudget ?? null,
    deadline:     p.deadline ?? null,
    created_at:   p.created_at,
  }))

  return {
    aktiveKunden:     aktiveKundenResult.count     ?? 0,
    laufendeProjekte: laufendeProjekteResult.count ?? 0,
    offeneAngebote,
    monatsumsatz,
    naechsteDeadlines,
    followUpEintraege,
    budgetProjekte,
    letzteProjekte,
  }
}

// ── Seite ─────────────────────────────────────────────────────

export default async function DashboardPage() {
  const {
    aktiveKunden, laufendeProjekte, offeneAngebote, monatsumsatz,
    naechsteDeadlines, followUpEintraege,
    budgetProjekte,
    letzteProjekte,
  } = await getDashboardData()

  return (
    <div className="h-full overflow-y-auto px-6 py-5 space-y-4 animate-fadeIn">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-[28px] font-bold text-gray-900 leading-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Willkommen im Wellbeing Spaces Studio.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard/kunden/neu"
            className="text-sm px-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 rounded-lg font-medium transition-colors"
          >
            + Kunde
          </Link>
          <Link
            href="/dashboard/projekte/neu"
            className="text-sm px-5 py-2.5 bg-wellbeing-green hover:bg-wellbeing-green-dark text-white rounded-lg font-semibold transition-colors min-w-[140px] text-center"
          >
            + Neues Projekt
          </Link>
        </div>
      </div>

      {/* ROW 1: KPI-Kacheln – Icons werden client-seitig in KpiKartenReihe aufgelöst */}
      <KpiKartenReihe
        aktiveKunden={aktiveKunden}
        laufendeProjekte={laufendeProjekte}
        offeneAngebote={offeneAngebote}
        monatsumsatz={monatsumsatz}
      />

      {/* ROW 2: Deadlines + Follow-ups */}
      <div className="grid grid-cols-2 gap-4 min-h-[220px]">
        <NaechsteDeadlines projekte={naechsteDeadlines} />
        <OffeneFollowUps eintraege={followUpEintraege} />
      </div>

      {/* ROW 3: Budget-Übersicht */}
      <div className="min-h-[220px]">
        <BudgetUebersicht projekte={budgetProjekte} />
      </div>

      {/* ROW 4: Letzte Projekte */}
      <div className="min-h-[280px]">
        <LetzteProjekte projekte={letzteProjekte} />
      </div>

    </div>
  )
}
