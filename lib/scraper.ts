import type { Event, CategoryId } from './types'

// Was ein Scraper zurückgibt. country und category dürfen fehlen — der Runner
// füllt sie aus dem Scraper-Default ein. Andere Pflichtfelder (id, title,
// startDate, location, city, source) muss der Scraper liefern; fehlende
// Felder werden vom Schema-Validator gefangen.
export type RawEvent = Omit<Event, 'country' | 'category'> & {
  country?: string
  category?: CategoryId
}

export interface Scraper {
  id: string                  // stabile Kennung, z.B. 'tanzevents', 'planlos'
  name: string                // human-readable, z.B. 'Tanzevents.ch'
  category: CategoryId        // Default-Kategorie; pro Event übersteuerbar
  country?: string            // Default-Country ISO-2; fehlt wenn pro Event verschieden (z.B. bitvocation)
  run(): Promise<RawEvent[]>
}
