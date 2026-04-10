import { NextResponse } from 'next/server'
import { load } from 'cheerio'

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'URL fehlt' }, { status: 400 })

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

    // Title: og:title > twitter:title > <title>
    const title =
      $('meta[property="og:title"]').attr('content')?.trim() ||
      $('meta[name="twitter:title"]').attr('content')?.trim() ||
      $('title').text().trim() ||
      null

    // Image: og:image > twitter:image
    const image =
      $('meta[property="og:image"]').attr('content')?.trim() ||
      $('meta[name="twitter:image"]').attr('content')?.trim() ||
      null

    // Price: various structured data / meta tags
    let price: number | null = null
    const priceStr =
      $('meta[property="product:price:amount"]').attr('content') ||
      $('meta[property="og:price:amount"]').attr('content') ||
      $('[itemprop="price"]').attr('content') ||
      $('[itemprop="price"]').first().text().trim() ||
      null

    if (priceStr) {
      const parsed = parseFloat(priceStr.replace(/[^\d.,]/g, '').replace(',', '.'))
      if (!isNaN(parsed)) price = parsed
    }

    return NextResponse.json({ title, image, price })
  } catch {
    return NextResponse.json({ error: 'Scraping fehlgeschlagen' }, { status: 500 })
  }
}
