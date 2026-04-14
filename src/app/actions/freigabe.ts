'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ProduktStatus } from '@/lib/supabase/types'

export type FreigabeResult = { fehler: string } | { erfolg: true }

export async function freigabeStatusAendern(
  token: string,
  produktId: string,
  status: ProduktStatus,
  kommentar: string
): Promise<FreigabeResult> {
  const supabase = createAdminClient()

  // 1. Token validieren
  const { data: tokenData } = await supabase
    .from('freigabe_tokens')
    .select('projekt_id, gueltig_bis')
    .eq('token', token)
    .eq('aktiv', true)
    .single()

  if (!tokenData) return { fehler: 'Ungültiger oder inaktiver Freigabe-Link.' }

  if (tokenData.gueltig_bis && new Date(tokenData.gueltig_bis) < new Date()) {
    return { fehler: 'Dieser Freigabe-Link ist abgelaufen.' }
  }

  // 2. Produkt gehört zum Projekt des Tokens – Prüfung via raum_produkte,
  //    damit auch Library-Produkte (raum_id=null auf produkte) korrekt behandelt werden.
  const { data: rpEintraege } = await supabase
    .from('raum_produkte')
    .select('id, raeume!inner(projekt_id)')
    .eq('produkt_id', produktId)

  const gehoertZumProjekt = (rpEintraege ?? []).some(
    (rp) => (rp.raeume as unknown as { projekt_id: string }).projekt_id === tokenData.projekt_id
  )

  if (!gehoertZumProjekt) return { fehler: 'Zugriff nicht erlaubt.' }

  // 3. Status aktualisieren
  const updates: Record<string, unknown> = {
    produkt_id: produktId,
    status,
    kommentar: kommentar.trim() || null,
  }
  if (status === 'freigegeben') {
    updates.freigegeben_am = new Date().toISOString()
  }

  const { error } = await supabase
    .from('produktstatus')
    .upsert(updates, { onConflict: 'produkt_id' })

  if (error) return { fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }

  return { erfolg: true }
}

export async function freigabeZuruecksetzenAdmin(produktId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('produktstatus')
    .upsert({ produkt_id: produktId, status: 'ausstehend', kommentar: null }, { onConflict: 'produkt_id' })
  revalidatePath('/dashboard/freigaben')
}
