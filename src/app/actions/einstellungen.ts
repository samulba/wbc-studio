'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Kategorie, KategorieTyp } from '@/lib/supabase/types'

export async function getEinstellungen(): Promise<Record<string, string>> {
  const supabase = await createClient()
  const { data } = await supabase.from('einstellungen').select('key, value')
  if (!data) return {}
  return Object.fromEntries(data.map((r) => [r.key, r.value]))
}

/** MwSt.-Satz als Dezimalzahl (z.B. 0.19 für 19%). Fallback: 0.19. */
export async function getMwstSatz(): Promise<number> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('einstellungen')
    .select('value')
    .eq('key', 'mwst_satz')
    .single()
  const pct = parseFloat(data?.value ?? '19')
  return isNaN(pct) ? 0.19 : pct / 100
}

export type EinstellungActionState = { fehler?: string; erfolg?: string } | null

async function upsertEinstellung(key: string, value: string) {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  return supabase.from('einstellungen').upsert(
    { key, value, updated_at: new Date().toISOString(), organisation_id: orgId },
    { onConflict: 'key' }
  )
}

// ── Allgemein ─────────────────────────────────────────────────

export async function saveAllgemein(
  prevState: EinstellungActionState,
  formData: FormData
): Promise<EinstellungActionState> {
  const appName = (formData.get('app_name') as string)?.trim()
  const mwst    = (formData.get('mwst_satz') as string)?.trim()

  if (!appName) return { fehler: 'App-Name darf nicht leer sein.' }

  const mwstNum = parseFloat(mwst)
  if (isNaN(mwstNum) || mwstNum < 0 || mwstNum > 100)
    return { fehler: 'MwSt. muss eine Zahl zwischen 0 und 100 sein.' }

  const felder: [string, string][] = [
    ['app_name',             appName],
    ['mwst_satz',            String(mwstNum)],
    ['standardwaehrung',     (formData.get('standardwaehrung') as string) || 'EUR'],
    ['sprache',              (formData.get('sprache')          as string) || 'Deutsch'],
    ['zeitzone',             (formData.get('zeitzone')         as string) || 'Europe/Berlin'],
    ['datumsformat',         (formData.get('datumsformat')     as string) || 'DD.MM.YYYY'],
    ['budget_warnschwelle',  (formData.get('budget_warnschwelle') as string) || '80'],
  ]

  const ergebnisse = await Promise.all(felder.map(([k, v]) => upsertEinstellung(k, v)))
  if (ergebnisse.some((r) => r.error))
    return { fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }

  revalidatePath('/dashboard/einstellungen')
  return { erfolg: 'Einstellungen gespeichert.' }
}

// ── Listen (Kategorien / Raumtypen / Projektarten) ────────────

export async function addListItem(
  schluessel: string,
  prevState: EinstellungActionState,
  formData: FormData
): Promise<EinstellungActionState> {
  const name = (formData.get('name') as string)?.trim()
  const icon = (formData.get('icon') as string)?.trim()
  if (!name) return { fehler: 'Name darf nicht leer sein.' }

  const supabase = await createClient()
  const { data } = await supabase
    .from('einstellungen')
    .select('value')
    .eq('key', schluessel)
    .maybeSingle()

  const liste = data?.value
    ? data.value.split(',').map((s: string) => s.trim()).filter(Boolean)
    : []

  // Doppelten Namen erkennen – nur Name-Teil vor dem Pipe vergleichen
  const namesVorhanden = liste.map((item: string) => item.split('|')[0].trim())
  if (namesVorhanden.includes(name)) return { fehler: `„${name}" existiert bereits.` }

  // Mit Icon speichern falls angegeben: "Name|IconName"
  const eintrag = icon ? `${name}|${icon}` : name
  liste.push(eintrag)

  const { error } = await upsertEinstellung(schluessel, liste.join(','))
  if (error) return { fehler: 'Fehler beim Speichern.' }

  revalidatePath('/dashboard/einstellungen')
  revalidatePath('/dashboard/kategorien')
  return { erfolg: `„${name}" hinzugefügt.` }
}

export async function checkKategorieUsage(name: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('produkte')
    .select('*', { count: 'exact', head: true })
    .eq('kategorie', name)
    .is('deleted_at', null)
  return count ?? 0
}

export async function updateListItem(
  schluessel: string,
  altesItem: string,
  neuesItem: string
): Promise<EinstellungActionState> {
  const nameTeil = neuesItem.split('|')[0].trim()
  if (!nameTeil) return { fehler: 'Name darf nicht leer sein.' }

  const supabase = await createClient()
  const { data } = await supabase
    .from('einstellungen')
    .select('value')
    .eq('key', schluessel)
    .maybeSingle()

  const liste = data?.value
    ? data.value.split(',').map((s: string) => s.trim()).filter(Boolean)
    : []

  const idx = liste.indexOf(altesItem)
  if (idx !== -1) {
    liste[idx] = neuesItem.trim()
  } else {
    // Eintrag nicht (mehr) in der Liste – einfach anhängen statt Fehler
    liste.push(neuesItem.trim())
  }

  const { error } = await upsertEinstellung(schluessel, liste.join(','))
  if (error) return { fehler: 'Fehler beim Speichern.' }

  revalidatePath('/dashboard/einstellungen')
  revalidatePath('/dashboard/kategorien')
  return { erfolg: 'Gespeichert.' }
}

export async function deleteListItem(schluessel: string, name: string): Promise<void> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('einstellungen')
    .select('value')
    .eq('key', schluessel)
    .maybeSingle()

  if (!data?.value) return

  const liste = data.value
    .split(',')
    .map((s: string) => s.trim())
    .filter((s: string) => s !== name)

  await upsertEinstellung(schluessel, liste.join(','))
  revalidatePath('/dashboard/einstellungen')
  revalidatePath('/dashboard/kategorien')
}

// ── Benachrichtigungen ────────────────────────────────────────

export async function saveBenachrichtigungen(
  prevState: EinstellungActionState,
  formData: FormData
): Promise<EinstellungActionState> {
  const felder: [string, string][] = [
    ['benach_neue_freigabe', formData.get('benach_neue_freigabe') === 'true' ? 'true' : 'false'],
    ['benach_ablehnung',     formData.get('benach_ablehnung')     === 'true' ? 'true' : 'false'],
    ['benach_taeglich',      formData.get('benach_taeglich')      === 'true' ? 'true' : 'false'],
    ['benach_email',         (formData.get('benach_email')        as string) || ''],
  ]
  const ergebnisse = await Promise.all(felder.map(([k, v]) => upsertEinstellung(k, v)))
  if (ergebnisse.some((r) => r.error)) return { fehler: 'Fehler beim Speichern.' }
  revalidatePath('/dashboard/einstellungen')
  return { erfolg: 'Benachrichtigungen gespeichert.' }
}

// ── Freigabe & Links ──────────────────────────────────────────

export async function saveFreigabeLinks(
  prevState: EinstellungActionState,
  formData: FormData
): Promise<EinstellungActionState> {
  const felder: [string, string][] = [
    ['freigabe_ablaufzeit',  (formData.get('freigabe_ablaufzeit')  as string) || '30'],
    ['freigabe_pin_schutz',  formData.get('freigabe_pin_schutz')  === 'true' ? 'true' : 'false'],
    ['freigabe_pin_laenge',  (formData.get('freigabe_pin_laenge')  as string) || '4'],
    ['freigabe_intro_text',  (formData.get('freigabe_intro_text')  as string) || ''],
    ['freigabe_logo_zeigen', formData.get('freigabe_logo_zeigen') === 'true' ? 'true' : 'false'],
  ]
  const ergebnisse = await Promise.all(felder.map(([k, v]) => upsertEinstellung(k, v)))
  if (ergebnisse.some((r) => r.error)) return { fehler: 'Fehler beim Speichern.' }
  revalidatePath('/dashboard/einstellungen')
  return { erfolg: 'Freigabe-Einstellungen gespeichert.' }
}

// ── Freigabe-Einstellungen (Legacy) ──────────────────────────


export async function saveFreigabe(
  prevState: EinstellungActionState,
  formData: FormData
): Promise<EinstellungActionState> {
  const ablaufzeit  = (formData.get('freigabe_ablaufzeit')  as string)?.trim()
  const pinSchutz   = formData.get('freigabe_pin_schutz') === 'true' ? 'true' : 'false'

  const tage = parseInt(ablaufzeit, 10)
  if (isNaN(tage) || tage < 1 || tage > 365)
    return { fehler: 'Ablaufzeit muss zwischen 1 und 365 Tagen liegen.' }

  const ergebnisse = await Promise.all([
    upsertEinstellung('freigabe_ablaufzeit', String(tage)),
    upsertEinstellung('freigabe_pin_schutz', pinSchutz),
  ])
  if (ergebnisse.some((r) => r.error))
    return { fehler: 'Fehler beim Speichern.' }

  revalidatePath('/dashboard/einstellungen')
  return { erfolg: 'Freigabe-Einstellungen gespeichert.' }
}


// ── Kategorien-Tabelle (Migration 037) ───────────────────────

/** Alle Kategorien eines Typs für die aktuelle Org laden. */
export async function getKategorien(typ: KategorieTyp): Promise<Kategorie[]> {
  const supabase = await createClient()
  let orgId: string
  try { orgId = await getOrganisationId() } catch { return [] }

  const { data } = await supabase
    .from('kategorien')
    .select('*')
    .eq('organisation_id', orgId)
    .eq('typ', typ)
    .order('reihenfolge')
    .order('name')

  return (data ?? []) as Kategorie[]
}

/** Neue Kategorie anlegen. */
export async function addKategorie(
  typ: KategorieTyp,
  name: string,
  icon: string
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const trimmed = name.trim()
  if (!trimmed) return { fehler: 'Name darf nicht leer sein.' }

  const { error } = await supabase.from('kategorien').insert({
    organisation_id: orgId,
    typ,
    name: trimmed,
    icon: icon || 'Package',
  })

  if (error) {
    if (error.code === '23505') return { fehler: `„${trimmed}" existiert bereits.` }
    return { fehler: 'Fehler beim Speichern.' }
  }

  revalidatePath('/dashboard/kategorien')
  revalidatePath('/dashboard/einstellungen')
  return {}
}

/** Kategorie umbenennen / Icon ändern. */
export async function updateKategorie(
  id: string,
  name: string,
  icon: string
): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const trimmed = name.trim()
  if (!trimmed) return { fehler: 'Name darf nicht leer sein.' }

  const { error } = await supabase
    .from('kategorien')
    .update({ name: trimmed, icon: icon || 'Package' })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') return { fehler: `„${trimmed}" existiert bereits.` }
    return { fehler: 'Fehler beim Aktualisieren.' }
  }

  revalidatePath('/dashboard/kategorien')
  revalidatePath('/dashboard/einstellungen')
  return {}
}

/** Kategorie löschen. */
export async function deleteKategorie(id: string): Promise<{ fehler?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('kategorien').delete().eq('id', id)
  if (error) return { fehler: 'Fehler beim Löschen.' }
  revalidatePath('/dashboard/kategorien')
  revalidatePath('/dashboard/einstellungen')
  return {}
}

/** Zählt Entitäten die diese Kategorie nutzen (via FK-Spalten). */
export async function checkKategorieUsageById(
  id: string,
  typ: KategorieTyp
): Promise<number> {
  const supabase = await createClient()
  if (typ === 'produktkategorie') {
    const { count } = await supabase.from('produkte').select('*', { count: 'exact', head: true }).eq('kategorie_id', id).is('deleted_at', null)
    return count ?? 0
  }
  if (typ === 'raumtyp') {
    const { count } = await supabase.from('raeume').select('*', { count: 'exact', head: true }).eq('raumtyp_id', id).is('deleted_at', null)
    return count ?? 0
  }
  if (typ === 'projektart') {
    const { count } = await supabase.from('projekte').select('*', { count: 'exact', head: true }).eq('projektart_id', id).is('deleted_at', null)
    return count ?? 0
  }
  return 0
}
