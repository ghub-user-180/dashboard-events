import { describe, expect, test } from 'vitest'
import { EventSchema } from '../lib/types'
import manualEvents from '../data/manual-events.json'

describe('manual-events.json', () => {
  test('every entry passes EventSchema', () => {
    const errors: string[] = []
    for (const candidate of manualEvents) {
      const result = EventSchema.safeParse(candidate)
      if (!result.success) {
        const id = (candidate as { id?: string }).id ?? '<no-id>'
        const reason = result.error.issues
          .map((i) => `${i.path.join('.')} ${i.message}`)
          .join('; ')
        errors.push(`${id}: ${reason}`)
      }
    }
    expect(errors).toEqual([])
  })
})
