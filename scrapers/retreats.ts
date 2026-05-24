import * as cheerio from 'cheerio'
import type { Scraper, RawEvent } from '../lib/scraper'
import { HEADERS, stableId, sanitizeCity, extractCity } from '../lib/scraper-utils'
import { normalizeCountry } from '../lib/geo'

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', mär: '03', apr: '04', mai: '05', may: '05',
  jun: '06', jul: '07', aug: '08', sep: '09', okt: '10', oct: '10', nov: '11', dez: '12', dec: '12',
}

function vbgDate(year: string, monthAbbr: string, day: string): string | null {
  const m = MONTH_MAP[monthAbbr.toLowerCase().replace(/[^a-zä]/g, '').slice(0, 3)]
  if (!m) return null
  return `${year}-${m}-${day.replace('-', '').padStart(2, '0')}`
}

// ── VBG Agenda (Auszeiten / Retreats) ──────────────────────────────────────

async function scrapeVBG(): Promise<RawEvent[]> {
  try {
    const res = await fetch('https://www.vbg.net/agenda', { headers: HEADERS })
    if (!res.ok) return []
    const html = await res.text()
    const $ = cheerio.load(html)
    const events: RawEvent[] = []

    $('.kItem').each((_, el) => {
      const $el = $(el)
      const calLabel = $el.attr('data-cal-label') ?? ''
      if (!['Auszeiten', 'Kurse', 'Seminare', 'Ferien'].some(k => calLabel.includes(k))) return

      const dataDate = $el.attr('data-date') ?? ''
      const dataDate2 = $el.attr('data-date2') ?? ''
      const year = dataDate.slice(0, 4)
      if (!year) return

      const startDay = $el.find('.startdate .day').text().trim()
      const startMonth = $el.find('.startdate .month').text().trim()
      const startDate = vbgDate(year, startMonth, startDay)
      if (!startDate) return

      const endDay = $el.find('.enddate .day').text().trim()
      const endMonth = $el.find('.enddate .month').text().trim()
      const endYear = dataDate2.slice(0, 4) || year
      const endDate = endDay ? vbgDate(endYear, endMonth || startMonth, endDay) : undefined

      const titleNode = $el.find('.title').contents().filter((_, n) => n.type === 'text').first()
      const title = titleNode.text().trim()
      if (!title) return

      const href = $el.find('a.goSingle').attr('href') ?? ''
      const url = href ? `https://www.vbg.net${href}` : 'https://www.vbg.net/agenda'

      const location = $el.attr('data-place') || ''
      const city = extractCity(location)
      if (!city) return  // Kein Komma-Segment liefert sauberen Stadtnamen

      events.push({
        id: stableId('vbg', title, startDate),
        title,
        startDate,
        endDate: endDate && endDate !== startDate ? endDate : undefined,
        location: location || city,
        city,
        url,
        source: 'scraper',
      })
    })

    return events
  } catch (e) {
    console.error('vbg.net error:', e)
    return []
  }
}

export const vbgScraper: Scraper = {
  id: 'vbg',
  name: 'VBG Agenda',
  category: 'retreats',
  country: 'CH',
  run: scrapeVBG,
}

// ── CampFI (Tribe Events REST API) ───────────────────────────────────────────
// campfi.org nutzt das WordPress-Plugin "The Events Calendar", das eine REST-API
// unter /wp-json/tribe/events/v1/events liefert. Sauberes JSON pro Event,
// inklusive venue.city und venue.country (als Vollname, wird normalisiert).

interface TribeEvent {
  title?: string
  start_date?: string  // "YYYY-MM-DD HH:mm:ss"
  end_date?: string
  url?: string
  venue?: { venue?: string; city?: string; country?: string }
}

async function scrapeCampFI(): Promise<RawEvent[]> {
  try {
    const res = await fetch('https://campfi.org/wp-json/tribe/events/v1/events?per_page=50', { headers: HEADERS })
    if (!res.ok) return []
    const data = (await res.json()) as { events?: TribeEvent[] }
    const events: RawEvent[] = []

    for (const e of data.events ?? []) {
      if (!e.title || !e.start_date) continue

      const startParts = e.start_date.split(' ')
      const startDate = startParts[0]
      const startTime = startParts[1]?.slice(0, 5)

      const endParts = e.end_date?.split(' ') ?? []
      const endDate = endParts[0]
      const endTime = endParts[1]?.slice(0, 5)

      const city = sanitizeCity(e.venue?.city ?? '')
      if (!city) continue

      const country = e.venue?.country ? normalizeCountry(e.venue.country) : null
      if (!country) continue

      const venueName = e.venue?.venue?.trim()
      const location = [venueName, city].filter(Boolean).join(', ') || city

      events.push({
        id: stableId('campfi', e.title, startDate),
        title: e.title,
        startDate,
        endDate: endDate && endDate !== startDate ? endDate : undefined,
        startTime,
        endTime,
        location,
        city,
        country,
        url: e.url ?? 'https://campfi.org/',
        source: 'scraper',
      })
    }

    return events
  } catch (e) {
    console.error('campfi.org error:', e)
    return []
  }
}

export const campfiScraper: Scraper = {
  id: 'campfi',
  name: 'CampFI',
  category: 'retreats',
  // kein country-Default — kommt pro Event aus venue.country (CampFI hat Camps in US, CA, ...)
  run: scrapeCampFI,
}

// ── ZEGG Bildungszentrum (SeminarDesk WP-Plugin) ─────────────────────────────
// zegg.de nutzt SeminarDesk, das schema.org-Microdata pro Event rendert.
// Container: .sd-event mit data-start-date / data-end-date.

async function scrapeZegg(): Promise<RawEvent[]> {
  try {
    const res = await fetch('https://www.zegg.de/de/veranstaltungen/programm', { headers: HEADERS })
    if (!res.ok) return []
    const html = await res.text()
    const $ = cheerio.load(html)
    const events: RawEvent[] = []

    $('.sd-event[data-start-date]').each((_, el) => {
      const $el = $(el)

      const startDateAttr = $el.find('time[itemprop="startDate"]').attr('datetime') ?? ''
      const endDateAttr = $el.find('time[itemprop="endDate"]').attr('datetime') ?? ''
      if (!startDateAttr) return

      const [startDate, startTimeRaw] = startDateAttr.split('T')
      const startTime = startTimeRaw?.slice(0, 5)
      const [endDate, endTimeRaw] = endDateAttr.split('T')
      const endTime = endTimeRaw?.slice(0, 5)

      const title = $el.find('h4[itemprop="name"]').text().trim()
      if (!title) return

      const city = sanitizeCity($el.find('[itemprop="addressLocality"]').text().trim())
      if (!city) return

      const country = $el.find('[itemprop="addressCountry"]').text().trim()
      if (!country) return

      const venueName = $el.find('.sd-event-location [itemprop="name"]').text().trim()
      const location = venueName ? `${venueName}, ${city}` : city

      const href = $el.find('a[itemprop="url"]').attr('href') ?? ''
      const url = href.startsWith('http') ? href : `https://www.zegg.de${href}`

      events.push({
        id: stableId('zegg', title, startDate),
        title,
        startDate,
        endDate: endDate && endDate !== startDate ? endDate : undefined,
        startTime,
        endTime,
        location,
        city,
        country,
        url,
        source: 'scraper',
      })
    })

    return events
  } catch (e) {
    console.error('zegg.de error:', e)
    return []
  }
}

export const zeggScraper: Scraper = {
  id: 'zegg',
  name: 'ZEGG Bildungszentrum',
  category: 'retreats',
  // kein country-Default — ZEGG sitzt in DE, pro Event aus schema.org addressCountry
  run: scrapeZegg,
}

// Sensuality Festival entfernt: die Webseite liefert nur das Datum, keinen
// konkreten Stadtnamen. Eintrag lebt jetzt in sources.json als pending,
// bis der Ort manuell eingetragen werden kann.
