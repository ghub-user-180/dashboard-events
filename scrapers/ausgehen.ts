import * as cheerio from 'cheerio'
import type { Scraper, RawEvent } from '../lib/scraper'
import { HEADERS, stableId } from '../lib/scraper-utils'

// ── 1. Konzerthaus Schüür Luzern ────────────────────────────────────────────

async function scrapeSchuur(): Promise<RawEvent[]> {
  try {
    const res = await fetch('https://www.schuur.ch/programm', { headers: HEADERS })
    if (!res.ok) return []
    const html = await res.text()
    const $ = cheerio.load(html)
    const events: RawEvent[] = []

    $('.viz-event-list-box').each((_, el) => {
      const $el = $(el)

      const startRaw = $el.find('meta[itemprop="startDate"]').attr('content') ?? ''
      const endRaw = $el.find('meta[itemprop="endDate"]').attr('content') ?? ''
      if (!startRaw) return

      const startDate = startRaw.split('T')[0]
      const startTime = startRaw.includes('T') ? startRaw.split('T')[1].slice(0, 5) : undefined
      const endDate = endRaw ? endRaw.split('T')[0] : undefined
      const endTime = endRaw.includes('T') ? endRaw.split('T')[1].slice(0, 5) : undefined

      const anchor = $el.find('h3 a, h2 a').first()
      const title = anchor.text().trim()
      const href = anchor.attr('href') ?? ''
      const url = href.startsWith('http') ? href : `https://www.schuur.ch${href}`

      if (!title) return

      events.push({
        id: stableId('schuur', title, startDate),
        title,
        startDate,
        endDate: endDate !== startDate ? endDate : undefined,
        startTime,
        endTime,
        location: 'Konzerthaus Schüür, Tribschenstrasse 1, Luzern',
        city: 'Luzern',
        url,
        source: 'scraper',
      })
    })

    return events
  } catch (e) {
    console.error('schuur.ch error:', e)
    return []
  }
}

// ── 2. Jazzkantine Luzern ───────────────────────────────────────────────────

async function scrapeJazzkantine(): Promise<RawEvent[]> {
  try {
    const res = await fetch('https://www.jazzkantine.com/veranstaltungen', { headers: HEADERS })
    if (!res.ok) return []
    const html = await res.text()
    const $ = cheerio.load(html)
    const events: RawEvent[] = []

    $('.eventlist-event--upcoming').each((_, el) => {
      const $el = $(el)

      const dateEl = $el.find('time.event-date')
      const startDate = dateEl.attr('datetime')
      if (!startDate) return

      const startTime = $el.find('time.event-time-localized-start').text().trim() || undefined
      const endTime = $el.find('time.event-time-localized-end').text().trim() || undefined

      const anchor = $el.find('a.eventlist-title-link')
      const title = anchor.text().trim()
      const href = anchor.attr('href') ?? ''
      const url = href.startsWith('http') ? href : `https://www.jazzkantine.com${href}`

      if (!title) return

      events.push({
        id: stableId('jazzkantine', title, startDate),
        title,
        startDate,
        startTime,
        endTime,
        location: 'Jazzkantine, Grabenstrasse 8, Luzern',
        city: 'Luzern',
        url,
        source: 'scraper',
      })
    })

    return events
  } catch (e) {
    console.error('jazzkantine.com error:', e)
    return []
  }
}

export const schuurScraper: Scraper = {
  id: 'schuur',
  name: 'Konzerthaus Schüür',
  category: 'buehne-konzerte',
  country: 'CH',
  run: scrapeSchuur,
}

export const jazzkantineScraper: Scraper = {
  id: 'jazzkantine',
  name: 'Jazzkantine Luzern',
  category: 'buehne-konzerte',
  country: 'CH',
  run: scrapeJazzkantine,
}
