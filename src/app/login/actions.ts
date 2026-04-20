'use server'

import { createClient } from '@/lib/supabase/server'

export type LoginResult = { ok?: true; fehler?: string }

/**
 * Login via Server Action. Cookies werden via Response-Header gesetzt,
 * damit beim nachfolgenden Client-Redirect (window.location.href) garantiert
 * der frische Auth-Cookie an den nächsten Request geht.
 *
 * Der eigentliche Redirect passiert client-seitig nach Erhalt von { ok: true } —
 * dadurch behalten wir Domain-aware Routing-Logik (Hauptdomain → App-Subdomain).
 */
export async function loginAction(formData: FormData): Promise<LoginResult> {
  const email    = (formData.get('email')    ?? '').toString().trim()
  const passwort = (formData.get('passwort') ?? '').toString()

  if (!email || !passwort) {
    return { fehler: 'E-Mail und Passwort sind erforderlich.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password: passwort })

  if (error) {
    return { fehler: 'E-Mail oder Passwort ungültig.' }
  }

  return { ok: true }
}
