/**
 * Robuster Euro-Wert-Parser fuer DE- und EN-Locale-Strings.
 *
 * Verhindert den klassischen 9000-zu-9-Bug, der entsteht, wenn man
 * `parseFloat("9.000")` benutzt — JavaScript ignoriert Tausenderpunkte
 * und liefert 9 statt 9000.
 *
 * Beispiele:
 *  - "9.000"     → 9000
 *  - "9000"      → 9000
 *  - "9.000,50"  → 9000.5
 *  - "9000,50"   → 9000.5
 *  - "9000.50"   → 9000.5 (EN-Locale)
 *  - "1.234.567" → 1234567
 *  - 9000        → 9000
 *  - null/""     → null
 */
export function parseGeldwert(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const s = String(value).trim()
  if (!s) return null
  let normalisiert = s
  if (s.includes(',')) {
    // DE-Format: Punkt = Tausender, Komma = Dezimal — "1.234,56" → "1234.56"
    normalisiert = s.replace(/\./g, '').replace(',', '.')
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    // Mehrere Punkt-getrennte 3er-Gruppen ohne Komma → Tausender, kein Dezimal
    // "9.000" / "1.234.567" → "9000" / "1234567"
    normalisiert = s.replace(/\./g, '')
  }
  const num = parseFloat(normalisiert)
  return Number.isFinite(num) ? num : null
}

/** Wie parseGeldwert, aber 0 statt null als Fallback (z.B. fuer Summen). */
export function parseGeldwertOrZero(value: string | number | null | undefined): number {
  return parseGeldwert(value) ?? 0
}

/** Formatiert Euro-Wert auf de-DE — z.B. fuer Anzeigen. */
export function formatEuro(n: number | null | undefined, opt?: { dezimalen?: 0 | 2 }): string {
  if (n == null || !Number.isFinite(n)) return '–'
  const dez = opt?.dezimalen ?? 0
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: dez,
    maximumFractionDigits: dez,
  }).format(n)
}
