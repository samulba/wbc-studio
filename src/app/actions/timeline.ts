'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TimelineEvent, TimelineEventTyp, TimelineEventStatus } from '@/lib/supabase/types'

export type TimelineEventDaten = {
  titel: string
  beschreibung?: string | null
  typ: TimelineEventTyp
  start_datum: string
  end_datum?: string | null
  status?: TimelineEventStatus
  farbe?: string | null
  verantwortlich?: string | null
  erinnerung_tage?: number | null
  raum_id?: string | null
}

// ── Alle Events eines Projekts ────────────────────────────────
export async function eventsAbrufen(projektId: string): Promise<TimelineEvent[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('timeline_events')
    .select('*')
    .eq('projekt_id', projektId)
    .order('start_datum')
    .order('reihenfolge')
  return (data ?? []) as TimelineEvent[]
}

// ── Event erstellen ───────────────────────────────────────────
export async function eventErstellen(
  projektId: string,
  daten: TimelineEventDaten
): Promise<{ id: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data, error } = await supabase
    .from('timeline_events')
    .insert({ projekt_id: projektId, ...daten, organisation_id: orgId })
    .select('id')
    .single()
  if (error || !data) throw new Error('Event konnte nicht erstellt werden.')
  revalidatePath(`/dashboard/projekte/${projektId}/timeline`)
  revalidatePath(`/dashboard/projekte/${projektId}`)
  if (daten.raum_id) {
    revalidatePath(`/dashboard/projekte/${projektId}/raeume/${daten.raum_id}`)
  }
  return { id: data.id }
}

// ── Event aktualisieren ───────────────────────────────────────
export async function eventAktualisieren(
  eventId: string,
  projektId: string,
  daten: Partial<TimelineEventDaten>
): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  await supabase.from('timeline_events').update(daten).eq('id', eventId).eq('organisation_id', orgId)
  revalidatePath(`/dashboard/projekte/${projektId}/timeline`)
  revalidatePath(`/dashboard/projekte/${projektId}`)
  if (daten.raum_id) {
    revalidatePath(`/dashboard/projekte/${projektId}/raeume/${daten.raum_id}`)
  }
}

// ── Event löschen ─────────────────────────────────────────────
export async function eventLoeschen(
  eventId: string,
  projektId: string,
  raumId?: string | null
): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  await supabase.from('timeline_events').delete().eq('id', eventId).eq('organisation_id', orgId)
  revalidatePath(`/dashboard/projekte/${projektId}/timeline`)
  revalidatePath(`/dashboard/projekte/${projektId}`)
  if (raumId) {
    revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
  }
}

// ── Nächste Events für Mini-Preview ──────────────────────────
export async function naechsteEventsAbrufen(projektId: string, limit = 3): Promise<TimelineEvent[]> {
  const supabase = await createClient()
  const heute = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('timeline_events')
    .select('*')
    .eq('projekt_id', projektId)
    .neq('status', 'abgeschlossen')
    .gte('start_datum', heute)
    .order('start_datum')
    .limit(limit)
  return (data ?? []) as TimelineEvent[]
}

// ── Events eines Projekts (alle, mit Raum-Join) ───────────────
export async function projektEventsAbrufen(
  projektId: string
): Promise<(TimelineEvent & { raum: { id: string; name: string } | null })[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('timeline_events')
    .select('*, raum:raeume(id, name)')
    .eq('projekt_id', projektId)
    .order('start_datum')
    .order('reihenfolge')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []) as any
}

// ── Events eines Raums ────────────────────────────────────────
export async function raumEventsAbrufen(
  raumId: string
): Promise<TimelineEvent[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('timeline_events')
    .select('*')
    .eq('raum_id', raumId)
    .order('start_datum')
    .order('reihenfolge')
  return (data ?? []) as TimelineEvent[]
}

// ── Liefertermin auf Produkt setzen ──────────────────────────
export async function lieferterminSetzen(
  produktId: string,
  projektId: string,
  datum: string | null,
  bestaetigt = false
): Promise<void> {
  const supabase = await createClient()
  await supabase.from('produkte').update({
    liefertermin:             datum,
    liefertermin_bestaetigt:  bestaetigt,
  }).eq('id', produktId)
  revalidatePath(`/dashboard/projekte/${projektId}/timeline`)
}
