import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component – Cookies können nicht gesetzt werden
          }
        },
      },
    }
  )
}

/**
 * Gibt die organisation_id des aktuell eingeloggten Users zurück.
 * Gibt null zurück wenn kein User eingeloggt ist oder keine Org gefunden wird.
 * Wirft NIEMALS — sicher für SSR-Kontext.
 */
export async function getOrganisationIdOrNull(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data } = await supabase
      .from('team_mitglieder')
      .select('organisation_id')
      .eq('user_id', user.id)
      .eq('status', 'aktiv')
      .limit(1)
      .maybeSingle()

    return (data?.organisation_id as string | null) ?? null
  } catch {
    return null
  }
}

/**
 * Gibt die organisation_id des aktuell eingeloggten Users zurück.
 * Wirft einen Error wenn kein User eingeloggt ist oder keine Org gefunden wird.
 * Nur in Mutations verwenden (nicht in SSR-Reads).
 */
export async function getOrganisationId(): Promise<string> {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Nicht angemeldet.')

  const { data, error } = await supabase
    .from('team_mitglieder')
    .select('organisation_id')
    .eq('user_id', user.id)
    .eq('status', 'aktiv')
    .limit(1)
    .maybeSingle()

  if (error || !data?.organisation_id) {
    throw new Error('Keine Organisation gefunden. Bitte wenden Sie sich an einen Administrator.')
  }

  return data.organisation_id as string
}
