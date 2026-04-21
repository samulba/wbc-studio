import { createClient } from '@supabase/supabase-js'

// Service-Role-Client: umgeht RLS vollständig.
// NUR für serverseitige Aktionen verwenden, die nach eigener Validierung handeln.
// NIEMALS im Browser oder in Client Components verwenden.
export function createAdminClient() {
  // Wenn URL oder Key fehlen: Platzhalter verwenden, damit der Konstruktor
  // nicht wirft. Alle DB-Operationen schlagen dann mit einem Auth-Fehler fehl
  // (als error-Objekt, nicht als Exception) – Seiten können das graceful
  // handhaben. Wichtig für SSR-Builds, bei denen die ENV momentan fehlt.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'supabase-service-key-not-configured'
  return createClient(url, key)
}
