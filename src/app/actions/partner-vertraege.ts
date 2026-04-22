'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { PartnerVertrag } from '@/lib/supabase/types'

const BUCKET = 'partner-vertraege'
const MAX_DATEIGROESSE = 50 * 1024 * 1024 // 50 MB
const ERLAUBTE_TYPEN = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png', 'image/jpeg', 'image/webp',
  'text/plain',
])

export async function vertraegeAbrufen(partnerId: string): Promise<PartnerVertrag[]> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data } = await supabase
    .from('partner_vertraege')
    .select('*')
    .eq('partner_id', partnerId)
    .eq('organisation_id', orgId)
    .order('hochgeladen_am', { ascending: false })
  return (data ?? []) as PartnerVertrag[]
}

export async function vertragHochladen(
  partnerId: string,
  formData: FormData,
): Promise<{ id?: string; fehler?: string }> {
  const file = formData.get('datei') as File | null
  if (!file)                            return { fehler: 'Keine Datei ausgewählt.' }
  if (file.size === 0)                  return { fehler: 'Datei ist leer.' }
  if (file.size > MAX_DATEIGROESSE)     return { fehler: 'Datei ist zu groß (max. 50 MB).' }
  if (!ERLAUBTE_TYPEN.has(file.type))   return { fehler: `Dateityp nicht unterstützt (${file.type || 'unbekannt'}).` }

  const titel       = (formData.get('titel') as string | null)?.trim() || null
  const vertragstyp = (formData.get('vertragstyp') as string | null)?.trim() || null
  const gueltig_von = (formData.get('gueltig_von') as string | null) || null
  const gueltig_bis = (formData.get('gueltig_bis') as string | null) || null
  const notizen     = (formData.get('notizen') as string | null)?.trim() || null

  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { fehler: 'Nicht angemeldet.' }

  // Pfad: <org>/<partner>/<timestamp>-<sanitized-filename>
  const timestamp = Date.now()
  const safeName  = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  const storagePfad = `${orgId}/${partnerId}/${timestamp}-${safeName}`

  // Upload
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePfad, file, {
      contentType: file.type,
      upsert: false,
    })
  if (uploadErr) {
    console.error('[vertragHochladen:upload]', uploadErr)
    return { fehler: `Upload fehlgeschlagen: ${uploadErr.message}` }
  }

  // DB-Insert
  const { data, error } = await supabase
    .from('partner_vertraege')
    .insert({
      organisation_id: orgId,
      partner_id:      partnerId,
      dateiname:       file.name,
      dateityp:        file.type,
      dateigroesse:    file.size,
      storage_pfad:    storagePfad,
      titel,
      vertragstyp,
      gueltig_von,
      gueltig_bis,
      notizen,
      hochgeladen_von: user.id,
    })
    .select('id')
    .single()

  if (error || !data) {
    // Cleanup upload bei DB-Fehler
    await supabase.storage.from(BUCKET).remove([storagePfad])
    console.error('[vertragHochladen:insert]', error)
    return { fehler: error?.message ?? 'Fehler beim Speichern.' }
  }

  revalidatePath(`/dashboard/partner/${partnerId}`)
  return { id: data.id }
}

export async function vertragLoeschen(vertragsId: string): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Pfad holen für Storage-Delete
  const { data: vertrag } = await supabase
    .from('partner_vertraege')
    .select('storage_pfad, partner_id')
    .eq('id', vertragsId)
    .eq('organisation_id', orgId)
    .maybeSingle()
  if (!vertrag) return { fehler: 'Vertrag nicht gefunden.' }

  // DB-Eintrag löschen (Storage-Datei danach)
  const { error: dbErr } = await supabase
    .from('partner_vertraege')
    .delete()
    .eq('id', vertragsId)
    .eq('organisation_id', orgId)
  if (dbErr) {
    console.error('[vertragLoeschen:db]', dbErr)
    return { fehler: dbErr.message }
  }

  // Storage-Datei (Best-Effort, ignoriert Fehler)
  await supabase.storage.from(BUCKET).remove([vertrag.storage_pfad as string])

  revalidatePath(`/dashboard/partner/${vertrag.partner_id}`)
  return {}
}

export async function vertragHerunterladenUrl(vertragsId: string): Promise<{ url?: string; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data: vertrag } = await supabase
    .from('partner_vertraege')
    .select('storage_pfad, dateiname')
    .eq('id', vertragsId)
    .eq('organisation_id', orgId)
    .maybeSingle()
  if (!vertrag) return { fehler: 'Vertrag nicht gefunden.' }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(vertrag.storage_pfad as string, 60, {
      download: vertrag.dateiname as string,
    })
  if (error || !data) {
    console.error('[vertragHerunterladenUrl]', error)
    return { fehler: error?.message ?? 'Download-Link konnte nicht erstellt werden.' }
  }
  return { url: data.signedUrl }
}

export async function vertragMetadatenAktualisieren(
  vertragsId: string,
  metadata: { titel?: string | null; vertragstyp?: string | null; gueltig_von?: string | null; gueltig_bis?: string | null; notizen?: string | null },
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data: vertrag } = await supabase
    .from('partner_vertraege')
    .select('partner_id')
    .eq('id', vertragsId)
    .eq('organisation_id', orgId)
    .maybeSingle()
  if (!vertrag) return { fehler: 'Vertrag nicht gefunden.' }

  const { error } = await supabase
    .from('partner_vertraege')
    .update(metadata)
    .eq('id', vertragsId)
    .eq('organisation_id', orgId)
  if (error) {
    console.error('[vertragMetadatenAktualisieren]', error)
    return { fehler: error.message }
  }
  revalidatePath(`/dashboard/partner/${vertrag.partner_id}`)
  return {}
}
