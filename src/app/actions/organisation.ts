'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getOrganisationId } from '@/lib/supabase/server'
import type { Organisation } from '@/lib/supabase/types'

// ── Hilfsfunktion: Slug aus Name generieren ───────────────────
function nameZuSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[äöü]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue' }[c] ?? c))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

// ── Organisation erstellen ────────────────────────────────────
/**
 * Erstellt eine neue Organisation.
 * Nutzt Admin-Client – kein Auth-Context erforderlich.
 */
export async function organisationErstellen(name: string): Promise<string> {
  const admin = createAdminClient()
  const slug = nameZuSlug(name)

  const { data, error } = await admin
    .from('organisationen')
    .insert({ name, slug })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Organisation konnte nicht erstellt werden: ${error?.message}`)
  }

  return data.id as string
}

// ── User mit Org verknüpfen ───────────────────────────────────
/**
 * Trägt den User als Admin in team_mitglieder ein.
 * Nutzt Admin-Client – läuft im Auth-Callback ohne User-Session.
 */
export async function userMitOrgVerknuepfen(
  userId: string,
  email: string,
  orgId: string
): Promise<void> {
  const admin = createAdminClient()

  const { error } = await admin.from('team_mitglieder').insert({
    user_id:         userId,
    email,
    rolle:           'admin',
    status:          'aktiv',
    organisation_id: orgId,
  })

  if (error) {
    throw new Error(`User konnte nicht mit Organisation verknüpft werden: ${error.message}`)
  }
}

// ── Aktuelle Organisation laden ───────────────────────────────
/**
 * Lädt die komplette Organisation des eingeloggten Users.
 */
export async function getAktuelleOrganisation(): Promise<Organisation | null> {
  const admin = createAdminClient()

  let orgId: string
  try {
    orgId = await getOrganisationId()
  } catch {
    return null
  }

  const { data } = await admin
    .from('organisationen')
    .select('*')
    .eq('id', orgId)
    .single()

  return (data as Organisation) ?? null
}

// ── Einmalige Datenmigration ──────────────────────────────────
/**
 * Einmalig manuell aufrufen nach Ausführung von Migration 036.
 * Erstellt eine Default-Org "Wellbeing Concepts", verknüpft alle
 * bestehenden team_mitglieder und setzt organisation_id auf allen
 * Datensätzen die noch NULL haben.
 */
export async function migriereBestehendeDaten(): Promise<{
  erfolg: boolean
  orgId?: string
  fehler?: string
}> {
  const admin = createAdminClient()

  // 1. Prüfen ob bereits Organisationen existieren
  const { count } = await admin
    .from('organisationen')
    .select('*', { count: 'exact', head: true })

  if (count && count > 0) {
    return { erfolg: false, fehler: 'Es existieren bereits Organisationen – Migration übersprungen.' }
  }

  // 2. Default-Organisation anlegen
  let orgId: string
  try {
    orgId = await organisationErstellen('Wellbeing Concepts')
  } catch (e) {
    return { erfolg: false, fehler: String(e) }
  }

  // 3. Alle bestehenden team_mitglieder mit Org verknüpfen
  await admin
    .from('team_mitglieder')
    .update({ organisation_id: orgId })
    .is('organisation_id', null)

  // 4. Alle Datentabellen aktualisieren
  const tabellen = [
    'kunden',
    'projekte',
    'raeume',
    'partner',
    'produkte',
    'produktstatus',
    'einstellungen',
    'branding',
    'notizen',
    'dateien',
    'freigabe_tokens',
    'onboarding_anfragen',
    'onboarding_vorlagen',
    'konfigurator_sessions',
    'konfigurator_auswahl',
    'timeline_events',
    'projekt_aktivitaeten',
    'client_users',
    'client_nachrichten',
    'client_dokumente',
    'client_aktivitaeten',
    'client_benachrichtigungen',
    'demo_anfragen',
  ] as const

  for (const tabelle of tabellen) {
    await admin
      .from(tabelle)
      .update({ organisation_id: orgId })
      .is('organisation_id', null)
  }

  return { erfolg: true, orgId }
}
