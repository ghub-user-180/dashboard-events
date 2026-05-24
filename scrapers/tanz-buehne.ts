import * as cheerio from 'cheerio'
import type { Scraper, RawEvent } from '../lib/scraper'
import { HEADERS, stableId, sanitizeCity, extractCity } from '../lib/scraper-utils'

const CATEGORY = 'tanz-buehne'

// ── Helpers (lokal — auf das spezifische Quell-Datumsformat zugeschnitten) ──

const MONTHS: Record<string, string> = {
  januar: '01', februar: '02', märz: '03', maerz: '03',
  april: '04', mai: '05', juni: '06', juli: '07',
  august: '08', september: '09', oktober: '10',
  november: '11', dezember: '12',
  jan: '01', feb: '02', mär: '03', mar: '03',
  apr: '04', jun: '06', jul: '07', aug: '08',
  sep: '09', okt: '10', nov: '11', dez: '12',
}

const MONTH_PATTERN = Object.keys(MONTHS).join('|')
const DATE_RE = new RegExp(
  `(\\d{1,2})\\.\\s*(${MONTH_PATTERN})\\.?\\s*(\\d{4})`,
  'i'
)

/** Parse German date strings like "20. April 2026" or "11. Apr 2026" → "2026-04-20" */
function parseGermanDate(str: string): string | null {
  const m = str.toLowerCase().match(DATE_RE)
  if (!m) return null
  const month = MONTHS[m[2].replace(/\.$/, '')]
  if (!month) return null
  return `${m[3]}-${month}-${m[1].padStart(2, '0')}`
}

const WEEKDAYS = new Set(['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'])

/** Parse time range "20:00 – 23:00" → [startTime, endTime] */
function parseTimeRange(str: string): [string?, string?] {
  const m = str.match(/(\d{2}:\d{2})\s*[–\-]\s*(\d{2}:\d{2})/)
  if (m) return [m[1], m[2]]
  const single = str.match(/(\d{2}:\d{2})/)
  if (single) return [single[1], undefined]
  return [undefined, undefined]
}

// ── 1. tanzevents.ch ────────────────────────────────────────────────────────

async function scrapeTanzevents(): Promise<RawEvent[]> {
  const BASE = 'https://www.tanzevents.ch'
  const events: RawEvent[] = []

  // Fetch up to 3 pages (adjust if needed)
  for (let page = 0; page <= 2; page++) {
    try {
      const url = `${BASE}/events.php?read_group=12&page=${page}`
      const res = await fetch(url, { headers: HEADERS })
      if (!res.ok) break
      const html = await res.text()
      const $ = cheerio.load(html)

      const cards = $('.te-event-card')
      if (cards.length === 0) break

      cards.each((_, el) => {
        const $el = $(el)
        const anchor = $el.find('a.te-event-card__link')
        const href = anchor.attr('href') ?? ''
        const fullUrl = href.startsWith('http') ? href : `${BASE}${href}`

        const dateStr = $el.find('.te-event-card__date').text().trim()
        // Format: "Sa, 11. Apr 2026"
        const dateMatch = dateStr.match(/(\d{1,2}\.\s*\w+\.?\s*\d{4})/)
        const startDate = dateMatch ? parseGermanDate(dateMatch[1]) : null
        if (!startDate) return

        const timeStr = $el.find('.te-event-card__time').text().trim()
        const [startTime] = parseTimeRange(timeStr)

        const title = $el.find('.te-event-card__title').text().trim() || 'Tanzveranstaltung'

        // Location: city zuerst aus subtitle, sonst aus loc-Adresse extrahieren
        const cityRaw = $el.find('.te-event-card__lead .subtitle').text().trim()
        const locRaw = $el.find('.te-event-card__loc').text().replace(/\[.*?\]/g, '').replace('📍', '').trim()
        const city = sanitizeCity(cityRaw) ?? extractCity(locRaw)
        if (!city) return  // weder subtitle noch loc liefern eine saubere Stadt
        const location = locRaw || city

        events.push({
          id: stableId('tanzevents', title, startDate),
          title,
          startDate,
          startTime,
          location,
          city,
          category: CATEGORY,
          url: fullUrl,
          source: 'scraper',
        })
      })
    } catch (e) {
      console.error(`tanzevents.ch page ${page} error:`, e)
      break
    }
  }

  return events
}

// ── 2. muevete.ch/salsaparties ──────────────────────────────────────────────

async function scrapeMuevete(): Promise<RawEvent[]> {
  try {
    const res = await fetch('https://www.muevete.ch/salsaparties/', { headers: HEADERS })
    if (!res.ok) return []
    const html = await res.text()
    const $ = cheerio.load(html)
    const events: RawEvent[] = []

    // The page is plain text blocks — extract all text, parse line by line
    const bodyText = $('body').text()
    const lines = bodyText.split('\n').map((l) => l.trim()).filter(Boolean)

    for (const line of lines) {
      // Pattern: "Event Name [– Location] DD. Month [YYYY] HH:MM – HH:MM"
      const dateMatch = line.match(
        /(\d{1,2}\.\s*(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)(?:\s*\d{4})?)/i
      )
      if (!dateMatch) continue

      const rawDate = dateMatch[1].includes('202')
        ? dateMatch[1]
        : dateMatch[1] + ' 2026'
      const startDate = parseGermanDate(rawDate)
      if (!startDate) continue

      // Everything before the date = title + location
      const before = line.slice(0, dateMatch.index).trim().replace(/\s+/g, ' ')
      const parts = before.split(/\s+–\s+/)
      const title = parts[0]?.trim() || 'Salsa Party'
      const rawLocation = parts[1]?.trim() || ''
      // Filter weekday names that bleed in from date context
      const location = WEEKDAYS.has(rawLocation.toLowerCase()) ? 'Bern' : rawLocation || 'Bern'

      const [startTime, endTime] = parseTimeRange(line.slice((dateMatch.index ?? 0) + dateMatch[0].length))

      if (!title) continue

      const muveteCity = extractCity(location)
      if (!muveteCity) continue
      events.push({
        id: stableId('muevete', title, startDate),
        title,
        startDate,
        startTime,
        endTime,
        location,
        city: muveteCity,
        category: CATEGORY,
        url: 'https://www.muevete.ch/salsaparties/',
        source: 'scraper',
      })
    }

    return events
  } catch (e) {
    console.error('muevete.ch error:', e)
    return []
  }
}

// ── 3. latinpromotion.ch/salsa-kalender ────────────────────────────────────

async function scrapeLatinPromotion(): Promise<RawEvent[]> {
  try {
    const res = await fetch('https://www.latinpromotion.ch/salsa-kalender/', { headers: HEADERS })
    if (!res.ok) return []
    const html = await res.text()
    const $ = cheerio.load(html)
    const events: RawEvent[] = []

    // Events are <a> tags containing date + title + location
    $('a').each((_, el) => {
      const $el = $(el)
      const text = $el.text().replace(/\s+/g, ' ').trim()
      const href = $el.attr('href') ?? ''

      const dateMatch = text.match(
        /(\d{1,2}\.\s*(?:Jan|Feb|Mär|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Dez)[a-z]*\.?\s*\d{4})/i
      )
      if (!dateMatch) return

      const startDate = parseGermanDate(dateMatch[1])
      if (!startDate) return

      // Title: bold text preferred; fallback = text after date, stripped of weekdays
      const titleEl = $el.find('strong, b').first()
      const rawTitle = titleEl.length
        ? titleEl.text().trim()
        : text.replace(dateMatch[0], '').split(/[,/]/)[0].trim()
      // Remove leading weekday names ("Freitag  Salsa im Dukes" → "Salsa im Dukes")
      const title = rawTitle
        .replace(/^(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)\s+/i, '')
        .trim()

      if (!title || title.length < 3) return

      // Location: address-like fragment after title, skip weekday fragments
      const afterDate = text.replace(dateMatch[0], '').replace(title, '').replace(/^\s*\/\s*/, '').trim()
      const locRaw = afterDate.split(/[/\n]/)[0].trim()
      if (!locRaw || WEEKDAYS.has(locRaw.toLowerCase())) return  // keine saubere Location → Event verwerfen
      const location = locRaw

      const lpCity = extractCity(location)
      if (!lpCity) return  // kein Komma-Segment liefert eine saubere Stadt

      // URL: skip placeholder hrefs like "http://"
      const isValidHref = href && href.startsWith('http') && href.replace(/https?:\/\//, '').length > 2
      const url = isValidHref
        ? href
        : href && href.startsWith('/') && href.length > 1
          ? `https://www.latinpromotion.ch${href}`
          : 'https://www.latinpromotion.ch/salsa-kalender/'

      events.push({
        id: stableId('latinpromotion', title, startDate),
        title,
        startDate,
        location,
        city: lpCity,
        category: CATEGORY,
        url,
        source: 'scraper',
      })
    })

    return events
  } catch (e) {
    console.error('latinpromotion.ch error:', e)
    return []
  }
}

// ── 4. ecstaticdancebern.ch → Google Calendar ICS ──────────────────────────

async function scrapeEcstaticDanceBern(): Promise<RawEvent[]> {
  // Public Google Calendar ICS feed — no API key needed
  const ICS_URL =
    'https://calendar.google.com/calendar/ical/fcc2odqjubobo9ejbaasi841t0%40group.calendar.google.com/public/basic.ics'

  try {
    const res = await fetch(ICS_URL, { headers: HEADERS })
    if (!res.ok) return []
    const ics = await res.text()
    const events: RawEvent[] = []

    // Split into VEVENT blocks
    const blocks = ics.split('BEGIN:VEVENT').slice(1)

    for (const block of blocks) {
      const get = (key: string) => {
        const m = block.match(new RegExp(`^${key}[^:]*:(.+)$`, 'm'))
        return m ? m[1].replace(/\\n/g, ' ').replace(/\\,/g, ',').trim() : ''
      }

      const dtstart = get('DTSTART')
      const summary = get('SUMMARY')
      if (!dtstart || !summary) continue

      // DTSTART can be DATE (20260419) or DATETIME (20260419T200000Z)
      const dateStr = dtstart.slice(0, 8)
      const startDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`

      let startTime: string | undefined
      if (dtstart.includes('T')) {
        const timePart = dtstart.slice(9, 13) // "2000" from "20260419T200000Z"
        startTime = `${timePart.slice(0, 2)}:${timePart.slice(2, 4)}`
      }

      const dtend = get('DTEND')
      let endTime: string | undefined
      if (dtend?.includes('T')) {
        const tp = dtend.slice(9, 13)
        endTime = `${tp.slice(0, 2)}:${tp.slice(2, 4)}`
      }

      const location = get('LOCATION') || 'Dance Complex, Vidmarhallen 3, Liebefeld'
      const description = get('DESCRIPTION')
      const url = get('URL') || 'https://www.ecstaticdancebern.ch'

      events.push({
        id: stableId('ecstaticdance', summary, startDate),
        title: summary,
        startDate,
        startTime,
        endTime,
        location,
        city: 'Bern',
        category: CATEGORY,
        description: description || undefined,
        url,
        source: 'scraper',
      })
    }

    return events
  } catch (e) {
    console.error('ecstaticdancebern.ch (ICS) error:', e)
    return []
  }
}

// ── 5. forroaare.ch ─────────────────────────────────────────────────────────

async function scrapeForroAare(): Promise<RawEvent[]> {
  try {
    const res = await fetch('https://www.forroaare.ch', { headers: HEADERS })
    if (!res.ok) {
      console.warn(`forroaare.ch: HTTP ${res.status} — skipping`)
      return []
    }
    const html = await res.text()
    const $ = cheerio.load(html)
    const events: RawEvent[] = []

    // Try common event containers
    const candidates = $('[class*="event"], [class*="termin"], [class*="date"], article, .entry')
    candidates.each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim()
      const dateMatch = text.match(
        /(\d{1,2}\.\s*(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s*\d{4})/i
      )
      if (!dateMatch) return
      const startDate = parseGermanDate(dateMatch[1])
      if (!startDate) return

      const title = text.slice(0, dateMatch.index).trim() || 'Forró Event'
      const [startTime, endTime] = parseTimeRange(text.slice((dateMatch.index ?? 0) + dateMatch[0].length))

      events.push({
        id: stableId('forroaare', title, startDate),
        title,
        startDate,
        startTime,
        endTime,
        location: 'Bern / Aare Region',
        city: 'Bern',
        category: CATEGORY,
        url: 'https://www.forroaare.ch',
        source: 'scraper',
      })
    })

    return events
  } catch (e) {
    console.error('forroaare.ch error:', e)
    return []
  }
}

// ── 6. Planlos Impro Bern ────────────────────────────────────────────────────

async function scrapePlanlos(): Promise<RawEvent[]> {
  try {
    const res = await fetch('https://www.planlos.be/programm', { headers: HEADERS })
    if (!res.ok) return []
    const html = await res.text()
    const $ = cheerio.load(html)
    const events: RawEvent[] = []

    // Each event: <h3>Donnerstag 23.04.2026 um 20:00 Uhr</h3>
    //             <am-img>...<figcaption>Location</figcaption>...</am-img>
    //             <h4><a href="URL">Infos und Tickets</a></h4>
    $('h3').each((_, el) => {
      const h3Text = $(el).text().trim()
      // Match: "Donnerstag 23.04.2026 um 20:00 Uhr"
      const m = h3Text.match(/(\d{2})\.(\d{2})\.(\d{4})\s+um\s+(\d{2}:\d{2})/)
      if (!m) return

      const startDate = `${m[3]}-${m[2]}-${m[1]}`
      const startTime = m[4]

      // Siblings after this h3 until next h2/h3/hr
      const location = $(el).nextUntil('h2, h3, hr').find('figcaption').first().text().trim()
        || 'ONO, Kramgasse 6, 3011 Bern'
      const href = $(el).nextUntil('h2, h3, hr').find('a').first().attr('href') ?? 'https://www.planlos.be/programm'
      const url = href.startsWith('http') ? href : `https://www.planlos.be${href}`

      events.push({
        id: stableId('planlos', startDate, startTime),
        title: 'Planlos Impro Theater',
        startDate,
        startTime,
        location,
        city: 'Bern',
        category: CATEGORY,
        url,
        source: 'scraper',
      })
    })

    return events
  } catch (e) {
    console.error('planlos.be error:', e)
    return []
  }
}

// ── DanceApp.ch ─────────────────────────────────────────────────────────────
// danceapp.ch/events.php — SSR, .event-card-link containers

const DANCEAPP_MONTH: Record<string, number> = {
  jan: 1, feb: 2, mär: 3, mar: 3, apr: 4, mai: 5, may: 5,
  jun: 6, jul: 7, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, dez: 12, dec: 12,
}

function danceappDate(day: number, month: number): string {
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const year = month < currentMonth ? now.getFullYear() + 1 : now.getFullYear()
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

async function scrapeDanceApp(): Promise<RawEvent[]> {
  try {
    const res = await fetch('https://danceapp.ch/events.php', { headers: HEADERS })
    if (!res.ok) return []
    const html = await res.text()
    const $ = cheerio.load(html)
    const events: RawEvent[] = []

    $('a.event-card-link').each((_, el) => {
      const $el = $(el)
      const href = $el.attr('href') ?? ''
      const url = href.startsWith('http') ? href : `https://danceapp.ch${href}`

      // City: prefer data attribute, fallback to 📍 meta text
      let city = $el.find('.event-card').attr('data-location-city') ?? ''
      if (!city) {
        const metaText = $el.find('.event-meta-item').first().text().replace('📍', '').trim()
        city = metaText || ''
      }
      // Erstes ' - '-Segment behalten ("Pfäffikon ZH - Bar XY" → "Pfäffikon ZH"),
      // dann sanitizeCity übernimmt PLZ + Kanton.
      city = city.split(' - ')[0].trim()

      const dayStr = $el.find('.event-date-day').first().text().trim()
      const monthStr = $el.find('.event-date-month').first().text().trim().toLowerCase().slice(0, 3)
      const day = parseInt(dayStr)
      const month = DANCEAPP_MONTH[monthStr]
      if (!day || !month) return

      const startDate = danceappDate(day, month)

      // End date: ".event-date-range-hint" contains "bis DD. Mon"
      let endDate: string | undefined
      const rangeText = $el.find('.event-date-range-hint').text().trim()
      const rangeMatch = rangeText.match(/(\d{1,2})\.\s*(\w{3})/i)
      if (rangeMatch) {
        const endDay = parseInt(rangeMatch[1])
        const endMonth = DANCEAPP_MONTH[rangeMatch[2].toLowerCase().slice(0, 3)]
        if (endDay && endMonth) endDate = danceappDate(endDay, endMonth)
      }

      // Start time from datetime meta
      const timeText = $el.find('.event-meta-item--datetime').text()
      const timeMatch = timeText.match(/·\s*(\d{1,2}:\d{2})\s*Uhr/)
      const startTime = timeMatch ? timeMatch[1] : undefined

      const title = $el.find('.event-info h3').text().trim()
      if (!title) return

      const cleanCity = sanitizeCity(city)
      if (!cleanCity) return  // city unsauber (PLZ, Strasse, Wochentag) → verwerfen
      events.push({
        id: stableId('danceapp', title, startDate),
        title,
        startDate,
        endDate: endDate && endDate !== startDate ? endDate : undefined,
        startTime,
        location: cleanCity,
        city: cleanCity,
        category: CATEGORY,
        url,
        source: 'scraper',
      })
    })

    return events
  } catch (e) {
    console.error('danceapp.ch error:', e)
    return []
  }
}

// ── Roseway Improtheater ─────────────────────────────────────────────────────
// roseway.ch — SSR WordPress, ytp-events widget
// Date format: "30.05.2026 16:00 Uhr"

async function scrapeRoseway(): Promise<RawEvent[]> {
  try {
    const res = await fetch('https://roseway.ch/', { headers: HEADERS })
    if (!res.ok) return []
    const html = await res.text()
    const $ = cheerio.load(html)
    const events: RawEvent[] = []

    $('.ytp-event-row').each((_, el) => {
      const $el = $(el)

      // Title: text of .ytp-event-name minus the nested .ytp-event-type span
      const $name = $el.find('.ytp-event-name')
      $name.find('.ytp-event-type').remove()
      const title = $name.text().trim()
      if (!title) return

      // Date: "30.05.2026 16:00 Uhr"
      const dateText = $el.find('.ytp-event-date').text().trim()
      const dateMatch = dateText.match(/(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}:\d{2}))?/)
      if (!dateMatch) return
      const startDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
      const startTime = dateMatch[4] || undefined

      const cityRaw = $el.find('.ytp-event-city').text().trim()
      const city = sanitizeCity(cityRaw)
      if (!city) return  // roseway ohne sauberen Stadt-Tag verwerfen
      const location = $el.find('.ytp-event-location').text().trim() || city

      // URL: link in the row, fallback to roseway.ch
      const href = $el.find('a').attr('href') ?? 'https://roseway.ch/'
      const url = href.startsWith('http') ? href : `https://roseway.ch${href}`

      events.push({
        id: stableId('roseway', title, startDate),
        title,
        startDate,
        startTime,
        location,
        city,
        category: CATEGORY,
        url,
        source: 'scraper',
      })
    })

    return events
  } catch (e) {
    console.error('roseway.ch error:', e)
    return []
  }
}

// ── Kulturhof Köniz ──────────────────────────────────────────────────────────
// kulturhof.ch — SSR WordPress, .event-block.event
// Date format: "DD/MM/YY" (e.g. "11/04/26")

async function scrapeKulturhof(): Promise<RawEvent[]> {
  try {
    const res = await fetch('https://www.kulturhof.ch/', { headers: HEADERS })
    if (!res.ok) return []
    const html = await res.text()
    const $ = cheerio.load(html)
    const events: RawEvent[] = []

    $('.event-block.event').each((_, el) => {
      const $el = $(el)

      const title = $el.find('.event-block-title a').text().trim()
      if (!title || title.startsWith('ABGESAGT')) return

      const dateStr = $el.find('.event-date').text().trim() // "11/04/26"
      const dateMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{2})/)
      if (!dateMatch) return
      const day = dateMatch[1]
      const month = dateMatch[2]
      const yy = parseInt(dateMatch[3])
      const year = yy < 50 ? 2000 + yy : 1900 + yy
      const startDate = `${year}-${month}-${day}`

      const startTime = $el.find('.event-time').text().trim() || undefined

      const href = $el.find('a.kulturhof_image, .event-block-title a').first().attr('href') ?? ''
      const url = href || 'https://www.kulturhof.ch/'

      events.push({
        id: stableId('kulturhof', title, startDate),
        title,
        startDate,
        startTime,
        location: 'Kulturhof Köniz',
        city: 'Köniz',
        category: CATEGORY,
        url,
        source: 'scraper',
      })
    })

    return events
  } catch (e) {
    console.error('kulturhof.ch error:', e)
    return []
  }
}

// ── Scraper-Registrierung ────────────────────────────────────────────────────

export const tanzeventsScraper: Scraper = {
  id: 'tanzevents',
  name: 'Tanzevents.ch',
  category: CATEGORY,
  country: 'CH',
  run: scrapeTanzevents,
}

export const mueveteScraper: Scraper = {
  id: 'muevete',
  name: 'Muévete Salsaparties Bern',
  category: CATEGORY,
  country: 'CH',
  run: scrapeMuevete,
}

export const latinPromotionScraper: Scraper = {
  id: 'latinpromotion',
  name: 'Latin Promotion Salsa-Kalender',
  category: CATEGORY,
  country: 'CH',
  run: scrapeLatinPromotion,
}

export const ecstaticDanceBernScraper: Scraper = {
  id: 'ecstaticdancebern',
  name: 'Ecstatic Dance Bern',
  category: CATEGORY,
  country: 'CH',
  run: scrapeEcstaticDanceBern,
}

export const forroAareScraper: Scraper = {
  id: 'forroaare',
  name: 'Forró Aare',
  category: CATEGORY,
  country: 'CH',
  run: scrapeForroAare,
}

export const planlosScraper: Scraper = {
  id: 'planlos',
  name: 'Planlos Impro Theater Bern',
  category: CATEGORY,
  country: 'CH',
  run: scrapePlanlos,
}

export const danceAppScraper: Scraper = {
  id: 'danceapp',
  name: 'DanceApp.ch',
  category: CATEGORY,
  country: 'CH',
  run: scrapeDanceApp,
}

export const rosewayScraper: Scraper = {
  id: 'roseway',
  name: 'Roseway Improtheater',
  category: CATEGORY,
  country: 'CH',
  run: scrapeRoseway,
}

export const kulturhofScraper: Scraper = {
  id: 'kulturhof',
  name: 'Kulturhof Köniz',
  category: CATEGORY,
  country: 'CH',
  run: scrapeKulturhof,
}
