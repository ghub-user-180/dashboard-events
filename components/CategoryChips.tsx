'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { CATEGORIES } from '@/lib/categories'

interface Props {
  counts: Record<string, number>
}

export function CategoryChips({ counts }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  const selected = (() => {
    const v = params.get('cat')
    return v ? v.split(',').filter(Boolean) : []
  })()

  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value]
    const newParams = new URLSearchParams(params.toString())
    if (next.length) newParams.set('cat', next.join(','))
    else newParams.delete('cat')
    const qs = newParams.toString()
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }

  const reset = () => {
    const newParams = new URLSearchParams(params.toString())
    newParams.delete('cat')
    const qs = newParams.toString()
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <div className={`flex flex-wrap gap-1.5 mb-3 ${pending ? 'opacity-60' : ''}`}>
      <button
        onClick={reset}
        className={`text-xs px-3 py-1 rounded-full border transition ${
          selected.length === 0
            ? 'bg-gray-900 text-white border-gray-900'
            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
        }`}
      >
        Alle <span className={selected.length === 0 ? 'text-gray-300 ml-1' : 'text-gray-400 ml-1'}>{totalCount}</span>
      </button>
      {CATEGORIES.map((cat) => {
        const count = counts[cat.id] ?? 0
        if (count === 0 && !selected.includes(cat.id)) return null
        const isActive = selected.includes(cat.id)
        return (
          <button
            key={cat.id}
            onClick={() => toggle(cat.id)}
            className={`text-xs px-3 py-1 rounded-full border transition ${
              isActive
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
            }`}
          >
            {cat.icon} {cat.label}
            <span className={`ml-1 ${isActive ? 'text-gray-300' : 'text-gray-400'}`}>{count}</span>
          </button>
        )
      })}
    </div>
  )
}
