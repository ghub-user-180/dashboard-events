import { describe, expect, test } from 'vitest'
import { EventSchema } from '../lib/types'

const baseEvent = {
  id: 'test-1',
  title: 'Test Event',
  startDate: '2026-10-08',
  location: 'Some Venue',
  city: 'Bern',
  country: 'CH',
  category: 'tanz-buehne' as const,
  source: 'manual' as const,
}

describe('EventSchema', () => {
  test('accepts a minimal valid event', () => {
    const result = EventSchema.safeParse(baseEvent)
    expect(result.success).toBe(true)
  })

  test('rejects missing country', () => {
    const { country, ...without } = baseEvent
    expect(EventSchema.safeParse(without).success).toBe(false)
  })

  test('rejects lowercase country', () => {
    expect(EventSchema.safeParse({ ...baseEvent, country: 'ch' }).success).toBe(false)
  })

  test('rejects 3-letter country', () => {
    expect(EventSchema.safeParse({ ...baseEvent, country: 'CHE' }).success).toBe(false)
  })

  test('rejects empty city', () => {
    expect(EventSchema.safeParse({ ...baseEvent, city: '' }).success).toBe(false)
  })

  test('rejects invalid date format', () => {
    expect(EventSchema.safeParse({ ...baseEvent, startDate: '08-10-2026' }).success).toBe(false)
  })

  test('rejects unknown category', () => {
    expect(EventSchema.safeParse({ ...baseEvent, category: 'not-a-real-category' }).success).toBe(false)
  })

  test('accepts optional fields when present', () => {
    const result = EventSchema.safeParse({
      ...baseEvent,
      endDate: '2026-10-10',
      startTime: '19:00',
      endTime: '22:00',
      description: 'Some description',
      url: 'https://example.com',
      scraperId: 'tanzevents',
      datesApproximate: true,
    })
    expect(result.success).toBe(true)
  })

  test('rejects invalid time format', () => {
    expect(EventSchema.safeParse({ ...baseEvent, startTime: '19h00' }).success).toBe(false)
  })

  test('rejects unknown source', () => {
    expect(EventSchema.safeParse({ ...baseEvent, source: 'rss' }).success).toBe(false)
  })
})
