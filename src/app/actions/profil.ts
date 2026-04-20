'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type ProfilActionState = { fehler?: string; erfolg?: string } | null

export async function updateProfil(
  prevState: ProfilActionState,
  formData: FormData
): Promise<ProfilActionState> {
  const supabase = await createClient()
  const email = (formData.get('email') as string)?.trim()
  const name = (formData.get('name') as string)?.trim()

  if (!email) return { fehler: 'E-Mail darf nicht leer sein.' }

  const { error } = await supabase.auth.updateUser({
    email,
    data: { full_name: name || null },
  })

  if (error) return { fehler: error.message }

  revalidatePath('/dashboard/profil')
  return { erfolg: 'Profil aktualisiert.' }
}

/**
 * Aktualisiert Vor- und Nachname des aktuell eingeloggten Users.
 *
 * Source-of-Truth-Regel: team_mitglieder ist maßgeblich.
 * auth.user_metadata (full_name/vorname/nachname) wird aus DB gespiegelt —
 * damit der Name auch in Supabase-Logs, Kommentaren und Auth-Hooks
 * zuverlässig auftaucht, ohne dass wir überall joinen müssen.
 * Kein umgekehrter Sync (auth → DB).
 *
 * Multi-Org-Fall: ein User kann in mehreren Organisationen Mitglied sein;
 * Update betrifft alle seine Einträge.
 */
export async function benutzerNamenAktualisieren(
  prevState: ProfilActionState,
  formData: FormData,
): Promise<ProfilActionState> {
  const vorname  = ((formData.get('vorname')  as string) ?? '').trim()
  const nachname = ((formData.get('nachname') as string) ?? '').trim()

  if (vorname.length > 100 || nachname.length > 100) {
    return { fehler: 'Name ist zu lang (max. 100 Zeichen).' }
  }

  const supabase = await createClient()
  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) return { fehler: 'Nicht angemeldet.' }

  const admin = createAdminClient()

  // Alle team_mitglieder-Einträge des Users updaten (Multi-Org)
  const { error: dbErr } = await admin
    .from('team_mitglieder')
    .update({
      vorname:  vorname  || null,
      nachname: nachname || null,
    })
    .eq('user_id', user.id)

  if (dbErr) {
    console.error('[benutzerNamenAktualisieren] DB-Update fehlgeschlagen:', dbErr)
    return { fehler: 'Name konnte nicht gespeichert werden.' }
  }

  // auth.user_metadata spiegeln: full_name + vorname + nachname
  const fullName = [vorname, nachname].filter(Boolean).join(' ') || null
  await supabase.auth.updateUser({
    data: {
      full_name: fullName,
      vorname:   vorname  || null,
      nachname:  nachname || null,
    },
  })

  revalidatePath('/dashboard/einstellungen')
  revalidatePath('/dashboard')
  return { erfolg: 'Name gespeichert.' }
}

export async function updatePasswort(
  prevState: ProfilActionState,
  formData: FormData
): Promise<ProfilActionState> {
  const supabase = await createClient()
  const passwort = formData.get('passwort') as string
  const bestaetigung = formData.get('bestaetigung') as string

  if (!passwort || passwort.length < 6)
    return { fehler: 'Passwort muss mindestens 6 Zeichen lang sein.' }
  if (passwort !== bestaetigung)
    return { fehler: 'Passwörter stimmen nicht überein.' }

  const { error } = await supabase.auth.updateUser({ password: passwort })
  if (error) return { fehler: error.message }

  return { erfolg: 'Passwort geändert.' }
}
