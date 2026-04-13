import { createClient } from '@supabase/supabase-js'

// Service-Role-Client: umgeht RLS vollständig.
// NUR für serverseitige Aktionen verwenden, die nach eigener Validierung handeln.
// NIEMALS im Browser oder in Client Components verwenden.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Wenn der Key fehlt: Platzhalter verwenden, damit der Konstruktor nicht wirft.
  // Alle DB-Operationen schlagen dann mit einem Auth-Fehler fehl (werden als error-Objekt
  // zurückgegeben, nicht als Exception) – Seiten können das graceful handhaben.
  return createClient(url, key ?? 'supabase-service-key-not-configured')
}
