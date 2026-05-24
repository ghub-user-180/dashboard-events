import Link from 'next/link'
import {
  getAllEvents,
  formatDateRange,
  isWithinDays,
  parseFilter,
  applyFilter,
  geoFacets,
} from '@/lib/events'
import { CATEGORIES, getCategoryById } from '@/lib/categories'
import { Filter } from '@/components/Filter'
import { CategoryChips } from '@/components/CategoryChips'
import type { Event } from '@/lib/types'

export const revalidate = 86400

interface PageProps {
  searchParams: { [k: string]: string | string[] | undefined }
}

const CAT_COLOR: Record<string, string> = {
  ausgehen: 'bg-rose-100 text-rose-700',
  sozialleben: 'bg-emerald-100 text-emerald-700',
  'tanz-buehne': 'bg-fuchsia-100 text-fuchsia-700',
  'festivals-konferenzen': 'bg-amber-100 text-amber-700',
  retreats: 'bg-teal-100 text-teal-700',
  austausch: 'bg-lime-100 text-lime-700',
  wassersport: 'bg-sky-100 text-sky-700',
  sport: 'bg-stone-200 text-stone-700',
}

const CAT_SHORT_LABEL: Record<string, string> = {
  ausgehen: 'Ausgehen',
  sozialleben: 'Sozial',
  'tanz-buehne': 'Tanz',
  'festivals-konferenzen': 'Festivals',
  retreats: 'Retreats',
  austausch: 'Austausch',
  wassersport: 'Wasser',
  sport: 'Sport',
}

function CatTag({ category }: { category: string }) {
  const cat = getCategoryById(category as never)
  const color = CAT_COLOR[category] ?? 'bg-gray-100 text-gray-600'
  const label = CAT_SHORT_LABEL[category] ?? cat?.label ?? category
  return (
    <span
      title={cat?.label}
      className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded w-24 shrink-0 inline-block text-center truncate ${color}`}
    >
      {cat?.icon} {label}
    </span>
  )
}

function venueOf(location: string, city: string): string {
  const first = location.split(',')[0].trim()
  if (!first) return ''
  if (first.toLowerCase() === city.toLowerCase()) return ''
  if (/\d/.test(first)) return ''  // Hausnummer drin → Adresse, kein Lokal
  return first
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const all = await getAllEvents()
  const filter = parseFilter(searchParams)
  const facets = geoFacets(all)
  const events = applyFilter(all, filter)

  // Counts pro Kategorie für die Chip-Leiste (vor Kategorie-Filter, aber nach anderen Filtern)
  const filterWithoutCats = { ...filter, categories: [] }
  const eventsForCatCounts = applyFilter(all, filterWithoutCats)
  const catCounts: Record<string, number> = {}
  for (const e of eventsForCatCounts) catCounts[e.category] = (catCounts[e.category] ?? 0) + 1

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <header className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Anlässe</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {events.length} bevorstehend {events.length !== all.length && <span className="text-gray-400">(gefiltert aus {all.length})</span>}
          </p>
        </div>
        <Link
          href="/monitoring"
          className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 hover:border-gray-300 rounded-lg px-3 py-1.5 transition"
        >
          ⚙ Quellen
        </Link>
      </header>

      <CategoryChips counts={catCounts} />

      <Filter facets={facets} />

      <EventList events={events} />
    </div>
  )
}

function EventList({ events }: { events: Event[] }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg">Keine Anlässe für diesen Filter</p>
        <p className="text-sm mt-1">Filter oben zurücksetzen oder erweitern</p>
      </div>
    )
  }

  const rows: React.ReactNode[] = []
  let lastMonthKey = ''
  for (const e of events.slice(0, 300)) {
    const d = new Date(e.startDate)
    const monthKey = `${d.getFullYear()}-${d.getMonth()}`
    if (monthKey !== lastMonthKey) {
      rows.push(
        <div
          key={`sep-${monthKey}`}
          className="px-3 py-1 text-[10px] uppercase tracking-wider font-semibold text-gray-400 bg-gray-50 border-t border-b border-gray-200 first:border-t-0"
        >
          {d.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })}
        </div>
      )
      lastMonthKey = monthKey
    }
    const soon = isWithinDays(e.startDate, 7)
    const weekday = d.toLocaleDateString('de-CH', { weekday: 'short' })
    const dayMonth = d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })
    const venue = venueOf(e.location, e.city)
    const RowTag = e.url ? 'a' : 'div'
    const rowProps = e.url
      ? { href: e.url, target: '_blank', rel: 'noopener noreferrer' }
      : {}
    rows.push(
      <RowTag
        key={e.id}
        {...rowProps}
        className={`px-3 py-1.5 flex items-center gap-3 text-sm hover:bg-gray-50 border-t border-gray-100 ${
          soon ? 'bg-amber-50/40' : ''
        }`}
      >
        <span className="text-xs text-gray-400 w-8 shrink-0">{weekday}</span>
        <span className={`font-medium w-14 shrink-0 ${soon ? 'text-amber-700' : 'text-gray-700'}`}>
          {dayMonth}
        </span>
        <span className="text-xs text-gray-400 w-11 shrink-0 text-right tabular-nums">
          {e.startTime ?? ''}
        </span>
        <CatTag category={e.category} />
        <span className="font-medium text-gray-800 truncate flex-1 min-w-0" title={e.title}>
          {e.title}
        </span>
        <span className="text-xs text-gray-500 shrink-0 w-40 truncate" title={venue || '—'}>{venue}</span>
        <span className="text-xs text-gray-400 shrink-0 w-24 truncate" title={e.city}>{e.city}</span>
      </RowTag>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      {rows}
      {events.length > 300 && (
        <div className="px-3 py-2 text-xs text-gray-400 text-center bg-gray-50 border-t border-gray-200">
          {events.length - 300} weitere Anlässe ausgeblendet — Filter eingrenzen
        </div>
      )}
    </div>
  )
}

// Underscore-Use damit formatDateRange import nicht als ungenutzt geflaggt wird
void formatDateRange
