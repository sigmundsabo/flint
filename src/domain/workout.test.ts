import { describe, it, expect } from 'vitest'
import {
  calcVolume, completedExercises, formatDuration, freshSets, isExerciseDone,
  previousReference, reconcileSets, targetLabel,
} from './workout'
import type { Workout, WorkoutDay, WorkoutSets } from '@/lib/types'

const day: WorkoutDay = {
  id: 'mon',
  name: 'Hát / Váll / Tricepsz',
  phase: 'hyper',
  exercises: [
    { id: 'a', name: 'Lehúzás', sets: 3, repMin: 8, repMax: 10, tip: '' },
    { id: 'b', name: 'Vállnyomás', sets: 2, repMin: 12, repMax: 12, tip: '' },
  ],
}

const workout = (date: string, sets: WorkoutSets): Workout => ({
  id: date, date, type: day.name, duration: null, note: null,
  day_id: 'mon', total_volume: null, duration_sec: null,
  calories: null, avg_hr: null, max_hr: null, sets,
})

describe('freshSets / reconcileSets', () => {
  it('a terv szerinti számú üres sorozatot ad', () => {
    const s = freshSets(day)
    expect(s.a.sets).toHaveLength(3)
    expect(s.b.sets).toHaveLength(2)
    expect(s.a.sets[0]).toEqual({ w: null, r: null, done: false })
  })

  it('a meglévő értékeket megtartja, a hiányzó sorozatot pótolja', () => {
    const partial: WorkoutSets = { a: { sets: [{ w: 60, r: 10, done: true }] } }
    const out = reconcileSets(partial, day)
    expect(out.a.sets).toHaveLength(3)
    expect(out.a.sets[0]).toEqual({ w: 60, r: 10, done: true })
    expect(out.b.sets).toHaveLength(2)
  })

  it('a tervből kikerült gyakorlat nem marad ott', () => {
    const stale: WorkoutSets = { régi: { sets: [{ w: 1, r: 1, done: true }] } }
    expect(Object.keys(reconcileSets(stale, day))).toEqual(['a', 'b'])
  })
})

describe('calcVolume', () => {
  it('csak a kipipált, teljesen kitöltött sorozat számít', () => {
    const sets: WorkoutSets = {
      a: {
        sets: [
          { w: 60, r: 10, done: true },   // 600
          { w: 60, r: 10, done: false },  // nincs kipipálva
          { w: null, r: 10, done: true }, // nincs súly
        ],
      },
      b: { sets: [{ w: 20, r: 12, done: true }] }, // 240
    }
    expect(calcVolume(sets)).toBe(840)
  })

  it('üres bemenetre 0, nem NaN', () => {
    expect(calcVolume(null)).toBe(0)
    expect(calcVolume({})).toBe(0)
  })

  it('tizedesre kerekít, nem hagy lebegőpontos szemetet', () => {
    expect(calcVolume({ a: { sets: [{ w: 2.5, r: 3, done: true }] } })).toBe(7.5)
  })
})

describe('previousReference', () => {
  const history = [
    workout('2026-08-20', { a: { sets: [{ w: 50, r: 10, done: true }, { w: 50, r: 9, done: true }] } }),
    workout('2026-08-30', { a: { sets: [{ w: 60, r: 10, done: true }] } }),
    workout('2026-09-01', { a: { sets: [{ w: 70, r: 10, done: true }] } }),
  ]

  it('a legutóbbi KORÁBBI edzést adja vissza, a mait nem', () => {
    const ref = previousReference(history, 'a', 0, '2026-09-01')
    expect(ref).toMatchObject({ weight: 60, reps: 10, date: '2026-08-30' })
  })

  it('hét napnál régebbit "előző hét"-ként jelöl', () => {
    // a 0. sorozat a 08-30-i, a 1. sorozat viszont csak a 08-20-iban van meg
    expect(previousReference(history, 'a', 1, '2026-09-01')).toMatchObject({
      label: 'előző hét', weight: 50, reps: 9,
    })
    expect(previousReference(history, 'a', 0, '2026-09-01')?.label).toBe('legutóbb')
  })

  it('ismeretlen gyakorlatra vagy sorozatra null', () => {
    expect(previousReference(history, 'nincs', 0, '2026-09-01')).toBeNull()
    expect(previousReference(history, 'a', 9, '2026-09-01')).toBeNull()
  })

  it('az üres (se súly, se ismétlés) sorozatot átugorja', () => {
    const h = [workout('2026-08-30', { a: { sets: [{ w: null, r: null, done: false }] } })]
    expect(previousReference(h, 'a', 0, '2026-09-01')).toBeNull()
  })
})

describe('segédfüggvények', () => {
  it('completedExercises azokat számolja, amikben van kipipált sorozat', () => {
    expect(completedExercises({
      a: { sets: [{ w: 1, r: 1, done: true }, { w: null, r: null, done: false }] },
      b: { sets: [{ w: null, r: null, done: false }] },
    })).toBe(1)
  })

  it('isExerciseDone csak akkor igaz, ha MINDEN sorozat kész', () => {
    expect(isExerciseDone([{ w: 1, r: 1, done: true }])).toBe(true)
    expect(isExerciseDone([{ w: 1, r: 1, done: true }, { w: null, r: null, done: false }])).toBe(false)
    expect(isExerciseDone([])).toBe(false)
    expect(isExerciseDone(undefined)).toBe(false)
  })

  it('targetLabel összevonja az azonos ismétlésszámot', () => {
    expect(targetLabel(day.exercises[0])).toBe('3 × 8–10')
    expect(targetLabel(day.exercises[1])).toBe('2 × 12')
  })

  it('formatDuration mm:ss alakot ad', () => {
    expect(formatDuration(0)).toBe('00:00')
    expect(formatDuration(65)).toBe('01:05')
    expect(formatDuration(3725)).toBe('62:05')
  })
})
