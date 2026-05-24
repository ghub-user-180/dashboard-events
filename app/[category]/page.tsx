import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getEventsByCategory,
  formatDateRange,
  generateICS,
  parseFilter,
  applyFilter,
  geoFacets,
} from '@/lib/events'
import { getCategoryById, CATEGORIES } from '@/lib/categories'
import { Filter } from '@/components/Filter'
import type { Event } from '@/lib/types'

export const revalidate = 86400

export async function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.id }))
}

interface PageProps {
  params: { category: string }
  searchParams: { [k: string]: string | string[] | undefined }
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const cat = getCategoryById(params.category as never)
  if (!cat) notFound()

  const events = await getEventsByCategory(params.category)
  const filter = parseFilter(searchParams)
  const facets = geoFacets(events)
  const filtered = applyFilter(events, filter)

  // Back-Link den Filter mitnehmen, damit Dashboard die Auswahl wiederzeigt
  const qs = new URLSearchParams()
  if (filter.continents.length) qs.set('continent', filter.continents.join(','))
  if (filter.countries.length) qs.set('country', filter.countries.join(','))
  if (filter.cities.length) qs.set('city', filter.cities.join(','))
  if (filter.range !== 'all') qs.set('range', filter.range)
  if (filter.duration !== 'all') qs.set('duration', filter.duration)
  const backHref = qs.toString() ? `/?${qs.toString()}` : '/'

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6">
        ← Zurück zum Dashboard
      </Link>

      <header className="mb-6 flex items-center gap-3">
        <span className="text-4xl">{cat.icon}</span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{cat.label}</h1>
          <p className="text-gray-500 text-sm">{cat.description}</p>
        </div>
      </header>

      <Filter facets={facets} />

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">
            {events.length === 0 ? 'Keine bevorstehenden Anlässe' : 'Keine Anlässe für diesen Filter'}
          </p>
          <p className="text-sm mt-1">
            {events.length === 0
              ? 'Anlässe manuell in `data/manual-events.json` eintragen'
              : `${events.length} weitere Anlässe in dieser Kategorie ohne Filter`}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {filtered.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </ul>
      )}
    </div>
  )
}

function EventCard({ event: e }: { event: Event }) {
  const icsData = encodeURIComponent(generateICS(e))

  return (
    <li className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 leading-snug">
            {e.url ? (
              <a href={e.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition">
                {e.title}
              </a>
            ) : (
              e.title
            )}
            {e.datesApproximate && (
              <span className="ml-2 text-xs text-gray-400 font-normal">(Datum ca.)</span>
            )}
          </h2>

          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-gray-500">
            <span>📅 {formatDateRange(e.startDate, e.endDate, e.startTime, e.endTime)}</span>
            <span>📍 {e.location}</span>
            {e.scraperId === 'luma' && (
              <span className="text-blue-400 text-xs">via Luma</span>
            )}
          </div>

          {e.description && (
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">{e.description}</p>
          )}
        </div>

        <a
          href={`data:text/calendar;charset=utf-8,${icsData}`}
          download={`${e.id}.ics`}
          className="shrink-0 text-xs text-gray-400 hover:text-blue-600 border border-gray-200 hover:border-blue-300 rounded-lg px-2 py-1 transition whitespace-nowrap"
          title="Zum Kalender hinzufügen"
        >
          + Kalender
        </a>
      </div>
    </li>
  )
}
