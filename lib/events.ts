import { EventSchema, type Event } from './types'
import { getContinent, type Continent } from './geo'
import scrapedEvents from '@/data/scraped-events.json'

// Bewusst KEIN Import von manual-events.json:
// Manuell gepflegte Anlässe driften (Datum/Ort/Existenz ändert sich, Pflege wird vergessen).
// Sie werden im Dashboard nicht angezeigt, bis ein Scraper/API sie automatisch abdeckt.
// Die Datei bleibt als Backup, wird aber nicht geladen.

export interface GeoFilter {
  continents: Continent[]
  countries: string[]
  cities: string[]
}

export type RangeFilter = 'week' | 'month' | '3months' | 'all'
export type DurationFilter = 'single' | 'multi' | 'all'

export interface DashboardFilter extends GeoFilter {
  range: RangeFilter
  duration: DurationFilter
  categories: string[]
}

export const EMPTY_FILTER: DashboardFilter = {
  continents: [],
  countries: [],
  cities: [],
  range: 'all',
  duration: 'all',
  categories: [],
}

export function parseFilter(
  searchParams: { [k: string]: string | string[] | undefined } | undefined
): DashboardFilter {
  if (!searchParams) return EMPTY_FILTER
  const split = (key: string): string[] => {
    const v = searchParams[key]
    if (typeof v !== 'string') return []
    return v.split(',').map((s) => s.trim()).filter(Boolean)
  }
  const one = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
    const v = searchParams[key]
    if (typeof v !== 'string') return fallback
    return (allowed as readonly string[]).includes(v) ? (v as T) : fallback
  }
  return {
    continents: split('continent') as Continent[],
    countries: split('country'),
    cities: split('city'),
    range: one('range', ['week', 'month', '3months', 'all'] as const, 'all'),
    duration: one('duration', ['single', 'multi', 'all'] as const, 'all'),
    categories: split('cat'),
  }
}

function isMultiDay(e: Event): boolean {
  return !!e.endDate && e.endDate !== e.startDate
}

function inRange(e: Event, range: RangeFilter): boolean {
  if (range === 'all') return true
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const limit = new Date(today)
  if (range === 'week') limit.setDate(limit.getDate() + 7)
  else if (range === 'month') limit.setDate(limit.getDate() + 31)
  else if (range === '3months') limit.setDate(limit.getDate() + 92)
  const start = new Date(e.startDate)
  return start <= limit
}

export function applyFilter(events: Event[], filter: DashboardFilter): Event[] {
  const { continents, countries, cities, range, duration, categories } = filter
  if (
    !continents.length && !countries.length && !cities.length &&
    !categories.length && range === 'all' && duration === 'all'
  ) {
    return events
  }
  return events.filter((e) => {
    if (categories.length && !categories.includes(e.category)) return false
    if (continents.length) {
      const c = getContinent(e.country)
      if (!c || !continents.includes(c)) return false
    }
    if (countries.length && !countries.includes(e.country)) return false
    if (cities.length && !cities.includes(e.city)) return false
    if (!inRange(e, range)) return false
    if (duration === 'single' && isMultiDay(e)) return false
    if (duration === 'multi' && !isMultiDay(e)) return false
    return true
  })
}


export interface GeoFacets {
  continents: Array<{ value: Continent; count: number }>
  countries: Array<{ value: string; count: number }>
  cities: Array<{ value: string; count: number }>
}

export function geoFacets(events: Event[]): GeoFacets {
  const continents = new Map<Continent, number>()
  const countries = new Map<string, number>()
  const cities = new Map<string, number>()
  for (const e of events) {
    const c = getContinent(e.country)
    if (c) continents.set(c, (continents.get(c) ?? 0) + 1)
    countries.set(e.country, (countries.get(e.country) ?? 0) + 1)
    cities.set(e.city, (cities.get(e.city) ?? 0) + 1)
  }
  const sortByCount = <V>(m: Map<V, number>): Array<{ value: V; count: number }> =>
    Array.from(m.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || String(a.value).localeCompare(String(b.value)))
  return {
    continents: sortByCount(continents),
    countries: sortByCount(countries),
    cities: sortByCount(cities),
  }
}

// Validiert eine JSON-Quelle gegen das EventSchema. Ungültige Events werden
// verworfen und im Server-Log gezählt — damit driftende Quellen sichtbar werden,
// statt unbemerkt ins Dashboard zu fliessen.
function validateSource(raw: unknown[], sourceName: string): Event[] {
  const valid: Event[] = []
  const rejects: string[] = []
  for (const candidate of raw) {
    const result = EventSchema.safeParse(candidate)
    if (result.success) {
      valid.push(result.data)
    } else {
      const id = (candidate as { id?: unknown })?.id ?? '<no-id>'
      const reason = result.error.issues
        .map((i) => `${i.path.join('.')} ${i.message}`)
        .join('; ')
      rejects.push(`${id}: ${reason}`)
    }
  }
  if (rejects.length > 0) {
    console.warn(`[${sourceName}] ${rejects.length}/${raw.length} events rejected by schema`)
    for (const r of rejects.slice(0, 10)) console.warn(`  ✗ ${r}`)
    if (rejects.length > 10) console.warn(`  ... ${rejects.length - 10} more`)
  }
  return valid
}

// Returns only future events, sorted by startDate
export function getFutureEvents(events: Event[]): Event[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return events
    .filter((e) => new Date(e.startDate) >= today)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
}

export function isWithinDays(dateStr: string, days: number): boolean {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff <= days
}

export function formatDateRange(
  startDate: string,
  endDate?: string,
  startTime?: string,
  endTime?: string
): string {
  const start = new Date(startDate)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }

  let dateStr: string
  if (!endDate) {
    dateStr = start.toLocaleDateString('de-CH', opts)
  } else {
    const end = new Date(endDate)
    if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
      dateStr = `${start.getDate()}–${end.getDate()}. ${start.toLocaleDateString('de-CH', { month: 'short', year: 'numeric' })}`
    } else {
      dateStr = `${start.toLocaleDateString('de-CH', opts)} – ${end.toLocaleDateString('de-CH', opts)}`
    }
  }

  if (startTime) {
    const timeStr = endTime ? `${startTime}–${endTime} Uhr` : `${startTime} Uhr`
    return `${dateStr} · ${timeStr}`
  }

  return dateStr
}

// Main: liefert nur Scraper-/API-Anlässe. Manuell gepflegte sind absichtlich draussen
// (siehe Kommentar oben am Import von scrapedEvents).
export async function getAllEvents(): Promise<Event[]> {
  const all = validateSource(scrapedEvents as unknown[], 'scraped-events.json')
  return getFutureEvents(all)
}

// Returns upcoming events for a specific category
export async function getEventsByCategory(categoryId: string): Promise<Event[]> {
  const all = await getAllEvents()
  return all.filter((e) => e.category === categoryId)
}

// Generate an ICS string for a single event
export function generateICS(event: Event): string {
  const uid = `${event.id}@event-dashboard`
  const dtstart = event.startDate.replace(/-/g, '')
  const dtend = event.endDate ? event.endDate.replace(/-/g, '') : dtstart
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

  const escape = (s: string) => s.replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Event Dashboard//DE',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${dtstart}`,
    `DTEND;VALUE=DATE:${dtend}`,
    `SUMMARY:${escape(event.title)}`,
    event.description ? `DESCRIPTION:${escape(event.description)}` : '',
    `LOCATION:${escape(event.location)}`,
    event.url ? `URL:${event.url}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n')
}
