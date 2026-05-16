'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ServiceRate, ServiceRateStatus } from '@/lib/supabase/types'

/**
 * Service-Pauschale-Raten (Migration 112).
 * Pro Projekt: 1-N Raten mit Faelligkeit, Rechnungsdatum, Zahlungsstatus.
 */

export interface ServiceRateInput {
  betrag:         number
  faellig_am?:    string | null
  rechnungsdatum?: string | null
  bezahlt_am?:    string | null
  status?:        ServiceRateStatus
  notiz?:         string | null
}

export async function getServiceRaten(projektId: string): Promise<ServiceRate[]> {
  const supabase = await createClient()
  const orgId    = await getOrganisationId()
  const { data } = await supabase
    .from('service_raten')
    .select('*')
    .eq('projekt_id', projektId)
    .eq('organisation_id', orgId)
    .order('reihenfolge', { ascending: true })
    .order('faellig_am',  { ascending: true, nullsFirst: false })
    .order('created_at',  { ascending: true })
  return (data ?? []) as ServiceRate[]
}

export async function serviceRateAnlegen(
  projektId: string,
  daten: ServiceRateInput,
): Promise<{ erfolg: boolean; rate?: ServiceRate; fehler?: string }> {
  try {
    if (!Number.isFinite(daten.betrag) || daten.betrag < 0) {
      return { erfolg: false, fehler: 'Bitte einen gültigen Betrag eingeben.' }
    }
    const supabase = await createClient()
    const orgId    = await getOrganisationId()
    const { data, error } = await supabase
      .from('service_raten')
      .insert({
        organisation_id: orgId,
        projekt_id:      projektId,
        betrag:          daten.betrag,
        faellig_am:      daten.faellig_am || null,
        rechnungsdatum:  daten.rechnungsdatum || null,
        bezahlt_am:      daten.bezahlt_am || null,
        status:          daten.status ?? 'offen',
        notiz:           daten.notiz?.trim() || null,
      })
      .select('*')
      .single()
    if (error || !data) return { erfolg: false, fehler: error?.message ?? 'Fehler beim Speichern.' }

    revalidatePath(`/dashboard/projekte/${projektId}`)
    return { erfolg: true, rate: data as ServiceRate }
  } catch (e) {
    return { erfolg: false, fehler: e instanceof Error ? e.message : 'Unbekannter Fehler.' }
  }
}

export async function serviceRateAktualisieren(
  id: string,
  projektId: string,
  daten: Partial<ServiceRateInput>,
): Promise<{ erfolg: boolean; fehler?: string }> {
  try {
    const supabase = await createClient()
    const orgId    = await getOrganisationId()
    const update: Record<string, unknown> = {}
    if (daten.betrag != null)          update.betrag = daten.betrag
    if (daten.faellig_am !== undefined)     update.faellig_am = daten.faellig_am || null
    if (daten.rechnungsdatum !== undefined) update.rechnungsdatum = daten.rechnungsdatum || null
    if (daten.bezahlt_am !== undefined)     update.bezahlt_am = daten.bezahlt_am || null
    if (daten.status != null)          update.status = daten.status
    if (daten.notiz !== undefined)     update.notiz = daten.notiz?.trim() || null

    const { error } = await supabase
      .from('service_raten')
      .update(update)
      .eq('id', id)
      .eq('projekt_id', projektId)
      .eq('organisation_id', orgId)
    if (error) return { erfolg: false, fehler: error.message }

    revalidatePath(`/dashboard/projekte/${projektId}`)
    return { erfolg: true }
  } catch (e) {
    return { erfolg: false, fehler: e instanceof Error ? e.message : 'Unbekannter Fehler.' }
  }
}

export async function serviceRateAlsBezahltMarkieren(
  id: string,
  projektId: string,
): Promise<{ erfolg: boolean; fehler?: string }> {
  return serviceRateAktualisieren(id, projektId, {
    status:     'bezahlt',
    bezahlt_am: new Date().toISOString().slice(0, 10),
  })
}

export async function serviceRateLoeschen(
  id: string,
  projektId: string,
): Promise<{ erfolg: boolean; fehler?: string }> {
  try {
    const supabase = await createClient()
    const orgId    = await getOrganisationId()
    const { error } = await supabase
      .from('service_raten')
      .delete()
      .eq('id', id)
      .eq('projekt_id', projektId)
      .eq('organisation_id', orgId)
    if (error) return { erfolg: false, fehler: error.message }

    revalidatePath(`/dashboard/projekte/${projektId}`)
    return { erfolg: true }
  } catch (e) {
    return { erfolg: false, fehler: e instanceof Error ? e.message : 'Unbekannter Fehler.' }
  }
}
