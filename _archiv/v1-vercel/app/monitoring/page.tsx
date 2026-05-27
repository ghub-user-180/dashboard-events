import sourcesData from '@/data/sources.json'
import manualEventsData from '@/data/manual-events.json'
import { CATEGORIES } from '@/lib/categories'
import type { Source, Event } from '@/lib/types'
import MonitoringClient from './MonitoringClient'

export default function MonitoringPage() {
  const sources = sourcesData as Source[]
  const events = manualEventsData as Event[]

  // Count events per source URL
  const eventsByUrl = new Map<string, number>()
  for (const event of events) {
    if (event.url) {
      const normalized = event.url.replace(/\/$/, '').toLowerCase()
      eventsByUrl.set(normalized, (eventsByUrl.get(normalized) ?? 0) + 1)
    }
  }

  const sourcesWithCounts = sources
    .map((s) => ({
      ...s,
      eventsCount: eventsByUrl.get(s.url.replace(/\/$/, '').toLowerCase()) ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))

  return <MonitoringClient sources={sourcesWithCounts} categories={CATEGORIES} />
}
