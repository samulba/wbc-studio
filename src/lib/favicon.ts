/**
 * Auto-Favicon-Helper.
 *
 * Wenn ein Datensatz (Kunde / Partner) eine Website hat aber noch kein
 * eigenes Logo, ziehen wir automatisch das Favicon der Domain als Logo-
 * URL via Google's S2-Favicon-Service. Stabil, keine eigene Storage-
 * Logik, sofort sichtbar.
 *
 * Eigene Uploads werden niemals überschrieben — wir erkennen unsere
 * eigenen Auto-Favicons am Google-URL-Prefix und ersetzen nur die.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

/** Domain → Google-Favicon-URL. Toleriert auch Eingaben ohne https://. */
export function ableitenFaviconUrl(websiteUrl: string | null | undefined): string | null {
  const w = websiteUrl?.trim()
  if (!w) return null
  try {
    const u = new URL(w.startsWith('http') ? w : `https://${w}`)
    if (!u.hostname) return null
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=128`
  } catch {
    return null
  }
}

/** Identifiziert URLs, die wir zuvor selbst als Auto-Favicon gesetzt haben. */
export function istAutoFavicon(url: string | null | undefined): boolean {
  return !!url && url.startsWith('https://www.google.com/s2/favicons')
}

/**
 * Prüft `<table>` (z. B. 'kunden' / 'partner') auf logo_url + website
 * und setzt das Favicon, wenn:
 *  - kein Logo vorhanden, ODER
 *  - das vorhandene Logo selbst ein Auto-Favicon ist (Domain könnte
 *    sich geändert haben).
 *
 * Eigene Uploads bleiben unangetastet.
 */
export async function applyFaviconIfNeeded(
  supabase: SupabaseClient,
  table: 'kunden' | 'partner',
  id: string,
  orgId: string,
): Promise<void> {
  const { data: row } = await supabase
    .from(table)
    .select('logo_url, website')
    .eq('id', id)
    .eq('organisation_id', orgId)
    .maybeSingle()
  if (!row) return

  const aktuell = row.logo_url as string | null
  const website = row.website as string | null

  if (aktuell && !istAutoFavicon(aktuell)) return     // eigenes Logo bewahren
  const favicon = ableitenFaviconUrl(website)
  if (!favicon) return                                 // keine Website → kein Favicon
  if (favicon === aktuell) return                      // schon gleich

  await supabase
    .from(table)
    .update({ logo_url: favicon })
    .eq('id', id)
    .eq('organisation_id', orgId)
}
