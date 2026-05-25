import { describe, expect, test } from 'vitest'
import { scrapers } from '../scrapers'
import sources from '../data/sources.json'
import { CATEGORY_IDS } from '../lib/types'

describe('scrapers ↔ sources.json consistency', () => {
  test('every active scraper-type source has a matching scraper-code id', () => {
    const codeIds = new Set(scrapers.map((s) => s.id))
    const orphans = sources
      .filter((s) => s.type === 'scraper' && s.status === 'active')
      .filter((s) => !codeIds.has(s.id))
      .map((s) => s.id)
    expect(orphans, `sources.json hat type=scraper status=active ohne passenden Scraper-Code: ${orphans.join(', ')}`).toEqual([])
  })

  test('every scraper-code has an active source entry', () => {
    const activeSourceIds = new Set(
      sources.filter((s) => s.status === 'active').map((s) => s.id)
    )
    const missing = scrapers.map((s) => s.id).filter((id) => !activeSourceIds.has(id))
    expect(missing, `Scraper-Code ohne aktiven Source-Eintrag: ${missing.join(', ')}`).toEqual([])
  })

  test('no source has both type=manual and status=active', () => {
    // Manuell gepflegte Quellen dürfen nicht produktiv im Dashboard erscheinen
    const offenders = sources
      .filter((s) => s.type === 'manual' && s.status === 'active')
      .map((s) => s.id)
    expect(offenders, `type=manual Quellen mit status=active gefunden: ${offenders.join(', ')} — sollten 'draft' sein`).toEqual([])
  })

  test('scraper-code ids are unique', () => {
    const ids = scrapers.map((s) => s.id)
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
    expect(dupes).toEqual([])
  })

  test('every scraper has a valid category', () => {
    const validCategories = new Set<string>(CATEGORY_IDS)
    const invalid = scrapers.filter((s) => !validCategories.has(s.category))
    expect(invalid).toEqual([])
  })
})
