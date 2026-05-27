import { describe, expect, test } from 'vitest'
import { getContinent, isKnownCountry, normalizeCountry } from '../lib/geo'
import { sanitizeCity } from '../lib/scraper-utils'

describe('sanitizeCity', () => {
  test('passes clean city through', () => {
    expect(sanitizeCity('Bern')).toBe('Bern')
    expect(sanitizeCity('Bad Belzig')).toBe('Bad Belzig')
    expect(sanitizeCity('Colorado Springs')).toBe('Colorado Springs')
  })

  test('strips Swiss postal code', () => {
    expect(sanitizeCity('8400 Winterthur')).toBe('Winterthur')
    expect(sanitizeCity('3011 Bern')).toBe('Bern')
  })

  test('strips Swiss canton suffix', () => {
    expect(sanitizeCity('Wohlen AG')).toBe('Wohlen')
    expect(sanitizeCity('Pfäffikon ZH')).toBe('Pfäffikon')
  })

  test('combines postal code + canton strip', () => {
    expect(sanitizeCity('8330 Pfäffikon ZH')).toBe('Pfäffikon')
  })

  test('takes first comma segment (US state)', () => {
    expect(sanitizeCity('Denver, CO')).toBe('Denver')
    expect(sanitizeCity('Austin, TX')).toBe('Austin')
  })

  test('rejects weekday prefix', () => {
    expect(sanitizeCity('Freitag')).toBe(null)
    expect(sanitizeCity('Sonntag Stierenmarkt')).toBe(null)
  })

  test('rejects street address (with house number)', () => {
    expect(sanitizeCity('Bionstrasse 4 St.Gallen')).toBe(null)
    expect(sanitizeCity('Aarbergergasse 61')).toBe(null)
  })

  test('rejects empty/null/too-long', () => {
    expect(sanitizeCity('')).toBe(null)
    expect(sanitizeCity('  ')).toBe(null)
    expect(sanitizeCity('A'.repeat(50))).toBe(null)
  })

  test('rejects long description-like strings', () => {
    expect(sanitizeCity('Stierenmarkt Areal Zug Partystart mit DJ Giovanni um 16')).toBe(null)
  })
})

describe('getContinent', () => {
  test('maps Swiss code to Europa', () => {
    expect(getContinent('CH')).toBe('Europa')
  })

  test('case-insensitive', () => {
    expect(getContinent('ch')).toBe('Europa')
  })

  test('returns null for unknown', () => {
    expect(getContinent('XX')).toBe(null)
  })

  test('maps US to Nordamerika', () => {
    expect(getContinent('US')).toBe('Nordamerika')
  })

  test('maps BR to Südamerika', () => {
    expect(getContinent('BR')).toBe('Südamerika')
  })
})

describe('isKnownCountry', () => {
  test('known country', () => {
    expect(isKnownCountry('DE')).toBe(true)
  })

  test('unknown country', () => {
    expect(isKnownCountry('ZZ')).toBe(false)
  })
})

describe('normalizeCountry', () => {
  test('passes ISO-2 through (uppercase)', () => {
    expect(normalizeCountry('CH')).toBe('CH')
  })

  test('uppercases lowercase ISO-2', () => {
    expect(normalizeCountry('ch')).toBe('CH')
  })

  test('rejects unknown ISO-2', () => {
    expect(normalizeCountry('XY')).toBe(null)
  })

  test('maps English full name', () => {
    expect(normalizeCountry('Germany')).toBe('DE')
  })

  test('maps German full name', () => {
    expect(normalizeCountry('Deutschland')).toBe('DE')
  })

  test('maps USA variants', () => {
    expect(normalizeCountry('United States')).toBe('US')
    expect(normalizeCountry('USA')).toBe('US')
  })

  test('returns null for unknown full name', () => {
    expect(normalizeCountry('Atlantis')).toBe(null)
  })

  test('trims whitespace', () => {
    expect(normalizeCountry('  CH  ')).toBe('CH')
  })

  test('returns null for empty string', () => {
    expect(normalizeCountry('')).toBe(null)
  })

  test('handles "U.S." with dots', () => {
    expect(normalizeCountry('U.S.')).toBe('US')
  })

  test('handles "U.S.A." with dots', () => {
    expect(normalizeCountry('U.S.A.')).toBe('US')
  })

  test('falls through from invalid ISO-2 to name map (UK → GB)', () => {
    expect(normalizeCountry('UK')).toBe('GB')
  })

  test('handles afrikan countries', () => {
    expect(normalizeCountry('Benin')).toBe('BJ')
    expect(normalizeCountry('Nigeria')).toBe('NG')
    expect(normalizeCountry('Malawi')).toBe('MW')
    expect(normalizeCountry('Honduras')).toBe('HN')
  })
})
