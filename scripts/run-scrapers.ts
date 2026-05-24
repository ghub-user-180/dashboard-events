import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { EventSchema, type Event } from '../lib/types'
import { scrapers } from '../scrapers'

const OUT_PATH = join(process.cwd(), 'data', 'scraped-events.json')

function loadPrevious(): Event[] {
  try {
    const raw = readFileSync(OUT_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Event[]) : []
  } catch {
    return []
  }
}

function groupByScraper(events: Event[]): Map<string, Event[]> {
  const map = new Map<string, Event[]>()
  let orphans = 0
  for (const e of events) {
    if (!e.scraperId) {
      orphans++
      continue  // Events ohne scraperId sind Restposten aus altem Code — verwerfen
    }
    if (!map.has(e.scraperId)) map.set(e.scraperId, [])
    map.get(e.scraperId)!.push(e)
  }
  if (orphans > 0) console.warn(`Dropped ${orphans} events without scraperId from previous run`)
  return map
}

async function main() {
  const previous = loadPrevious()
  const previousByScraper = groupByScraper(previous)

  const finalByScraper = new Map<string, Event[]>()
  let totalOk = 0
  let totalRejected = 0
  const failed: string[] = []
  const stale: string[] = []

  // Sequentiell — Scraper sind I/O-bound, das hält Logs lesbar.
  for (const scraper of scrapers) {
    const tag = `[${scraper.id.padEnd(20)}]`
    try {
      const raw = await scraper.run()
      const valid: Event[] = []
      const rejectReasons: string[] = []

      for (const r of raw) {
        const candidate = {
          ...r,
          country: r.country ?? scraper.country,
          category: r.category ?? scraper.category,
          scraperId: scraper.id,
        }
        const result = EventSchema.safeParse(candidate)
        if (result.success) {
          valid.push(result.data)
        } else {
          const reason = result.error.issues.map(i => `${i.path.join('.')} ${i.message}`).join('; ')
          rejectReasons.push(`${r.id ?? '<no-id>'}: ${reason}`)
        }
      }

      if (valid.length === 0 && previousByScraper.has(scraper.id)) {
        const fallback = previousByScraper.get(scraper.id)!
        finalByScraper.set(scraper.id, fallback)
        stale.push(scraper.id)
        console.log(`${tag} 0 events, keeping ${fallback.length} from previous run`)
      } else {
        finalByScraper.set(scraper.id, valid)
        totalOk += valid.length
        totalRejected += rejectReasons.length
        const rejectNote = rejectReasons.length ? `, ${rejectReasons.length} rejected` : ''
        console.log(`${tag} ${valid.length} ok${rejectNote}`)
        for (const r of rejectReasons.slice(0, 5)) console.log(`${tag}   ✗ ${r}`)
        if (rejectReasons.length > 5) console.log(`${tag}   ... ${rejectReasons.length - 5} more`)
      }
    } catch (err) {
      failed.push(scraper.id)
      const fallback = previousByScraper.get(scraper.id) ?? []
      finalByScraper.set(scraper.id, fallback)
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`${tag} FAILED: ${msg}; keeping ${fallback.length} from previous run`)
    }
  }

  const all = Array.from(finalByScraper.values()).flat()

  // Vergangenheits-Filter macht jetzt das Frontend (getFutureEvents), nicht hier —
  // sonst gehen Events verloren, die der Runner zwar geladen hat, aber heute noch
  // brauchbar wären (z.B. ein mehrtägiges Event, das morgen erst startet).
  writeFileSync(OUT_PATH, JSON.stringify(all, null, 2) + '\n', 'utf8')

  console.log('')
  console.log(`SUMMARY: ${totalOk} ok / ${totalRejected} rejected / ${failed.length} failed / ${stale.length} stale`)
  if (failed.length) console.log(`Failed scrapers (last-known kept): ${failed.join(', ')}`)
  if (stale.length) console.log(`Stale scrapers (0 events, last-known kept): ${stale.join(', ')}`)
  console.log(`Wrote ${all.length} events to ${OUT_PATH}`)
}

main().catch((err) => {
  console.error('run-scrapers.ts fatal error:', err)
  process.exit(1)
})
