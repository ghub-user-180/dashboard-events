import * as cheerio from 'cheerio'
import type { Scraper, RawEvent } from '../lib/scraper'
import { HEADERS, stableId } from '../lib/scraper-utils'

// ── Barhopping.ch ────────────────────────────────────────────────────────────
// Schema.org-Microdata pro Event (itemscope/Event mit meta itemprop=startDate/name).
// Liefert mehrere parallele Events pro Datum (verschiedene Altersgruppen) —
// dedupliziert nicht, weil jede Altersgruppe eine eigene Veranstaltung ist.

async function scrapeBarhopping(): Promise<RawEvent[]> {
  try {
    const res = await fetch('https://barhopping.ch/', { headers: HEADERS })
    if (!res.ok) return []
    const html = await res.text()
    const $ = cheerio.load(html)
    const events: RawEvent[] = []
    const seen = new Set<string>()

    $('[itemtype="https://schema.org/Event"]').each((_, el) => {
      const $el = $(el)

      const startDateAttr = $el.find('meta[itemprop="startDate"]').attr('content') ?? ''
      if (!startDateAttr) return

      const [startDate, startTimeRaw] = startDateAttr.split('T')
      const startTime = startTimeRaw?.slice(0, 5)

      // Stadt steht im sichtbaren Text — "Zürich", "Bern", "Basel", etc.
      // Heuristik: nimm den ersten kurzen Text-Block im Event-Container
      const cityText = $el
        .find('div.text-left')
        .filter((_, n) => {
          const t = $(n).text().trim()
          return /^[A-ZÄÖÜ][a-zäöü]{2,12}$/.test(t)
        })
        .first()
        .text()
        .trim()
      if (!cityText) return

      const description = $el.find('meta[itemprop="description"]').attr('content') ?? ''
      const ageGroup = $el.find('.bg-secondary.text-primary.rounded.grow .p-2').first().text().trim()
      const title = ageGroup ? `Barhopping ${cityText} — ${ageGroup}` : `Barhopping ${cityText}`

      const href = $el.find('a').first().attr('href') ?? ''
      const url = href.startsWith('http') ? href : `https://barhopping.ch${href}`

      const id = stableId('barhopping', title, startDate)
      if (seen.has(id)) return
      seen.add(id)

      events.push({
        id,
        title,
        startDate,
        startTime,
        location: `Barhopping ${cityText}`,
        city: cityText,
        description,
        url,
        source: 'scraper',
      })
    })

    return events
  } catch (e) {
    console.error('barhopping.ch error:', e)
    return []
  }
}

export const barhoppingScraper: Scraper = {
  id: 'barhopping',
  name: 'Barhopping',
  category: 'sozialleben',
  country: 'CH',
  run: scrapeBarhopping,
}
