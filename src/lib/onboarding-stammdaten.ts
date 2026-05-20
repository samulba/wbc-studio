import type { OnboardingFrage, OnboardingVorlage } from '@/lib/supabase/types'

/**
 * Extrahiert Stammdaten-Felder aus den Antworten einer Onboarding-
 * Anfrage. Die Vorlagen verwenden unterschiedliche Frage-IDs
 * (kontakt_name, nk_name, pv_name, projekt_name, …), daher kann der
 * Submit-Pfad nicht alle IDs hart mappen — wenn der Kunde z.B. die
 * Neukunden-Standard-Vorlage benutzt, bleiben die Top-Level-Spalten
 * (kunde_name, kunde_email, …) leer und im Admin-Edit-Modal stehen die
 * Stammdaten-Felder ungefüllt da.
 *
 * Diese Funktion sucht je Stammdaten-Slot die plausibelste Frage und
 * gibt das Ergebnis als Partial-Objekt zurück. Strategie:
 *  1. Frage-`typ` als starker Indikator (email/telefon/datum)
 *  2. Pattern-Match auf `frage.id` (kontakt_, nk_, pv_, projekt_)
 *  3. Pattern-Match auf `frage.titel` als Fallback
 *
 * Bestehende Werte werden vom Caller priorisiert — diese Funktion
 * liefert nur den Fallback wenn die Top-Level-Spalte leer ist.
 */
export interface ExtrahierteStammdaten {
  kunde_name?:        string
  kunde_email?:       string
  kunde_telefon?:     string
  projekt_name?:      string
  projekt_adresse?:   string
  raumtypen?:         string[]
  budget_min?:        number
  budget_max?:        number
  zeitrahmen?:        string
  stil_praeferenzen?: string
  notizen?:           string
}

function alsString(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim().length > 0) return v.trim()
  if (typeof v === 'number') return String(v)
  return undefined
}

function alsStringArray(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const list = v.map(String).map(s => s.trim()).filter(Boolean)
    return list.length > 0 ? list : undefined
  }
  return undefined
}

/** Versucht eine Budget-Range aus einem Auswahl-Label wie "10.000 - 25.000 €" zu parsen. */
function parseBudgetRange(s: string): { min?: number; max?: number } | null {
  const norm = s.replace(/\./g, '').replace(/\s/g, '')
  const ab    = /ab(\d+)/i.exec(norm)
  const bis   = /bis(\d+)/i.exec(norm)
  const range = /(\d+)[-–](\d+)/.exec(norm)
  if (range) return { min: Number(range[1]), max: Number(range[2]) }
  if (ab)    return { min: Number(ab[1]) }
  if (bis)   return { max: Number(bis[1]) }
  const num = /(\d{3,})/.exec(norm)
  if (num)   return { max: Number(num[1]) }
  return null
}

function matchPattern(frage: OnboardingFrage, idPatterns: RegExp[], titelPatterns?: RegExp[]): boolean {
  const id = frage.id.toLowerCase()
  if (idPatterns.some(p => p.test(id))) return true
  if (titelPatterns) {
    const t = frage.titel?.toLowerCase() ?? ''
    if (titelPatterns.some(p => p.test(t))) return true
  }
  return false
}

export function extrahiereStammdatenAusAntworten(
  vorlage: OnboardingVorlage | null | undefined,
  antworten: Record<string, unknown> | null | undefined,
): ExtrahierteStammdaten {
  const out: ExtrahierteStammdaten = {}
  if (!vorlage || !antworten) return out
  const fragen = vorlage.fragen ?? []

  // Hilfs-Funktion: erste passende Frage finden, Wert holen
  const findeWert = (predicate: (f: OnboardingFrage) => boolean): unknown => {
    for (const f of fragen) {
      if (predicate(f)) {
        const v = antworten[f.id]
        if (v != null && v !== '' && !(Array.isArray(v) && v.length === 0)) return v
      }
    }
    return undefined
  }

  // ── E-Mail ─────────────────────────────────────────────────
  out.kunde_email = alsString(
    findeWert((f) => f.typ === 'email') ??
    findeWert((f) => matchPattern(f, [/email|e[_-]?mail|mail/], [/e[\s-]?mail/]))
  )

  // ── Telefon ────────────────────────────────────────────────
  out.kunde_telefon = alsString(
    findeWert((f) => f.typ === 'telefon') ??
    findeWert((f) => matchPattern(f, [/telefon|phone|handy|mobil/], [/telefon|handy|mobil/]))
  )

  // ── Name ──────────────────────────────────────────────────
  // Erst Pattern `name`/`kontakt`/`nk_name`/`pv_name`, danach text-Frage mit titel "Name"
  out.kunde_name = alsString(
    findeWert((f) => matchPattern(f, [
      /^(kontakt|nk|pv)[_-]?name$/,
      /^name$/,
      /kunde[_-]?name/,
      /auftraggeber/,
    ], [
      /\b(ihr )?(vollst.ndiger )?name\b/,
      /^name des/,
    ])) ??
    findeWert((f) => f.typ === 'text' && /name/.test(f.id.toLowerCase()) && !/firma|projekt|datei|raum/.test(f.id.toLowerCase()))
  )

  // ── Projektname ───────────────────────────────────────────
  out.projekt_name = alsString(
    findeWert((f) => matchPattern(f, [
      /^projekt[_-]?(name|bezeichnung|titel)$/,
      /projekt[_-]?(name|bezeichnung|titel)/,
    ], [
      /projekt.?(name|bezeichnung|titel)/,
    ]))
  )

  // ── Projektadresse / Standort ─────────────────────────────
  out.projekt_adresse = alsString(
    findeWert((f) => matchPattern(f, [
      /^projekt[_-]?adresse$/,
      /(projekt|objekt)[_-]?(adresse|standort)/,
      /^pv[_-]?adresse$/,
      /^kontakt[_-]?adresse$/,
    ], [
      /(projekt|objekt).{0,8}adresse/,
      /standort/,
    ]))
  )

  // ── Räume / Raumtypen ─────────────────────────────────────
  out.raumtypen = alsStringArray(
    findeWert((f) => matchPattern(f, [
      /raumtypen?$/,
      /raeume$/,
      /^projekt[_-]?raeume$/,
      /^nk[_-]?raumtypen$/,
    ], [
      /welche r.ume/,
    ]))
  )

  // ── Budget ────────────────────────────────────────────────
  const budgetRaw = alsString(
    findeWert((f) => matchPattern(f, [
      /budget/,
      /gesamtbudget/,
    ], [
      /budget/,
    ]))
  )
  if (budgetRaw) {
    const range = parseBudgetRange(budgetRaw)
    if (range) {
      if (range.min != null) out.budget_min = range.min
      if (range.max != null) out.budget_max = range.max
    }
  }

  // ── Zeitrahmen / Deadline ─────────────────────────────────
  out.zeitrahmen = alsString(
    findeWert((f) => matchPattern(f, [
      /^zeitrahmen$/,
      /zeitrahmen/,
      /(einzugs|fertigstellungs)datum/,
      /deadline/,
      /zeitpunkt/,
    ], [
      /zeitrahmen|fertigstellung|einzug|deadline/,
    ]))
  )

  // ── Stil ──────────────────────────────────────────────────
  const stilWert = findeWert((f) => matchPattern(f, [
    /^stil$/, /stil(praeferenz|en)?/, /design[_-]?stil/,
  ], [
    /stil|einrichtungsstil/,
  ]))
  if (Array.isArray(stilWert)) {
    out.stil_praeferenzen = stilWert.map(String).join(', ')
  } else {
    out.stil_praeferenzen = alsString(stilWert)
  }

  // ── Notizen / Anmerkungen ─────────────────────────────────
  out.notizen = alsString(
    findeWert((f) => matchPattern(f, [
      /notiz/, /anmerk/, /^nachricht$/, /sonstig/, /wuensche?$/,
    ], [
      /notiz|anmerk|nachricht|w.nsche/,
    ]))
  )

  return out
}
