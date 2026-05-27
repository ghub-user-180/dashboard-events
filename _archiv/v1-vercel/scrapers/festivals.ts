import type { Scraper, RawEvent } from '../lib/scraper'
import { normalizeCountry } from '../lib/geo'
import { HEADERS, stableId, sanitizeCity } from '../lib/scraper-utils'

// ── Bitvocation – Bitcoin Conferences ────────────────────────────────────────
// bitvocation.com — JSON-LD ItemList (HTML-entity-encoded inside script tag)
// International — country kommt pro Event aus addressCountry und wird auf ISO-2 normalisiert

async function scrapeBitvocation(): Promise<RawEvent[]> {
  try {
    const res = await fetch(
      'https://bitvocation.com/bitcoin-conferences-discounts',
      { headers: HEADERS }
    )
    if (!res.ok) return []
    const html = await res.text()

    const scriptMatch = html.match(/<script[^>]+type="application\/ld\+json"[^>]+children="({[^]*?})"/)
    if (!scriptMatch) return []

    const jsonStr = decodeHtmlEntities(scriptMatch[1])

    let data: { itemListElement?: Array<{ item?: Record<string, unknown> }> }
    try {
      data = JSON.parse(jsonStr)
    } catch {
      return []
    }

    const items = data.itemListElement ?? []
    const events: RawEvent[] = []

    for (const item of items) {
      const e = item.item ?? {}
      const name = e.name as string | undefined
      const startDate = e.startDate as string | undefined
      const url = e.url as string | undefined
      if (!name || !startDate) continue

      const loc = e.location as Record<string, unknown> | undefined
      const addr = (loc?.address ?? {}) as Record<string, unknown>
      const rawCity = (addr.addressLocality ?? '') as string
      const rawCountry = (addr.addressCountry ?? '') as string
      const country = rawCountry ? normalizeCountry(rawCountry) : null
      const city = sanitizeCity(rawCity)
      const locationName = (loc?.name as string | undefined) ?? [rawCity, rawCountry].filter(Boolean).join(', ')

      if (!country) {
        if (rawCountry) console.warn(`bitvocation: unknown country "${rawCountry}" for "${name}"`)
        continue
      }
      if (!city) continue

      events.push({
        id: stableId('bitvocation', name, startDate),
        title: name,
        startDate,
        location: locationName || 'TBA',
        city,
        country,
        url: url ?? 'https://bitvocation.com/bitcoin-conferences-discounts',
        source: 'scraper',
      })
    }

    return events
  } catch (e) {
    console.error('bitvocation.com error:', e)
    return []
  }
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

export const bitvocationScraper: Scraper = {
  id: 'bitvocation',
  name: 'Bitvocation.com',
  category: 'konferenzen',
  // kein country-Default: bitvocation ist international, jeder Event bringt sein Land
  run: scrapeBitvocation,
}
