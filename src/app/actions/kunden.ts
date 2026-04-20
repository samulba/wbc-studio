'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { meineRolleAbrufen } from '@/app/actions/team'
import { istAdmin } from '@/lib/permissions'

export type KundeActionState = { fehler: string } | null

export interface KundeImpact {
  projekte:      number
  raeume:        number
  produkte:      number
  angebote:      number
  vertraege:     number
  notizen:       number
  kommunikation: number
  portalUser:    number
}

export async function kundeAnlegen(
  prevState: KundeActionState,
  formData: FormData
): Promise<KundeActionState> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { error } = await supabase.from('kunden').insert({
    name: formData.get('name') as string,
    ansprechpartner: (formData.get('ansprechpartner') as string) || null,
    email: (formData.get('email') as string) || null,
    telefon: (formData.get('telefon') as string) || null,
    adresse: (formData.get('adresse') as string) || null,
    notizen: (formData.get('notizen') as string) || null,
    organisation_id: orgId,
  })

  if (error) return { fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }

  revalidatePath('/dashboard/kunden')
  redirect('/dashboard/kunden')
}

export async function kundeAktualisieren(
  id: string,
  prevState: KundeActionState,
  formData: FormData
): Promise<KundeActionState> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { error } = await supabase
    .from('kunden')
    .update({
      name: formData.get('name') as string,
      ansprechpartner: (formData.get('ansprechpartner') as string) || null,
      email: (formData.get('email') as string) || null,
      telefon: (formData.get('telefon') as string) || null,
      adresse: (formData.get('adresse') as string) || null,
      notizen: (formData.get('notizen') as string) || null,
    })
    .eq('id', id)
    .eq('organisation_id', orgId)
    .is('deleted_at', null)

  if (error) return { fehler: 'Fehler beim Aktualisieren. Bitte erneut versuchen.' }

  revalidatePath('/dashboard/kunden')
  revalidatePath(`/dashboard/kunden/${id}`)
  redirect(`/dashboard/kunden/${id}`)
}

/**
 * Zählt alle abhängigen Datensätze eines Kunden — für Impact-Anzeige
 * im Lösch-Dialog. Admin-Client wegen der RLS auf Portal-Tabellen.
 */
export async function getKundeImpact(kundeId: string): Promise<KundeImpact> {
  const orgId = await getOrganisationId()
  const admin = createAdminClient()

  // Projekt-IDs dieses Kunden laden (für raum-/produkt-Counts)
  const { data: projekte } = await admin
    .from('projekte')
    .select('id')
    .eq('kunde_id', kundeId)
    .eq('organisation_id', orgId)
    .is('deleted_at', null)

  const projektIds = (projekte ?? []).map((p) => p.id)

  // Räume in diesen Projekten
  const { count: raeumeCount } = projektIds.length > 0
    ? await admin
        .from('raeume')
        .select('id', { count: 'exact', head: true })
        .in('projekt_id', projektIds)
        .is('deleted_at', null)
    : { count: 0 }

  // Produkte (via raum_produkte → projekt), einfachheitshalber count raum_produkte für diese Räume
  const { data: raeumeDaten } = projektIds.length > 0
    ? await admin
        .from('raeume')
        .select('id')
        .in('projekt_id', projektIds)
        .is('deleted_at', null)
    : { data: [] as { id: string }[] }

  const raumIds = (raeumeDaten ?? []).map((r) => r.id)
  const { count: produkteCount } = raumIds.length > 0
    ? await admin
        .from('raum_produkte')
        .select('id', { count: 'exact', head: true })
        .in('raum_id', raumIds)
    : { count: 0 }

  // Angebote + Verträge direkt auf kunde_id
  const [angeboteRes, vertraegeRes, notizenRes, kommRes, portalRes] = await Promise.all([
    admin.from('angebote').select('id', { count: 'exact', head: true })
      .eq('kunde_id', kundeId).eq('organisation_id', orgId),
    admin.from('vertraege').select('id', { count: 'exact', head: true })
      .eq('kunde_id', kundeId).eq('organisation_id', orgId),
    admin.from('notizen').select('id', { count: 'exact', head: true })
      .eq('typ', 'kunde').eq('referenz_id', kundeId).is('deleted_at', null),
    admin.from('kommunikation').select('id', { count: 'exact', head: true })
      .eq('kunde_id', kundeId).eq('organisation_id', orgId),
    admin.from('client_users').select('id', { count: 'exact', head: true })
      .eq('kunde_id', kundeId),
  ])

  return {
    projekte:      projektIds.length,
    raeume:        raeumeCount ?? 0,
    produkte:      produkteCount ?? 0,
    angebote:      angeboteRes.count ?? 0,
    vertraege:     vertraegeRes.count ?? 0,
    notizen:       notizenRes.count ?? 0,
    kommunikation: kommRes.count ?? 0,
    portalUser:    portalRes.count ?? 0,
  }
}

/**
 * Soft-Delete eines Kunden. NUR Admins dürfen löschen.
 * Erfordert dass der eingegebene Bestätigungsname mit kunde.name übereinstimmt
 * (client-seitig erzwungen, hier als zweite Absicherung).
 */
export async function kundeSoftDelete(
  id: string,
  bestaetigungsName?: string,
): Promise<{ fehler?: string }> {
  const rolle = await meineRolleAbrufen()
  if (!istAdmin(rolle)) return { fehler: 'Nur Admins dürfen Kunden löschen.' }

  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Bestätigungsname prüfen (wenn übergeben)
  if (bestaetigungsName !== undefined) {
    const { data: kunde } = await supabase
      .from('kunden').select('name').eq('id', id).eq('organisation_id', orgId).maybeSingle()
    if (!kunde) return { fehler: 'Kunde nicht gefunden.' }
    if (kunde.name.trim() !== bestaetigungsName.trim()) {
      return { fehler: 'Bestätigungsname stimmt nicht überein.' }
    }
  }

  const { error } = await supabase
    .from('kunden')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organisation_id', orgId)
    .is('deleted_at', null)

  if (error) return { fehler: 'Fehler beim Löschen.' }

  revalidatePath('/dashboard/kunden')
  return {}
}

/** Archivierte Kunden laden (deleted_at IS NOT NULL). */
export async function getArchivierteKunden(): Promise<Array<{
  id: string; name: string; email: string | null; deleted_at: string
}>> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data } = await supabase
    .from('kunden')
    .select('id, name, email, deleted_at')
    .eq('organisation_id', orgId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
  return (data ?? []) as Array<{ id: string; name: string; email: string | null; deleted_at: string }>
}

/** Kunde aus Archiv wiederherstellen. Nur Admins. */
export async function kundeWiederherstellen(id: string): Promise<{ fehler?: string }> {
  const rolle = await meineRolleAbrufen()
  if (!istAdmin(rolle)) return { fehler: 'Nur Admins dürfen wiederherstellen.' }

  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { error } = await supabase
    .from('kunden')
    .update({ deleted_at: null })
    .eq('id', id)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Fehler beim Wiederherstellen.' }
  revalidatePath('/dashboard/kunden')
  return {}
}
