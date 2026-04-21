'use server'

/**
 * Admin-seitige Server-Actions für den Kunden-Portal-Chat.
 * Portal-Tabellen werden via createAdminClient() angefasst (RLS-Bypass
 * seit Mig. 068), aber jede Query filtert zusätzlich auf organisation_id
 * als Defense-in-Depth. Org-Scope wird via getOrganisationId() aus dem
 * Auth-Context abgeleitet.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ClientNachricht } from '@/lib/supabase/types'

export interface ChatUebersichtEintrag {
  projektId:         string
  projektName:       string
  kundeId:           string
  kundeName:         string
  kundeEmail:        string | null
  letzteNachricht:   string | null
  letzteAktivitaet:  string | null
  unreadAdmin:       number   // vom Kunden gesendet, vom Admin noch nicht gelesen
}


/** Alle Nachrichten eines Projekts (chronologisch) + org-Check. */
export async function getNachrichtenFuerProjekt(projektId: string): Promise<ClientNachricht[]> {
  let orgId: string
  try { orgId = await getOrganisationId() } catch { return [] }
  const admin = createAdminClient()

  const { data } = await admin
    .from('client_nachrichten')
    .select('*')
    .eq('projekt_id', projektId)
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: true })

  return (data ?? []) as ClientNachricht[]
}


/**
 * Übersicht aller Projekte, zu denen Chat-Aktivität besteht oder Portal-
 * Zugänge existieren. Sortiert nach letzter Aktivität absteigend.
 * Für /dashboard/chats + ggf. Dashboard-Widget.
 */
export async function getChatUebersicht(): Promise<ChatUebersichtEintrag[]> {
  let orgId: string
  try { orgId = await getOrganisationId() } catch { return [] }
  const admin = createAdminClient()

  // Alle Projekte der Org mit Kunden-Namen + Portal-User-Existenz
  // (client_users ist die Voraussetzung für einen Chat)
  const { data: projekte } = await admin
    .from('projekte')
    .select('id, name, kunde_id, kunden(id, name, email)')
    .eq('organisation_id', orgId)
    .is('deleted_at', null)

  if (!projekte || projekte.length === 0) return []

  // Welche Kunden haben Portal-Zugang?
  const kundeIds = Array.from(new Set(projekte.map((p) => p.kunde_id).filter(Boolean)))
  const { data: portalUser } = kundeIds.length > 0
    ? await admin
        .from('client_users')
        .select('kunde_id')
        .in('kunde_id', kundeIds)
        .eq('organisation_id', orgId)
    : { data: [] as { kunde_id: string }[] }

  const kundenMitPortal = new Set((portalUser ?? []).map((u) => u.kunde_id))

  // Letzte Nachricht + Unread-Count pro Projekt
  const projektIds = projekte.map((p) => p.id)
  const { data: nachrichten } = projektIds.length > 0
    ? await admin
        .from('client_nachrichten')
        .select('projekt_id, nachricht, created_at, von_kunde, gelesen')
        .eq('organisation_id', orgId)
        .in('projekt_id', projektIds)
        .order('created_at', { ascending: false })
    : { data: [] as { projekt_id: string; nachricht: string; created_at: string; von_kunde: boolean; gelesen: boolean }[] }

  const letzteMap  = new Map<string, { text: string; at: string }>()
  const unreadMap  = new Map<string, number>()
  for (const n of nachrichten ?? []) {
    if (!letzteMap.has(n.projekt_id)) {
      letzteMap.set(n.projekt_id, { text: n.nachricht, at: n.created_at })
    }
    if (n.von_kunde && !n.gelesen) {
      unreadMap.set(n.projekt_id, (unreadMap.get(n.projekt_id) ?? 0) + 1)
    }
  }

  // Zusammenbauen + filtern: nur Projekte anzeigen, die Portal haben
  // (sonst gibt es keinen sinnvollen Chat-Partner)
  const eintraege: ChatUebersichtEintrag[] = projekte
    .filter((p) => p.kunde_id && kundenMitPortal.has(p.kunde_id))
    .map((p) => {
      // Supabase-Join kommt als Objekt oder Array, defensiv behandeln
      const kundeRaw = p.kunden as unknown as { id: string; name: string; email: string | null } | null
      const letzte   = letzteMap.get(p.id) ?? null
      return {
        projektId:        p.id,
        projektName:      p.name,
        kundeId:          kundeRaw?.id ?? p.kunde_id,
        kundeName:        kundeRaw?.name ?? '–',
        kundeEmail:       kundeRaw?.email ?? null,
        letzteNachricht:  letzte?.text ?? null,
        letzteAktivitaet: letzte?.at   ?? null,
        unreadAdmin:      unreadMap.get(p.id) ?? 0,
      }
    })
    .sort((a, b) => {
      // Projekte mit Aktivität zuerst (nach Datum), dann Rest alphabetisch
      if (a.letzteAktivitaet && b.letzteAktivitaet) {
        return b.letzteAktivitaet.localeCompare(a.letzteAktivitaet)
      }
      if (a.letzteAktivitaet) return -1
      if (b.letzteAktivitaet) return 1
      return a.projektName.localeCompare(b.projektName)
    })

  return eintraege
}


/** Globaler Unread-Count für NavSidebar-Badge. */
export async function getGlobalUnreadCount(): Promise<number> {
  let orgId: string
  try { orgId = await getOrganisationId() } catch { return 0 }
  const admin = createAdminClient()

  const { count } = await admin
    .from('client_nachrichten')
    .select('id', { count: 'exact', head: true })
    .eq('organisation_id', orgId)
    .eq('von_kunde', true)
    .eq('gelesen', false)

  return count ?? 0
}


/**
 * Markiert alle Kunden-Nachrichten eines Projekts als vom Admin gelesen.
 * Wird beim Öffnen des ChatBlocks aufgerufen.
 */
export async function adminNachrichtenAlsGelesen(projektId: string): Promise<void> {
  let orgId: string
  try { orgId = await getOrganisationId() } catch { return }
  const admin = createAdminClient()

  await admin
    .from('client_nachrichten')
    .update({ gelesen: true, gelesen_am: new Date().toISOString() })
    .eq('projekt_id', projektId)
    .eq('organisation_id', orgId)
    .eq('von_kunde', true)
    .eq('gelesen', false)

  revalidatePath('/dashboard/chats')
  revalidatePath(`/dashboard/projekte/${projektId}`)
}
