'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import type { GeoFacets, RangeFilter, DurationFilter } from '@/lib/events'
import { getCountryName } from '@/lib/geo'

interface Props {
  facets: GeoFacets
}

type MultiKey = 'continent' | 'country' | 'city' | 'cat'
type SingleKey = 'range' | 'duration'

const RANGE_OPTIONS: Array<{ value: RangeFilter; label: string }> = [
  { value: 'week', label: 'Diese Woche' },
  { value: 'month', label: 'Diesen Monat' },
  { value: '3months', label: 'Nächste 3 Monate' },
  { value: 'all', label: 'Alle' },
]

const DURATION_OPTIONS: Array<{ value: DurationFilter; label: string }> = [
  { value: 'single', label: 'Stunden-Anlässe' },
  { value: 'multi', label: 'Mehrtages-Anlässe' },
  { value: 'all', label: 'Alle' },
]

export function Filter({ facets }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  const getMulti = (key: MultiKey): string[] => {
    const v = params.get(key)
    return v ? v.split(',').filter(Boolean) : []
  }

  const getSingle = (key: SingleKey, fallback: string): string => {
    return params.get(key) ?? fallback
  }

  // Live aus dem Browser lesen (nicht aus dem React-Closure), damit zwei
  // schnelle Klicks während einer pending Transition nicht beide auf dem
  // gleichen veralteten Snapshot operieren und sich gegenseitig überschreiben.
  const currentParams = (): URLSearchParams =>
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams(params.toString())

  const writeParams = (next: URLSearchParams) => {
    const qs = next.toString()
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }

  const toggleMulti = (key: MultiKey, value: string) => {
    const newParams = currentParams()
    const current = (newParams.get(key)?.split(',').filter(Boolean)) ?? []
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    if (next.length) newParams.set(key, next.join(','))
    else newParams.delete(key)
    writeParams(newParams)
  }

  const setSingle = (key: SingleKey, value: string, fallback: string) => {
    const newParams = currentParams()
    if (value === fallback) newParams.delete(key)
    else newParams.set(key, value)
    writeParams(newParams)
  }

  const clearAll = () => {
    const newParams = currentParams()
    for (const k of ['continent', 'country', 'city', 'range', 'duration', 'cat'] as const) newParams.delete(k)
    writeParams(newParams)
  }

  const selectedContinents = getMulti('continent')
  const selectedCountries = getMulti('country')
  const selectedCities = getMulti('city')
  const selectedCategories = getMulti('cat')
  const selectedRange = getSingle('range', 'all') as RangeFilter
  const selectedDuration = getSingle('duration', 'all') as DurationFilter

  const totalSelected =
    selectedContinents.length +
    selectedCountries.length +
    selectedCities.length +
    selectedCategories.length +
    (selectedRange !== 'all' ? 1 : 0) +
    (selectedDuration !== 'all' ? 1 : 0)

  if (
    facets.continents.length === 0 &&
    facets.countries.length === 0 &&
    facets.cities.length === 0
  ) {
    return null
  }

  return (
    <div className={`mb-5 border border-gray-200 rounded-xl bg-white p-3 text-sm ${pending ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-gray-700">Filter</span>
        {totalSelected > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-gray-400 hover:text-gray-700 underline-offset-2 hover:underline"
          >
            Filter zurücksetzen ({totalSelected})
          </button>
        )}
      </div>

      <div className="space-y-2">
        <SingleSection
          label="Zeitraum"
          options={RANGE_OPTIONS}
          selected={selectedRange}
          fallback="all"
          onSelect={(v) => setSingle('range', v, 'all')}
        />
        <SingleSection
          label="Dauer"
          options={DURATION_OPTIONS}
          selected={selectedDuration}
          fallback="all"
          onSelect={(v) => setSingle('duration', v, 'all')}
        />
        <MultiSection
          label="Kontinent"
          options={facets.continents.map((f) => ({ value: f.value, label: f.value, count: f.count }))}
          selected={selectedContinents}
          onToggle={(v) => toggleMulti('continent', v)}
        />
        <MultiSection
          label="Land"
          options={facets.countries.map((f) => ({
            value: f.value,
            label: `${getCountryName(f.value)} (${f.value})`,
            count: f.count,
          }))}
          selected={selectedCountries}
          onToggle={(v) => toggleMulti('country', v)}
        />
        <MultiSection
          label="Stadt"
          options={facets.cities.map((f) => ({ value: f.value, label: f.value, count: f.count }))}
          selected={selectedCities}
          onToggle={(v) => toggleMulti('city', v)}
        />
      </div>
    </div>
  )
}

interface MultiSectionProps {
  label: string
  options: Array<{ value: string; label: string; count: number }>
  selected: string[]
  onToggle: (value: string) => void
}

function MultiSection({ label, options, selected, onToggle }: MultiSectionProps) {
  if (options.length === 0) return null
  const open = selected.length > 0 || options.length <= 5
  return (
    <details open={open} className="group">
      <summary className="cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-700 select-none flex items-center gap-1">
        <span className="group-open:rotate-90 transition-transform">▸</span>
        {label}
        {selected.length > 0 && <span className="text-blue-600">· {selected.length}</span>}
      </summary>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const isSelected = selected.includes(opt.value)
          return (
            <button
              key={opt.value}
              onClick={() => onToggle(opt.value)}
              className={`text-xs px-2 py-1 rounded-full border transition ${
                isSelected
                  ? 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-400'
              }`}
            >
              {opt.label}
              <span className={`ml-1 ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>{opt.count}</span>
            </button>
          )
        })}
      </div>
    </details>
  )
}

interface SingleSectionProps<T extends string> {
  label: string
  options: Array<{ value: T; label: string }>
  selected: T
  fallback: T
  onSelect: (value: T) => void
}

function SingleSection<T extends string>({ label, options, selected, fallback, onSelect }: SingleSectionProps<T>) {
  const active = selected !== fallback
  return (
    <details open className="group">
      <summary className="cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-700 select-none flex items-center gap-1">
        <span className="group-open:rotate-90 transition-transform">▸</span>
        {label}
        {active && <span className="text-blue-600">·</span>}
      </summary>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const isSelected = selected === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              className={`text-xs px-2 py-1 rounded-full border transition ${
                isSelected
                  ? 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-400'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </details>
  )
}
