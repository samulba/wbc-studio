'use server'

import { cookies } from 'next/headers'
import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { Branding } from '@/lib/supabase/types'

// ── Branding laden (Admin-Seite) ──────────────────────────────
export async function brandingAbrufen(): Promise<Branding | null> {
  const supabase = await createClient()
  let orgId: string
  try { orgId = await getOrganisationId() } catch { return null }

  const { data } = await supabase
    .from('branding')
    .select('*')
    .eq('organisation_id', orgId)
    .order('created_at')
    .limit(1)
    .maybeSingle()
  return (data as Branding | null) ?? null
}

/**
 * Branding für eine bestimmte Organisation laden (Admin-Client).
 * Interne Nutzung durch brandingFuerToken() — nie direkt aus Client-Code
 * ohne vorherige Auth-Validierung aufrufen.
 */
async function brandingFuerOrg(orgId: string): Promise<Branding | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('branding')
    .select('*')
    .eq('organisation_id', orgId)
    .limit(1)
    .maybeSingle()
  return (data as Branding | null) ?? null
}

/**
 * Ermittelt die Organisation aus Portal-Kontext (portal_session-Cookie ODER
 * einladungs_token im URL-Pfad) und lädt das zugehörige Branding.
 *
 * Wichtig für Multi-Tenancy: Wenn mehrere Organisationen das System nutzen,
 * muss das Portal IHR Branding zeigen — nie das der ersten Organisation in
 * der DB. Daher wird die Org strikt aus dem Auth-Kontext hergeleitet.
 *
 * Fallback (kein Kontext, z.B. Login-Seite vor Auth) → null → Default-Style
 * aus Portal-Layout greift (Wellbeing-Spaces-Defaults).
 */
export async function brandingFuerToken(einladungsToken?: string | null): Promise<Branding | null> {
  const admin = createAdminClient()

  // 1) Aus Einladungslink-Token (public, noch nicht eingeloggt)
  if (einladungsToken) {
    const { data: einladung } = await admin
      .from('client_users')
      .select('kunde_id, kunden(organisation_id)')
      .eq('einladungs_token', einladungsToken)
      .maybeSingle()
    const orgId = (einladung as { kunden?: { organisation_id?: string } | null } | null)
      ?.kunden?.organisation_id
    if (orgId) return brandingFuerOrg(orgId)
  }

  // 2) Aus Portal-Session-Cookie (eingeloggter Kunde)
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('portal_session')?.value
    if (token) {
      const { data: session } = await admin
        .from('client_users')
        .select('kunde_id, kunden(organisation_id)')
        .eq('session_token', token)
        .eq('aktiv', true)
        .maybeSingle()
      const orgId = (session as { kunden?: { organisation_id?: string } | null } | null)
        ?.kunden?.organisation_id
      if (orgId) return brandingFuerOrg(orgId)
    }
  } catch { /* außerhalb Request-Kontext */ }

  // Kein Kontext auflösbar → Default
  return null
}

// ── Branding speichern ────────────────────────────────────────
export type BrandingDaten = Omit<Branding, 'id' | 'logo_url' | 'favicon_url' | 'created_at' | 'updated_at'>

/**
 * Ensures a branding row exists for the current organisation. If none is found
 * (which can happen if the pre-multi-tenancy seed row from Migration 027 was
 * never bound to an org, or if Migration 065 hasn't been applied yet), we
 * create one — so der Speichern-Button niemals ins Leere läuft.
 */
async function ensureBrandingForOrg(orgId: string): Promise<string | null> {
  const admin = createAdminClient()

  // Erst Org-spezifische Zeile suchen
  const { data: existing } = await admin
    .from('branding')
    .select('id')
    .eq('organisation_id', orgId)
    .limit(1)
    .maybeSingle()
  if (existing?.id) return existing.id as string

  // Fallback: freie Zeile ohne Org-Zuweisung (Legacy-Seed) übernehmen
  const { data: legacy } = await admin
    .from('branding')
    .select('id')
    .is('organisation_id', null)
    .limit(1)
    .maybeSingle()
  if (legacy?.id) {
    const { error: upErr } = await admin
      .from('branding')
      .update({ organisation_id: orgId })
      .eq('id', legacy.id as string)
    if (!upErr) return legacy.id as string
  }

  // Nichts da — neuen Default-Datensatz anlegen
  const { data: created, error: insErr } = await admin
    .from('branding')
    .insert({ organisation_id: orgId, firmenname: 'Mein Studio' })
    .select('id')
    .maybeSingle()
  if (insErr || !created?.id) {
    console.error('[branding] ensureBrandingForOrg: Insert fehlgeschlagen:', insErr)
    return null
  }
  return created.id as string
}

export async function brandingAktualisieren(daten: BrandingDaten): Promise<{ fehler?: string }> {
  let orgId: string
  try { orgId = await getOrganisationId() }
  catch { return { fehler: 'Keine Organisation gefunden — bitte erneut anmelden.' } }

  const id = await ensureBrandingForOrg(orgId)
  if (!id) return { fehler: 'Branding-Datensatz konnte nicht angelegt werden.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('branding')
    .update({ ...daten, organisation_id: orgId })
    .eq('id', id)

  if (error) {
    console.error('[brandingAktualisieren] Update fehlgeschlagen:', error)
    return { fehler: `Speichern fehlgeschlagen: ${error.message}` }
  }

  revalidatePath('/dashboard/einstellungen')
  revalidatePath('/portal')
  revalidatePath('/portal/dashboard')
  return {}
}

// ── Logo hochladen ────────────────────────────────────────────
const MAX_MB = 50
const ACCEPT_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'ico'])

function safeExt(original: string): string {
  const match = original.toLowerCase().match(/\.([a-z0-9]{2,5})$/)
  const ext = match?.[1] ?? 'png'
  return ACCEPT_EXT.has(ext) ? ext : 'png'
}

type BrandingAssetTyp = 'logo' | 'hero'

async function uploadBrandingAsset(
  typ: BrandingAssetTyp,
  file: File,
): Promise<{ fehler?: string; url?: string }> {
  if (file.size > MAX_MB * 1024 * 1024) return { fehler: `Datei ist zu groß (max. ${MAX_MB} MB).` }

  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return { fehler: 'Nicht angemeldet.' }

  let orgId: string
  try { orgId = await getOrganisationId() }
  catch { return { fehler: 'Keine Organisation gefunden.' } }

  const id = await ensureBrandingForOrg(orgId)
  if (!id) return { fehler: 'Branding-Datensatz konnte nicht angelegt werden.' }

  const admin = createAdminClient()
  const path  = `${orgId}/${typ}.${safeExt(file.name)}`
  const bytes = new Uint8Array(await file.arrayBuffer())

  const { error: uploadError } = await admin.storage
    .from('branding')
    .upload(path, bytes, {
      upsert: true,
      contentType: file.type || 'application/octet-stream',
    })

  if (uploadError) {
    console.error(`[branding:${typ}] Storage-Upload fehlgeschlagen:`, uploadError)
    return { fehler: `Upload fehlgeschlagen: ${uploadError.message}` }
  }

  const { data: urlData } = admin.storage.from('branding').getPublicUrl(path)
  const url = `${urlData.publicUrl}?t=${Date.now()}`

  const column = typ === 'logo' ? 'logo_url' : 'hero_image_url'
  const { error: dbError } = await admin
    .from('branding')
    .update({ [column]: url })
    .eq('id', id)

  if (dbError) {
    console.error(`[branding:${typ}] DB-Update fehlgeschlagen:`, dbError)
    return { fehler: 'URL konnte nicht gespeichert werden.' }
  }

  revalidatePath('/dashboard/einstellungen')
  revalidatePath('/portal')
  revalidatePath('/portal/dashboard')
  return { url }
}

export async function brandingLogoHochladen(
  prevState: { fehler?: string; url?: string } | null,
  formData: FormData,
): Promise<{ fehler?: string; url?: string }> {
  const file = formData.get('logo') as File | null
  if (!file || file.size === 0) return { fehler: 'Keine Datei ausgewählt.' }
  return uploadBrandingAsset('logo', file)
}

export async function brandingHeroHochladen(
  prevState: { fehler?: string; url?: string } | null,
  formData: FormData,
): Promise<{ fehler?: string; url?: string }> {
  const file = formData.get('hero') as File | null
  if (!file || file.size === 0) return { fehler: 'Keine Datei ausgewählt.' }
  return uploadBrandingAsset('hero', file)
}
