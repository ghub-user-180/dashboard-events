import Link from 'next/link'
import { getAllEvents, isWithinDays, formatDateRange } from '@/lib/events'
import { CATEGORIES, getCategoryById } from '@/lib/categories'
import type { Event } from '@/lib/types'

export const revalidate = 86400

interface PageProps {
  searchParams: { view?: string }
}

export default async function PreviewPage({ searchParams }: PageProps) {
  const view = searchParams.view === 'b' ? 'b' : searchParams.view === 'c' ? 'c' : 'a'
  const all = await getAllEvents()

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-800">← Dashboard</Link>
        <span className="text-gray-300">|</span>
        <span className="text-sm font-medium text-gray-700">Preview:</span>
        <VariantTab id="a" label="A — Zeitleiste" current={view} />
        <VariantTab id="b" label="B — Hybrid" current={view} />
        <VariantTab id="c" label="C — Tiles v2" current={view} />
      </div>
      <div className="mb-6 text-xs text-gray-400 italic">Quick&amp;dirty Prototyp. Filter sind noch nicht angebunden, Styling ist provisorisch. Es geht nur ums Layout-Konzept.</div>

      {view === 'a' && <ZeitleisteView events={all} />}
      {view === 'b' && <HybridView events={all} />}
      {view === 'c' && <TilesV2View events={all} />}
    </div>
  )
}

function VariantTab({ id, label, current }: { id: string; label: string; current: string }) {
  const active = id === current
  return (
    <Link
      href={`/preview?view=${id}`}
      className={`text-xs px-3 py-1 rounded-full border transition ${
        active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
      }`}
    >
      {label}
    </Link>
  )
}

// ── Helper: Kategorie-Farbe ─────────────────────────────────────────────────

const CAT_COLOR: Record<string, string> = {
  'buehne-konzerte': 'bg-rose-100 text-rose-700',
  tanz: 'bg-fuchsia-100 text-fuchsia-700',
  'singles-dating': 'bg-pink-100 text-pink-700',
  begegnungen: 'bg-emerald-100 text-emerald-700',
  sport: 'bg-sky-100 text-sky-700',
  konferenzen: 'bg-amber-100 text-amber-700',
  festivals: 'bg-orange-100 text-orange-700',
  'retreats-austausch': 'bg-teal-100 text-teal-700',
}

const CAT_SHORT_LABEL: Record<string, string> = {
  'buehne-konzerte': 'Bühne',
  tanz: 'Tanz',
  'singles-dating': 'Dating',
  begegnungen: 'Begegnung',
  sport: 'Sport',
  konferenzen: 'Konferenz',
  festivals: 'Festival',
  'retreats-austausch': 'Retreat',
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

// ── Variante A: Zeitleiste ──────────────────────────────────────────────────
// Alle Anlässe chronologisch in einer Liste, Datum als Trenner, Kategorie als Tag.

function ZeitleisteView({ events }: { events: Event[] }) {
  // Gruppieren nach startDate
  const byDate = new Map<string, Event[]>()
  for (const e of events.slice(0, 80)) {
    if (!byDate.has(e.startDate)) byDate.set(e.startDate, [])
    byDate.get(e.startDate)!.push(e)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Anlässe</h1>
      <p className="text-sm text-gray-500 mb-6">Chronologisch — was als nächstes kommt</p>
      <div className="space-y-4">
        {Array.from(byDate.entries()).map(([date, dateEvents]) => (
          <div key={date}>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 sticky top-0 bg-gray-50 py-1">
              {new Date(date).toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
              <span className="ml-2 text-gray-300 font-normal">({dateEvents.length})</span>
            </div>
            <ul className="space-y-1.5">
              {dateEvents.map((e) => (
                <li key={e.id} className="flex items-center gap-3 text-sm hover:bg-white rounded px-2 py-1">
                  <span className="text-xs text-gray-400 w-12 shrink-0">
                    {e.startTime ?? '—'}
                  </span>
                  <CatTag category={e.category} />
                  <span className="font-medium text-gray-800 truncate flex-1">{e.title}</span>
                  <span className="text-xs text-gray-400">{e.city}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Variante B: Hybrid (Chip-Filter + Liste) ────────────────────────────────
// Kategorie-Chips als Filter (statt Tiles), darunter Event-Liste.

function HybridView({ events }: { events: Event[] }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Anlässe</h1>
      <p className="text-sm text-gray-500 mb-5">Dichte Tabellen-Liste — eine Zeile pro Anlass</p>

      <div className="flex flex-wrap gap-2 mb-6">
        <button className="text-xs px-3 py-1.5 rounded-full bg-gray-900 text-white">
          Alle ({events.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = events.filter((e) => e.category === cat.id).length
          if (count === 0) return null
          return (
            <button
              key={cat.id}
              className="text-xs px-3 py-1.5 rounded-full bg-white border border-gray-200 hover:border-gray-400 text-gray-700"
            >
              {cat.icon} {cat.label} <span className="text-gray-400 ml-1">{count}</span>
            </button>
          )
        })}
      </div>

      <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
        {(() => {
          // Venue = erstes Segment vor dem ersten Komma der location. city ist
          // schon im Scraper sanitisiert. Strassen-artige venues (mit Hausnummer)
          // werden hier ausgeblendet.
          const venueOf = (location: string, city: string): string => {
            const first = location.split(',')[0].trim()
            if (!first) return ''
            if (first.toLowerCase() === city.toLowerCase()) return ''
            if (/\d/.test(first)) return ''  // wenn Hausnummer drin → Adresse, nicht Lokalität
            return first
          }

          const slice = events.slice(0, 120)
          const rows: React.ReactNode[] = []
          let lastMonthKey = ''
          for (const e of slice) {
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
            const city = e.city
            const venue = venueOf(e.location, city)
            rows.push(
              <div
                key={e.id}
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
                <span className="shrink-0">
                  <CatTag category={e.category} />
                </span>
                <span className="font-medium text-gray-800 truncate flex-1 min-w-0" title={e.title}>{e.title}</span>
                <span className="text-xs text-gray-500 shrink-0 w-40 truncate" title={venue || '—'}>{venue}</span>
                <span className="text-xs text-gray-400 shrink-0 w-24 truncate" title={city}>{city}</span>
              </div>
            )
          }
          return rows
        })()}
      </div>
    </div>
  )
}

// ── Variante C: Verbesserte Tiles ───────────────────────────────────────────
// Tiles wie heute, aber Grösse spiegelt Aktivität (große Kategorie = grosse Tile).

function TilesV2View({ events }: { events: Event[] }) {
  const catData = CATEGORIES.map((cat) => {
    const catEvents = events.filter((e) => e.category === cat.id)
    return { cat, events: catEvents, count: catEvents.length }
  }).sort((a, b) => b.count - a.count)

  const max = Math.max(...catData.map((d) => d.count), 1)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Anlässe</h1>
      <p className="text-sm text-gray-500 mb-6">Kategoriegrösse spiegelt Anzahl bevorstehender Anlässe</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-min">
        {catData.map(({ cat, events: ev, count }) => {
          const ratio = count / max
          const span = ratio > 0.5 ? 'sm:col-span-2 lg:row-span-2' : ''
          const preview = ev.slice(0, ratio > 0.5 ? 6 : 3)
          const hasSoon = ev.some((e) => isWithinDays(e.startDate, 7))
          return (
            <Link
              key={cat.id}
              href={`/${cat.id}`}
              className={`block bg-white border rounded-xl p-4 hover:shadow-md transition ${
                hasSoon ? 'border-amber-400' : 'border-gray-200'
              } ${span}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{cat.icon}</span>
                <h2 className="font-semibold text-gray-900">{cat.label}</h2>
                <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {count}
                </span>
              </div>
              {count === 0 ? (
                <p className="text-xs text-gray-400 italic">Keine Anlässe geplant</p>
              ) : (
                <ul className="space-y-1.5">
                  {preview.map((e) => (
                    <li key={e.id} className="text-xs">
                      <div className="flex items-baseline gap-2">
                        <span className="text-gray-400 shrink-0">
                          {new Date(e.startDate).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })}
                        </span>
                        <span className={`truncate ${isWithinDays(e.startDate, 7) ? 'text-amber-700 font-medium' : 'text-gray-700'}`}>
                          {e.title}
                        </span>
                      </div>
                      {e.city && <div className="text-[10px] text-gray-400 ml-12">{e.city}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
