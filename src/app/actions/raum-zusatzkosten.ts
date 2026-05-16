'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { RaumZusatzkosten, RaumZusatzkostenKategorie } from '@/lib/supabase/types'

/**
 * Raum-Zusatzkosten: Lieferung, Handwerker, Malerarbeiten, Montage,
 * Sonstiges (Migration 112). Pro Raum, fliessen in die Budget-
 * Auslastung ein (separat von Servicepauschale).
 */

export interface ZusatzkostenInput {
  titel:        string
  kategorie:    RaumZusatzkostenKategorie
  betrag_netto: number
  notiz?:       string | null
}

export async function getRaumZusatzkosten(raumId: string): Promise<RaumZusatzkosten[]> {
  const supabase = await createClient()
  const orgId    = await getOrganisationId()
  const { data } = await supabase
    .from('raum_zusatzkosten')
    .select('*')
    .eq('raum_id', raumId)
    .eq('organisation_id', orgId)
    .order('reihenfolge', { ascending: true })
    .order('created_at', { ascending: true })
  return (data ?? []) as RaumZusatzkosten[]
}

export async function zusatzkostenAnlegen(
  raumId: string,
  projektId: string,
  daten: ZusatzkostenInput,
): Promise<{ erfolg: boolean; eintrag?: RaumZusatzkosten; fehler?: string }> {
  try {
    if (!daten.titel.trim()) return { erfolg: false, fehler: 'Titel ist erforderlich.' }
    if (!Number.isFinite(daten.betrag_netto) || daten.betrag_netto < 0) {
      return { erfolg: false, fehler: 'Bitte einen gültigen Netto-Betrag eingeben.' }
    }
    const supabase = await createClient()
    const orgId    = await getOrganisationId()
    const { data, error } = await supabase
      .from('raum_zusatzkosten')
      .insert({
        organisation_id: orgId,
        raum_id:         raumId,
        titel:           daten.titel.trim(),
        kategorie:       daten.kategorie,
        betrag_netto:    daten.betrag_netto,
        notiz:           daten.notiz?.trim() || null,
      })
      .select('*')
      .single()
    if (error || !data) return { erfolg: false, fehler: error?.message ?? 'Fehler beim Speichern.' }

    revalidatePath(`/dashboard/projekte/${projektId}`)
    revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
    return { erfolg: true, eintrag: data as RaumZusatzkosten }
  } catch (e) {
    return { erfolg: false, fehler: e instanceof Error ? e.message : 'Unbekannter Fehler.' }
  }
}

export async function zusatzkostenAktualisieren(
  id: string,
  raumId: string,
  projektId: string,
  daten: Partial<ZusatzkostenInput>,
): Promise<{ erfolg: boolean; fehler?: string }> {
  try {
    const supabase = await createClient()
    const orgId    = await getOrganisationId()
    const update: Record<string, unknown> = {}
    if (daten.titel != null)        update.titel = daten.titel.trim()
    if (daten.kategorie != null)    update.kategorie = daten.kategorie
    if (daten.betrag_netto != null) update.betrag_netto = daten.betrag_netto
    if (daten.notiz !== undefined)  update.notiz = daten.notiz?.trim() || null

    const { error } = await supabase
      .from('raum_zusatzkosten')
      .update(update)
      .eq('id', id)
      .eq('raum_id', raumId)
      .eq('organisation_id', orgId)
    if (error) return { erfolg: false, fehler: error.message }

    revalidatePath(`/dashboard/projekte/${projektId}`)
    revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
    return { erfolg: true }
  } catch (e) {
    return { erfolg: false, fehler: e instanceof Error ? e.message : 'Unbekannter Fehler.' }
  }
}

export async function zusatzkostenLoeschen(
  id: string,
  raumId: string,
  projektId: string,
): Promise<{ erfolg: boolean; fehler?: string }> {
  try {
    const supabase = await createClient()
    const orgId    = await getOrganisationId()
    const { error } = await supabase
      .from('raum_zusatzkosten')
      .delete()
      .eq('id', id)
      .eq('raum_id', raumId)
      .eq('organisation_id', orgId)
    if (error) return { erfolg: false, fehler: error.message }

    revalidatePath(`/dashboard/projekte/${projektId}`)
    revalidatePath(`/dashboard/projekte/${projektId}/raeume/${raumId}`)
    return { erfolg: true }
  } catch (e) {
    return { erfolg: false, fehler: e instanceof Error ? e.message : 'Unbekannter Fehler.' }
  }
}
