import { NextResponse } from 'next/server'
import { load } from 'cheerio'
import { createClient } from '@/lib/supabase/server'

export type ScraperErgebnis = {
  title:        string | null
  image:        string | null
  description:  string | null
  price:        number | null
  artikelnummer: string | null
  material:     string | null
  farbe:        string | null
  lieferzeit:   string | null
  breite_cm:    number | null
  tiefe_cm:     number | null
  hoehe_cm:     number | null
}

function parseDimension(val: string | null | undefined): number | null {
  if (!val) return null
  const n = parseFloat(val.replace(',', '.'))
  return isNaN(n) ? null : n
}

function parsePreis(val: string | null | undefined): number | null {
  if (!val) return null
  const cleaned = val.replace(/[^\d.,]/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254']
const BLOCKED_PREFIXES = ['10.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', '192.168.']

function isSafeUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw)
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
    const h = parsed.hostname
    if (BLOCKED_HOSTS.includes(h)) return false
    if (BLOCKED_PREFIXES.some(p => h.startsWith(p))) return false
    return true
  } catch {
    return false
  }
}

export async function GET(req: Request) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url).searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'URL fehlt' }, { status: 400 })

  // SSRF protection
  if (!isSafeUrl(url)) {
    return NextResponse.json({ error: 'URL nicht erlaubt' }, { status: 403 })
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Seite nicht erreichbar' }, { status: 502 })
    }

    const html = await response.text()
    const $ = load(html)

    const ergebnis: ScraperErgebnis = {
      title:        null,
      image:        null,
      description:  null,
      price:        null,
      artikelnummer: null,
      material:     null,
      farbe:        null,
      lieferzeit:   null,
      breite_cm:    null,
      tiefe_cm:     null,
      hoehe_cm:     null,
    }

    // ── JSON-LD (schema.org Product) ────────────────────────────
    const jsonLdScripts = $('script[type="application/ld+json"]').toArray()
    for (const script of jsonLdScripts) {
      try {
        const raw = $(script).html() ?? '{}'
        const parsed = JSON.parse(raw)
        const candidates = Array.isArray(parsed) ? parsed : [parsed]
        for (const node of candidates) {
          const product =
            node['@type'] === 'Product'
              ? node
              : Array.isArray(node['@graph'])
              ? node['@graph'].find((n: { '@type': string }) => n['@type'] === 'Product')
              : null
          if (!product) continue

          if (!ergebnis.title && product.name)        ergebnis.title        = String(product.name)
          if (!ergebnis.description && product.description) ergebnis.description = String(product.description)
          if (!ergebnis.artikelnummer && product.sku) ergebnis.artikelnummer = String(product.sku)
          if (!ergebnis.material && product.material) ergebnis.material     = String(product.material)
          if (!ergebnis.farbe && product.color)       ergebnis.farbe        = String(product.color)
          if (product.image) {
            const img = Array.isArray(product.image) ? product.image[0] : product.image
            if (!ergebnis.image) ergebnis.image = typeof img === 'string' ? img : img?.url ?? null
          }

          // Offers → Preis
          const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers
          if (offers?.price && !ergebnis.price) {
            ergebnis.price = parsePreis(String(offers.price))
          }

          // Maße (schema.org depth/height/width)
          if (product.depth?.value  && !ergebnis.tiefe_cm)  ergebnis.tiefe_cm  = parseDimension(String(product.depth.value))
          if (product.height?.value && !ergebnis.hoehe_cm)  ergebnis.hoehe_cm  = parseDimension(String(product.height.value))
          if (product.width?.value  && !ergebnis.breite_cm) ergebnis.breite_cm = parseDimension(String(product.width.value))

          break
        }
      } catch { /* ignore parse errors */ }
    }

    // ── Open Graph / Meta Fallbacks ─────────────────────────────
    if (!ergebnis.title) {
      ergebnis.title =
        $('meta[property="og:title"]').attr('content')?.trim() ||
        $('meta[name="twitter:title"]').attr('content')?.trim() ||
        $('title').text().trim() ||
        null
    }

    if (!ergebnis.image) {
      ergebnis.image =
        $('meta[property="og:image"]').attr('content')?.trim() ||
        $('meta[name="twitter:image"]').attr('content')?.trim() ||
        null
    }

    if (!ergebnis.description) {
      ergebnis.description =
        $('meta[property="og:description"]').attr('content')?.trim() ||
        $('meta[name="description"]').attr('content')?.trim() ||
        null
    }

    // ── Preis-Fallbacks ─────────────────────────────────────────
    if (!ergebnis.price) {
      const priceStr =
        $('meta[property="product:price:amount"]').attr('content') ||
        $('meta[property="og:price:amount"]').attr('content') ||
        $('[itemprop="price"]').attr('content') ||
        $('[itemprop="price"]').first().text().trim() ||
        null
      ergebnis.price = parsePreis(priceStr)
    }

    // ── Artikelnummer-Fallbacks ─────────────────────────────────
    if (!ergebnis.artikelnummer) {
      ergebnis.artikelnummer =
        $('[itemprop="sku"]').first().text().trim() ||
        $('[class*="sku"]').first().text().replace(/[^A-Za-z0-9\-_\.]/g, '').trim() ||
        null
      if (!ergebnis.artikelnummer) ergebnis.artikelnummer = null
    }

    return NextResponse.json(ergebnis)
  } catch {
    return NextResponse.json({ error: 'Scraping fehlgeschlagen' }, { status: 500 })
  }
}
