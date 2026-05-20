'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { OnboardingStatus, OnboardingVorlage, OnboardingFrage, OnboardingSektion } from '@/lib/supabase/types'

export interface OnboardingDaten {
  kunde_name: string | null
  kunde_email: string | null
  kunde_telefon?: string | null
  projekt_name?: string | null
  projekt_adresse?: string | null
  raumtypen?: string[] | null
  budget_min?: number | null
  budget_max?: number | null
  stil_praeferenzen?: string | null
  zeitrahmen?: string | null
  notizen?: string | null
  antworten?: Record<string, unknown> | null
}

/**
 * Erstellt einen neuen Onboarding-Link (optional mit Vorlage + Kunden-Verknüpfung).
 * Bei Projekt-Vorlagen ist kunde_id empfohlen — dann sind Kontaktfragen
 * überflüssig, da der Kunde bereits verknüpft ist.
 */
export async function onboardingLinkErstellen(
  vorlage_id?: string | null,
  kunde_id?: string | null,
  empfaenger?: { label?: string | null; email?: string | null } | null,
): Promise<{ token: string; pfad: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Wenn Kunde verknüpft: Kontaktdaten vorausfüllen, damit der Kunde
  // sie nicht noch einmal eintippen muss.
  let kundePrefill: Record<string, string | null> = {}
  if (kunde_id) {
    const { data: kunde } = await supabase
      .from('kunden')
      .select('name, email, telefon')
      .eq('id', kunde_id)
      .eq('organisation_id', orgId)
      .maybeSingle()
    if (kunde) {
      kundePrefill = {
        kunde_name:    kunde.name,
        kunde_email:   kunde.email,
        kunde_telefon: kunde.telefon,
      }
    }
  }

  const empfaengerLabel = empfaenger?.label?.trim() || null
  const empfaengerEmail = empfaenger?.email?.trim() || null

  // Persistenten Titel ableiten (Migration 108) — wird beim Submit
  // NICHT ueberschrieben, sodass der Kundenname dauerhaft sichtbar bleibt.
  const titel =
    (kundePrefill.kunde_name as string | null | undefined)?.trim()
    || empfaengerLabel
    || 'Onboarding-Link'

  const { data, error } = await supabase
    .from('onboarding_anfragen')
    .insert({
      status: 'offen',
      vorlage_id: vorlage_id ?? null,
      kunde_id:   kunde_id   ?? null,
      empfaenger_label: empfaengerLabel,
      empfaenger_email: empfaengerEmail,
      organisation_id: orgId,
      titel,
      ...kundePrefill,
    })
    .select('token')
    .single()

  if (error || !data) throw new Error('Fehler beim Erstellen des Links')
  revalidatePath('/dashboard/onboarding')
  return { token: data.token, pfad: `/onboarding/${data.token}` }
}

/** Setzt oder aktualisiert das Empfänger-Etikett nachträglich (z. B. wenn
 *  der Admin beim Erstellen vergessen hat anzugeben, für wen der Link war). */
export async function onboardingEmpfaengerAktualisieren(
  id: string,
  empfaenger: { label: string | null; email: string | null },
): Promise<{ erfolg?: boolean; fehler?: string }> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { error } = await supabase
    .from('onboarding_anfragen')
    .update({
      empfaenger_label: empfaenger.label?.trim() || null,
      empfaenger_email: empfaenger.email?.trim() || null,
    })
    .eq('id', id)
    .eq('organisation_id', orgId)

  if (error) return { fehler: 'Fehler beim Speichern.' }
  revalidatePath('/dashboard/onboarding')
  return { erfolg: true }
}

/**
 * Formular-Absenden durch den Kunden (kein Login nötig).
 * Nutzt Admin-Client da keine Session vorhanden.
 */
export async function onboardingAbsenden(
  token: string,
  daten: OnboardingDaten
): Promise<{ erfolg: boolean; fehler?: string }> {
  const supabase = createAdminClient()

  const { data: anfrage } = await supabase
    .from('onboarding_anfragen')
    .select('id, status, antworten, kunde_name, projekt_name, gueltig_bis')
    .eq('token', token)
    .single()

  if (!anfrage) return { erfolg: false, fehler: 'Dieser Link ist ungültig.' }
  if (anfrage.status !== 'offen' && anfrage.status !== 'in_bearbeitung') {
    return { erfolg: false, fehler: 'Dieses Formular wurde bereits ausgefüllt oder deaktiviert.' }
  }
  // Server-seitige Re-Validierung von gueltig_bis — verhindert dass ein
  // Tab, der seit Stunden offen ist und den Ablauf-Check beim Laden
  // gepasst hat, jetzt trotzdem submittet.
  if (anfrage.gueltig_bis && new Date(anfrage.gueltig_bis) < new Date()) {
    await supabase
      .from('onboarding_anfragen')
      .update({ status: 'abgelaufen' })
      .eq('token', token)
    return { erfolg: false, fehler: 'Dieser Onboarding-Link ist abgelaufen.' }
  }
  // Hinweis: kunde_name darf bereits vorgefüllt sein (bei verknüpftem Kunden).
  // Echter "schon ausgefüllt"-Indikator ist `antworten`.
  if (anfrage.antworten) {
    return { erfolg: false, fehler: 'Dieses Formular wurde bereits ausgefüllt.' }
  }

  const { antworten, kunde_name, projekt_name, ...standardDaten } = daten
  // Bug 1: Vorausgefuellte kunde_name/projekt_name NIE durch leere
  // Submit-Werte ueberschreiben. titel wird ohnehin nie geschrieben.
  const finalKundeName   = (anfrage.kunde_name && anfrage.kunde_name.trim().length > 0)
    ? anfrage.kunde_name
    : (kunde_name?.trim() || null)
  const finalProjektName = (anfrage.projekt_name && anfrage.projekt_name.trim().length > 0)
    ? anfrage.projekt_name
    : (projekt_name?.trim() || null)

  // Race-Condition-Schutz: nur updaten, wenn der Status noch offen/in_bearbeitung
  // ist. Bei zwei parallelen Submits gewinnt der erste, der zweite kriegt 0 Rows
  // affected zurück und sieht den „bereits abgeschickt"-Fehler.
  const { data: updated, error } = await supabase
    .from('onboarding_anfragen')
    .update({
      ...standardDaten,
      kunde_name:       finalKundeName,
      projekt_name:     finalProjektName,
      antworten:        antworten ?? null,
      auto_save:        null,
      // 'eingereicht' = Kunde hat abgeschickt; 'abgeschlossen' setzt
      // erst der Admin, wenn er Kunde+Projekt aus der Anfrage anlegt.
      status:           'eingereicht',
      fortschritt:      100,
      abgeschlossen_am: new Date().toISOString(),
      updated_at:       new Date().toISOString(),
    })
    .eq('token', token)
    .in('status', ['offen', 'in_bearbeitung'])
    .select('id')

  if (error) return { erfolg: false, fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }
  if (!updated || updated.length === 0) {
    return { erfolg: false, fehler: 'Dieses Formular wurde gerade in einem anderen Fenster abgeschickt.' }
  }

  // Admin-Cache invalidieren. Customer-Page (/onboarding/[token])
  // NICHT revalidieren — sonst wuerde RSC sofort 'Bereits eingereicht'
  // rendern und den lokalen ErfolgScreen-State des Kunden ueberschreiben.
  revalidatePath('/dashboard/onboarding')

  // Auto-Sync: Aufgabe „Onboarding pruefen" anlegen
  try {
    const { data: voll } = await supabase
      .from('onboarding_anfragen')
      .select('id, organisation_id, kunde_name, projekt_name, kunde_id, projekt_id')
      .eq('token', token)
      .maybeSingle()
    if (voll?.organisation_id) {
      const titel = voll.kunde_name
        ? `Onboarding pruefen: ${voll.kunde_name}${voll.projekt_name ? ' / ' + voll.projekt_name : ''}`
        : 'Onboarding pruefen'
      const { syncAufgabeAusQuelleAdmin } = await import('@/app/actions/aufgaben')
      await syncAufgabeAusQuelleAdmin(voll.organisation_id, 'onboarding', voll.id, {
        titel,
        status:             'in_arbeit',
        prioritaet:         'normal',
        kunde_id:           (voll.kunde_id as string | null) ?? null,
        projekt_id:         (voll.projekt_id as string | null) ?? null,
        sichtbar_fuer_kunde: false,
      })
    }
  } catch (e) { console.error('[syncAufgabe:onboarding:absenden]', e) }

  return { erfolg: true }
}

/** Alle Anfragen für das Dashboard. */
export async function alleOnboardingAnfragen() {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data } = await supabase
    .from('onboarding_anfragen')
    .select('*')
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: false })
  return data ?? []
}

/** Status einer Anfrage ändern. */
export async function onboardingStatusAendern(
  id: string,
  status: OnboardingStatus
): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  await supabase
    .from('onboarding_anfragen')
    .update({ status })
    .eq('id', id)
    .eq('organisation_id', orgId)
  revalidatePath('/dashboard/onboarding')
}

/** Einen Onboarding-Link löschen. */
export async function onboardingLinkLoeschen(id: string): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  await supabase
    .from('onboarding_anfragen')
    .delete()
    .eq('id', id)
    .eq('organisation_id', orgId)
  // Auto-Sync: zugehoerige Aufgabe entfernen
  try {
    const { syncAufgabeAusQuelle } = await import('@/app/actions/aufgaben')
    await syncAufgabeAusQuelle('onboarding', id, null, { loeschen: true })
  } catch (e) { console.error('[syncAufgabe:onboarding:loeschen]', e) }
  revalidatePath('/dashboard/onboarding')
  revalidatePath('/dashboard/aufgaben')
}

/**
 * Kunden (+ optional Projekt) aus Onboarding-Anfrage anlegen und
 * direkt weiterleiten. Thin-Wrapper um die robuste V2-Funktion
 * `kundeUndProjektAusOnboarding` aus onboarding-erweitert.ts —
 * dadurch profitiert auch dieser Pfad von Email-Dup-Check,
 * Atomarität und Räume-Best-Effort.
 */
export async function kundeAusOnboardingAnlegen(anfrageId: string): Promise<void> {
  const { kundeUndProjektAusOnboarding } = await import('@/app/actions/onboarding-erweitert')
  const res = await kundeUndProjektAusOnboarding(anfrageId, { raeume_erstellen: false })
  if (res.projekt_id) redirect(`/dashboard/projekte/${res.projekt_id}`)
  else                redirect(`/dashboard/kunden/${res.kunde_id}`)
}

// ── Vorlagen-CRUD ─────────────────────────────────────────────

/** Alle Onboarding-Vorlagen laden. */
export async function alleVorlagenLaden(): Promise<OnboardingVorlage[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('onboarding_vorlagen')
    .select('*')
    .order('ist_standard', { ascending: false })
    .order('created_at')
  return (data ?? []) as OnboardingVorlage[]
}

/** Eine Vorlage per ID laden. */
export async function vorlageLaden(id: string): Promise<OnboardingVorlage | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('onboarding_vorlagen')
    .select('*')
    .eq('id', id)
    .single()
  return data as OnboardingVorlage | null
}

/**
 * Vorlage mit Token öffentlich laden (kein Login).
 *
 * Priorität auf `vorlage_snapshot` (zum Erstellungszeitpunkt eingefroren),
 * Fallback auf die aktuelle Vorlage. Damit sieht der Kunde immer die
 * Frage-Sets, die zum Zeitpunkt der Link-Erstellung galten — selbst
 * wenn der Admin die Vorlage zwischenzeitlich editiert oder löscht.
 */
export async function vorlageZuTokenLaden(token: string): Promise<OnboardingVorlage | null> {
  const supabase = createAdminClient()
  const { data: anfrage } = await supabase
    .from('onboarding_anfragen')
    .select('vorlage_id, vorlage_snapshot')
    .eq('token', token)
    .single()

  if (!anfrage) return null
  if (anfrage.vorlage_snapshot) return anfrage.vorlage_snapshot as OnboardingVorlage
  if (!anfrage.vorlage_id) return null

  const { data: vorlage } = await supabase
    .from('onboarding_vorlagen')
    .select('*')
    .eq('id', anfrage.vorlage_id)
    .single()

  return vorlage as OnboardingVorlage | null
}

/** Neue Vorlage erstellen. */
export async function vorlageErstellen(
  name: string,
  beschreibung: string,
  fragen: OnboardingFrage[],
  sektionen: OnboardingSektion[] = []
): Promise<OnboardingVorlage> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data, error } = await supabase
    .from('onboarding_vorlagen')
    .insert({ name, beschreibung: beschreibung || null, fragen, sektionen, ist_standard: false, organisation_id: orgId })
    .select('*')
    .single()
  if (error || !data) throw new Error('Fehler beim Erstellen der Vorlage')
  revalidatePath('/dashboard/onboarding/vorlagen')
  return data as OnboardingVorlage
}

/** Vorlage aktualisieren. */
export async function vorlageSpeichern(
  id: string,
  name: string,
  beschreibung: string,
  fragen: OnboardingFrage[],
  sektionen: OnboardingSektion[] = []
): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  await supabase
    .from('onboarding_vorlagen')
    .update({ name, beschreibung: beschreibung || null, fragen, sektionen, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organisation_id', orgId)
  revalidatePath('/dashboard/onboarding/vorlagen')
}

/** Vorlage löschen (Standard-Vorlage kann nicht gelöscht werden). */
export async function vorlageLoeschen(id: string): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  // Sicherheitscheck: Standard-Vorlage nicht löschen
  const { data } = await supabase
    .from('onboarding_vorlagen')
    .select('ist_standard')
    .eq('id', id)
    .eq('organisation_id', orgId)
    .single()
  if (data?.ist_standard) return
  await supabase.from('onboarding_vorlagen').delete().eq('id', id).eq('organisation_id', orgId)
  revalidatePath('/dashboard/onboarding/vorlagen')
}
