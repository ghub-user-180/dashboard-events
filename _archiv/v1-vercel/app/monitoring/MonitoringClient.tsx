'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Source, Category } from '@/lib/types'

interface HealthResult {
  url: string
  ok: boolean
  statusCode: number
  checkedAt: string
}

interface SourceWithCount extends Source {
  eventsCount: number
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktiv',
  pending: 'Ausstehend',
  draft: 'Entwurf',
  'no-event-relevance': 'Kein Anlass-Bezug',
}

const STATUS_DOT: Record<string, string> = {
  active: 'bg-green-500',
  pending: 'bg-yellow-400',
  draft: 'bg-orange-400',
  'no-event-relevance': 'bg-gray-300',
}

const STATUS_ROW_BG: Record<string, string> = {
  active: '',
  pending: '',
  draft: 'opacity-75',
  'no-event-relevance': 'opacity-60',
}

const TYPE_BADGE: Record<string, string> = {
  api: 'bg-purple-50 text-purple-600',
  scraper: 'bg-blue-50 text-blue-600',
  manual: 'bg-green-50 text-green-700',
  none: '',
}

export default function MonitoringClient({
  sources,
  categories,
}: {
  sources: SourceWithCount[]
  categories: Category[]
}) {
  const [bookmarkCatFilter, setBookmarkCatFilter] = useState<string>('all')
  const [dashboardCatFilter, setDashboardCatFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [healthResults, setHealthResults] = useState<Map<string, HealthResult>>(new Map())
  const [isChecking, setIsChecking] = useState(false)

  // Unique bookmark categories, sorted
  const bookmarkCats = [
    'all',
    ...Array.from(new Set(sources.map((s) => s.bookmarkCategory))).sort(),
  ]

  // Apply filters
  const filtered = sources.filter((s) => {
    if (bookmarkCatFilter !== 'all' && s.bookmarkCategory !== bookmarkCatFilter) return false
    if (dashboardCatFilter === 'null' && s.dashboardCategory !== null) return false
    if (dashboardCatFilter !== 'all' && dashboardCatFilter !== 'null' && s.dashboardCategory !== dashboardCatFilter) return false
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    return true
  })

  const stats = {
    total: sources.length,
    active: sources.filter((s) => s.status === 'active').length,
    pending: sources.filter((s) => s.status === 'pending').length,
    draft: sources.filter((s) => s.status === 'draft').length,
    noEvent: sources.filter((s) => s.status === 'no-event-relevance').length,
  }

  async function handleHealthCheck() {
    setIsChecking(true)
    const urls = filtered.map((s) => s.url)
    try {
      const res = await fetch('/api/health-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      })
      const data = await res.json()
      const newResults = new Map(healthResults)
      for (const r of data.results) {
        newResults.set(r.url, { ...r, checkedAt: data.checkedAt })
      }
      setHealthResults(newResults)
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-2">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Quellen & Bookmarks</h1>
          <p className="text-gray-500 text-sm mt-0.5">Übersicht aller {stats.total} Einträge aus der Bookmark-Sammlung</p>
        </div>
        <button
          onClick={handleHealthCheck}
          disabled={isChecking}
          className="mt-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition whitespace-nowrap"
        >
          {isChecking ? '⏳ Prüfe...' : `🔍 Erreichbarkeit prüfen (${filtered.length})`}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
          <div className="text-xs text-gray-500 mt-0.5">Total</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-green-700">{stats.active}</div>
          <div className="text-xs text-green-600 mt-0.5">● Aktiv</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
          <div className="text-xs text-yellow-600 mt-0.5">○ Ausstehend</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-orange-700">{stats.draft}</div>
          <div className="text-xs text-orange-600 mt-0.5">◐ Entwurf</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-gray-400">{stats.noEvent}</div>
          <div className="text-xs text-gray-400 mt-0.5">– Kein Anlass-Bezug</div>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2 mb-4">
        {/* Status */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-gray-400 w-24 shrink-0">Status</span>
          {(['all', 'active', 'pending', 'draft', 'no-event-relevance'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition ${
                statusFilter === s
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {s === 'all' ? 'Alle' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Dashboard categories */}
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-xs text-gray-400 w-24 shrink-0">Dashboard</span>
          <button
            onClick={() => setDashboardCatFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
              dashboardCatFilter === 'all'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'
            }`}
          >
            Alle
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setDashboardCatFilter(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                dashboardCatFilter === cat.id
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
          <button
            onClick={() => setDashboardCatFilter('null')}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
              dashboardCatFilter === 'null'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'
            }`}
          >
            — Ohne Kategorie
          </button>
        </div>

        {/* Bookmark categories */}
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-xs text-gray-400 w-24 shrink-0">Bookmark</span>
          {bookmarkCats.map((cat) => (
            <button
              key={cat}
              onClick={() => setBookmarkCatFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                bookmarkCatFilter === cat
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'
              }`}
            >
              {cat === 'all' ? 'Alle' : cat}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-3">{filtered.length} Einträge</p>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-2.5 font-medium text-gray-500 w-8"></th>
                <th className="px-4 py-2.5 font-medium text-gray-500">Name & URL</th>
                <th className="px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Bookmark-Kat.</th>
                <th className="px-4 py-2.5 font-medium text-gray-500 hidden lg:table-cell">Dashboard-Kat.</th>
                <th className="px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Typ</th>
                <th className="px-4 py-2.5 font-medium text-gray-500 text-center w-16">Anlässe</th>
                <th className="px-4 py-2.5 font-medium text-gray-500 text-center w-24">HTTP</th>
                <th className="px-4 py-2.5 font-medium text-gray-500 hidden xl:table-cell">Notiz</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((source, i) => {
                const health = healthResults.get(source.url)
                return (
                  <tr
                    key={source.id}
                    className={`border-b border-gray-50 transition hover:bg-blue-50/30 ${
                      STATUS_ROW_BG[source.status]
                    } ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
                  >
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full ${STATUS_DOT[source.status]}`}
                        title={STATUS_LABELS[source.status]}
                      />
                    </td>
                    <td className="px-4 py-2.5 max-w-xs">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-gray-800 hover:text-blue-600 transition leading-snug"
                      >
                        {source.name}
                      </a>
                      <div className="text-xs text-gray-400 truncate">{source.url}</div>
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-xs text-gray-500 whitespace-nowrap">
                      {source.bookmarkCategory}
                    </td>
                    <td className="px-4 py-2.5 hidden lg:table-cell text-xs text-gray-500">
                      {source.dashboardCategory ? (
                        <Link
                          href={`/${source.dashboardCategory}`}
                          className="hover:text-blue-600 transition"
                        >
                          {source.dashboardCategory}
                        </Link>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      {source.type !== 'none' && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded font-medium ${TYPE_BADGE[source.type]}`}
                        >
                          {source.type}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {source.eventsCount > 0 ? (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                          {source.eventsCount}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-200">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {health ? (
                        <span
                          className={`text-xs font-medium ${health.ok ? 'text-green-600' : 'text-red-500'}`}
                        >
                          {health.ok ? `✓ ${health.statusCode}` : `✗ ${health.statusCode || 'timeout'}`}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-200">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 hidden xl:table-cell text-xs text-gray-400 max-w-xs">
                      {source.notes ?? ''}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
