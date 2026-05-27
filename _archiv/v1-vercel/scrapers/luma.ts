import type { Scraper, RawEvent } from '../lib/scraper'
import { sanitizeCity } from '../lib/scraper-utils'

// Public Luma API. Discovered events in einem 50-km-Radius um Bern.
// Erwartet `LUMA_API_KEY` im Env (GitHub Action Secret).
async function fetchLumaEvents(): Promise<RawEvent[]> {
  const apiKey = process.env.LUMA_API_KEY
  if (!apiKey) {
    console.warn('luma: LUMA_API_KEY not set, skipping')
    return []
  }

  try {
    const res = await fetch(
      'https://api.lu.ma/public/v1/discover/search?geo_latitude=46.9480&geo_longitude=7.4474&geo_radius_meters=50000',
      { headers: { 'x-luma-api-key': apiKey } }
    )
    if (!res.ok) return []
    const data = await res.json()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const all: RawEvent[] = (data.events ?? []).map((item: any): RawEvent | null => {
      const e = item.event ?? item
      const startAt: string = e.start_at ?? e.start_date ?? ''
      const endAt: string = e.end_at ?? ''
      const city = sanitizeCity(e.geo_address_json?.city ?? '')
      if (!city) return null
      return {
        id: `luma-${e.api_id ?? e.id}`,
        title: e.name ?? e.title ?? 'Unbekannt',
        startDate: startAt.split('T')[0],
        endDate: endAt ? endAt.split('T')[0] : undefined,
        startTime: startAt.includes('T') ? startAt.split('T')[1].substring(0, 5) : undefined,
        endTime: endAt.includes('T') ? endAt.split('T')[1].substring(0, 5) : undefined,
        location: e.geo_address_json?.description ?? e.location ?? '',
        city,
        description: e.description ?? '',
        url: e.url ? `https://lu.ma/${e.url}` : 'https://lu.ma/discover',
        source: 'scraper',
      }
    }).filter((x: RawEvent | null): x is RawEvent => x !== null)
    return all
  } catch (err) {
    console.error('luma error:', err)
    return []
  }
}

export const lumaScraper: Scraper = {
  id: 'luma',
  name: 'Luma',
  category: 'begegnungen',
  country: 'CH',  // Suche ist auf 50 km um Bern beschränkt
  run: fetchLumaEvents,
}
