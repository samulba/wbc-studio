import fs from 'fs'
import path from 'path'

export interface ChangelogEntry {
  datum:     string             // ISO: YYYY-MM-DD
  sektionen: ChangelogSektion[]  // z.B. "Sicherheit", "Workflows"
}

export interface ChangelogSektion {
  titel:   string | null         // null = keine Sektion, nur Stichpunkte
  punkte:  ChangelogPunkt[]
}

export interface ChangelogPunkt {
  /** Zeile zerlegt in alternierende Text-/Bold-Segmente (Inline-Markdown). */
  segmente: ChangelogPunktSegment[]
}

export interface ChangelogPunktSegment {
  text: string
  bold: boolean
}

/** Zerlegt eine Zeile an `**...**` in Segmente. Bewahrt Leerzeichen. */
function zerlegePunkt(zeile: string): ChangelogPunktSegment[] {
  const segmente: ChangelogPunktSegment[] = []
  const regex = /\*\*(.+?)\*\*/g
  let zuletzt = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(zeile)) !== null) {
    if (match.index > zuletzt) {
      segmente.push({ text: zeile.slice(zuletzt, match.index), bold: false })
    }
    segmente.push({ text: match[1], bold: true })
    zuletzt = match.index + match[0].length
  }
  if (zuletzt < zeile.length) {
    segmente.push({ text: zeile.slice(zuletzt), bold: false })
  }
  return segmente.length > 0 ? segmente : [{ text: zeile, bold: false }]
}

/**
 * Lädt CHANGELOG.md aus dem Repo-Root und parsed ihn in strukturierte Einträge.
 * Wird server-seitig aufgerufen (fs-Zugriff).
 */
export function getChangelog(): ChangelogEntry[] {
  const filePath = path.join(process.cwd(), 'CHANGELOG.md')
  if (!fs.existsSync(filePath)) return []

  const raw = fs.readFileSync(filePath, 'utf8')
  return parseChangelog(raw)
}

export function parseChangelog(raw: string): ChangelogEntry[] {
  const eintraege: ChangelogEntry[] = []
  let aktuellerEintrag: ChangelogEntry | null = null
  let aktuelleSektion:  ChangelogSektion | null = null

  const lines = raw.split('\n')
  for (const line of lines) {
    // ## 2026-04-21
    const datumMatch = line.match(/^##\s+(\d{4}-\d{2}-\d{2})\s*$/)
    if (datumMatch) {
      aktuellerEintrag = { datum: datumMatch[1], sektionen: [] }
      aktuelleSektion  = null
      eintraege.push(aktuellerEintrag)
      continue
    }

    // ### Sektionsname
    const sektionMatch = line.match(/^###\s+(.+?)\s*$/)
    if (sektionMatch && aktuellerEintrag) {
      aktuelleSektion = { titel: sektionMatch[1], punkte: [] }
      aktuellerEintrag.sektionen.push(aktuelleSektion)
      continue
    }

    // - Stichpunkt
    const punktMatch = line.match(/^-\s+(.+?)\s*$/)
    if (punktMatch && aktuellerEintrag) {
      if (!aktuelleSektion) {
        aktuelleSektion = { titel: null, punkte: [] }
        aktuellerEintrag.sektionen.push(aktuelleSektion)
      }
      aktuelleSektion.punkte.push({ segmente: zerlegePunkt(punktMatch[1]) })
    }
  }

  return eintraege
}

/** Zählt Einträge mit Datum > seit (als Date oder ISO-String). */
export function zaehleNeueEintraege(
  eintraege: ChangelogEntry[],
  seit: Date | string | null,
): number {
  if (!seit) return eintraege.length
  const seitDate = typeof seit === 'string' ? new Date(seit) : seit
  return eintraege.filter((e) => new Date(e.datum) > seitDate).length
}
