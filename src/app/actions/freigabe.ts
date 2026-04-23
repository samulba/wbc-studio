'use server'

/**
 * @deprecated — ersetzt durch src/app/actions/freigaben.ts (Migration 078).
 *
 * Die alten Actions schrieben in die `produktstatus`-Tabelle (global pro
 * Produkt) — ab Migration 078 ist raum_produkte.freigabe_status die Single
 * Source of Truth. Diese Datei wrappt die neuen Actions zurück auf die alte
 * Signatur, damit bestehende Aufrufer weiterlaufen. Neue Aufrufer sollen
 * direkt `freigaben.ts` verwenden.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { freigabeStatusSetzen } from './freigaben'
import type { FreigabeStatus } from '@/lib/supabase/types'

export type FreigabeResult = { fehler: string } | { erfolg: true }

/**
 * @deprecated — nutze freigabeStatusSetzen mit raum_produkt_id + kanal='token'.
 * Wrapper: sucht das raum_produkte für (produktId, projekt des Tokens) und
 * leitet dann auf die neue Action um.
 */
export async function freigabeStatusAendern(
  token: string,
  produktId: string,
  status: FreigabeStatus | 'ueberarbeitung',
  kommentar: string,
): Promise<FreigabeResult> {
  // 'ueberarbeitung' auf 'abgelehnt' mappen (neuer Status-Set kennt es nicht)
  const mapped: FreigabeStatus = status === 'ueberarbeitung' ? 'abgelehnt' : status

  const supabase = createAdminClient()

  const { data: tokenData } = await supabase
    .from('freigabe_tokens')
    .select('id, projekt_id, gueltig_bis, aktiv')
    .eq('token', token)
    .eq('aktiv', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (!tokenData) return { fehler: 'Ungültiger oder inaktiver Freigabe-Link.' }
  if (tokenData.gueltig_bis && new Date(tokenData.gueltig_bis) < new Date()) {
    return { fehler: 'Dieser Freigabe-Link ist abgelaufen.' }
  }

  // Raum-Produkt für (produktId, projekt) finden
  const { data: rp } = await supabase
    .from('raum_produkte')
    .select('id, raeume!inner(projekt_id)')
    .eq('produkt_id', produktId)

  const hit = (rp ?? []).find(
    (row) => (row.raeume as unknown as { projekt_id: string }).projekt_id === tokenData.projekt_id,
  )
  if (!hit) return { fehler: 'Zugriff nicht erlaubt.' }

  const result = await freigabeStatusSetzen({
    raumProduktId: hit.id,
    status:        mapped,
    kommentar,
    kanal:         'token',
    kontext:       { tokenId: tokenData.id, geaendertVon: 'Kunde (Token)' },
  })

  return 'erfolg' in result ? { erfolg: true } : { fehler: result.fehler }
}

/**
 * @deprecated — nutze freigabeStatusSetzen mit kanal='admin'.
 */
export async function freigabeZuruecksetzenAdmin(produktId: string): Promise<void> {
  const supabase = await createClient()

  // Alle raum_produkte-Einträge dieses Produkts finden und zurücksetzen
  const { data: rps } = await supabase
    .from('raum_produkte')
    .select('id')
    .eq('produkt_id', produktId)

  for (const rp of rps ?? []) {
    await freigabeStatusSetzen({
      raumProduktId: rp.id,
      status:        'ausstehend',
      kommentar:     null,
      kanal:         'admin',
      kontext:       { geaendertVon: 'Admin' },
    })
  }

  revalidatePath('/dashboard/freigaben')
}
