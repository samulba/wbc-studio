/**
 * Shared PDF generation helpers.
 * NO 'use server' — pure utility file used by API routes.
 */

// ── Formatter ─────────────────────────────────────────────────

export const pdfEur = (n: number): string =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)

export const pdfDatum = (iso: string | null): string => {
  if (!iso) return '–'
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export const pdfHeute = (): string => pdfDatum(new Date().toISOString())

// ── Farben ────────────────────────────────────────────────────

export const WB_GREEN: [number, number, number] = [68, 92, 73]      // #445c49
export const GRAY_900: [number, number, number] = [17, 24, 39]
export const GRAY_600: [number, number, number] = [75, 85, 99]
export const GRAY_400: [number, number, number] = [156, 163, 175]
export const GRAY_100: [number, number, number] = [243, 244, 246]
export const WHITE:    [number, number, number] = [255, 255, 255]

// ── Logo laden ────────────────────────────────────────────────

export async function logoAlsBase64(
  url: string | null
): Promise<{ data: string; format: 'PNG' | 'JPEG' } | null> {
  if (!url) return null
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    const buf  = await res.arrayBuffer()
    const mime = res.headers.get('content-type') ?? 'image/png'
    const fmt  = mime.includes('jpeg') || mime.includes('jpg') ? 'JPEG' : 'PNG'
    const b64  = Buffer.from(buf).toString('base64')
    return { data: `data:${mime};base64,${b64}`, format: fmt }
  } catch {
    return null
  }
}

// ── HTML → Strukturierter Text ────────────────────────────────

export type TextBlock =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p';  text: string }
  | { type: 'li'; text: string }
  | { type: 'hr' }

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g,   '&')
    .replace(/&lt;/g,    '<')
    .replace(/&gt;/g,    '>')
    .replace(/&nbsp;/g,  ' ')
    .replace(/&auml;/g,  'ä')
    .replace(/&ouml;/g,  'ö')
    .replace(/&uuml;/g,  'ü')
    .replace(/&Auml;/g,  'Ä')
    .replace(/&Ouml;/g,  'Ö')
    .replace(/&Uuml;/g,  'Ü')
    .replace(/&szlig;/g, 'ß')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&quot;/g,  '"')
    .trim()
}

export function htmlZuBloecke(html: string): TextBlock[] {
  const blocks: TextBlock[] = []

  // Normalize newlines
  const normalized = html.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Process tag by tag using regex
  const tagPattern = /<(h1|h2|h3|p|li|ul|ol|hr|div)[^>]*>([\s\S]*?)<\/\1>|<hr\s*\/?>/gi
  let match: RegExpExecArray | null

  // eslint-disable-next-line no-cond-assign
  while ((match = tagPattern.exec(normalized)) !== null) {
    const tag     = (match[1] ?? 'hr').toLowerCase()
    const inner   = match[2] ?? ''
    const text    = stripTags(inner).replace(/\s+/g, ' ').trim()

    if (tag === 'hr') {
      blocks.push({ type: 'hr' })
    } else if (tag === 'h1' && text) {
      blocks.push({ type: 'h1', text })
    } else if (tag === 'h2' && text) {
      blocks.push({ type: 'h2', text })
    } else if (tag === 'h3' && text) {
      blocks.push({ type: 'h3', text })
    } else if (tag === 'li' && text) {
      blocks.push({ type: 'li', text })
    } else if ((tag === 'p' || tag === 'div') && text) {
      // Multi-line paragraphs
      text.split('\n').forEach((line) => {
        const l = line.trim()
        if (l) blocks.push({ type: 'p', text: l })
      })
    }
  }

  // Fallback: if nothing matched, use plain text paragraphs
  if (blocks.length === 0) {
    const plain = stripTags(normalized)
    plain.split('\n').forEach((line) => {
      const l = line.trim()
      if (l) blocks.push({ type: 'p', text: l })
    })
  }

  return blocks
}

// ── Seitenbreite / Margins ────────────────────────────────────

export const PAGE_W  = 210   // A4 mm
export const PAGE_H  = 297   // A4 mm
export const MARGIN  = 15    // mm
export const COL_W   = PAGE_W - MARGIN * 2  // ~180 mm
