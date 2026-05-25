import { z } from 'zod'

export const CATEGORY_IDS = [
  'buehne-konzerte',
  'tanz',
  'singles-dating',
  'begegnungen',
  'sport',
  'konferenzen',
  'festivals',
  'retreats-austausch',
] as const

export type CategoryId = typeof CATEGORY_IDS[number]

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expect YYYY-MM-DD')
const isoTime = z.string().regex(/^\d{2}:\d{2}$/, 'expect HH:MM')
const iso2Country = z.string().regex(/^[A-Z]{2}$/, 'expect ISO-3166-1 alpha-2 (uppercase)')

export const EventSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  startDate: isoDate,
  endDate: isoDate.optional(),
  startTime: isoTime.optional(),
  endTime: isoTime.optional(),
  location: z.string().min(1),
  city: z.string().min(1),
  country: iso2Country,
  category: z.enum(CATEGORY_IDS),
  description: z.string().optional(),
  url: z.string().optional(),
  source: z.enum(['manual', 'scraper']),
  scraperId: z.string().min(1).optional(),  // wird vom Runner pro Event gesetzt, fehlt bei manuellen Events
  datesApproximate: z.boolean().optional(),
})

export type Event = z.infer<typeof EventSchema>

export interface Category {
  id: CategoryId
  label: string
  icon: string
  description: string
}

export interface Source {
  id: string
  name: string
  url: string
  bookmarkCategory: string
  dashboardCategory: string | null
  type: 'api' | 'scraper' | 'manual' | 'none'
  // 'draft' = manuell gepflegt, nicht automatisiert, deshalb nicht im Dashboard sichtbar.
  // Drift-Schutz: stale/manuelle Daten fliessen nicht ins Dashboard.
  status: 'active' | 'pending' | 'draft' | 'no-event-relevance'
  notes?: string
}
