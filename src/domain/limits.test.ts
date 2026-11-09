import { describe, expect, it } from 'vitest'
import { validateValue, valueLimits } from './limits'
import type { Habit } from '@/lib/types'

const base: Habit = {
  id: 'h', name: 'Teszt', icon: 'circle', type: 'min', target_value: 8,
  tolerance_pct: null, target_time: null, unit: 'óra', frequency: 'daily',
  weight: 1, counts_toward_score: true, system_key: null, metric_key: null,
  active: true, sort_order: 1, created_at: '2026-01-01',
}

const sleep: Habit = { ...base, metric_key: 'sleep_hours' }
const screen: Habit = { ...base, name: 'Képernyőidő', type: 'max', target_value: 180, unit: 'perc', metric_key: 'screen_time' }

describe('valueLimits', () => {
  it('a napnál hosszabb alvást nem engedi', () => {
    expect(valueLimits(sleep)).toEqual({ min: 0, max: 24 })
  })

  it('metric_key nélkül csak nagyságrendi határ van', () => {
    expect(valueLimits(base).max).toBe(1_000_000)
  })
})

describe('validateValue', () => {
  it('az üres mező mindig rendben — az a törlés', () => {
    expect(validateValue(sleep, null)).toBeNull()
  })

  it('a reális értéket átengedi, a célon kívülit is', () => {
    expect(validateValue(sleep, 7.5)).toBeNull()
    expect(validateValue(sleep, 3)).toBeNull() // kevés, de igaz
    expect(validateValue(screen, 420)).toBeNull() // sok, de igaz
  })

  it('1500 órát nem lehet aludni', () => {
    expect(validateValue(sleep, 1500)).toMatch(/legfeljebb 24/i)
  })

  it('6500 perc képernyőidő nem fér bele egy napba', () => {
    expect(validateValue(screen, 6500)).toMatch(/1\u00a0?440|1440/)
  })

  it('a negatív értéket elutasítja', () => {
    expect(validateValue(sleep, -2)).toMatch(/negatív/i)
  })

  it('a határérték még belefér', () => {
    expect(validateValue(sleep, 24)).toBeNull()
    expect(validateValue(screen, 1440)).toBeNull()
  })
})
