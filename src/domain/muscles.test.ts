import { MUSCLE_SOURCE_DAYS } from '@/data/plans'
import { describe, expect, it } from 'vitest'
import {
  buildMuscleIndex, countSets, emptyTotals, addWorkoutSets, hasMuscleData,
  muscleTotals, plannedTotals,
} from './muscles'
import { type Workout, type WorkoutDay, type WorkoutSets } from '@/lib/types'

const plan = MUSCLE_SOURCE_DAYS

const day: WorkoutDay = {
  id: 'teszt', name: 'Teszt', phase: 'hyper',
  exercises: [
    { id: 'press', name: 'Nyomás', sets: 3, repMin: 8, repMax: 10, tip: '',
      muscles: { chest: 1, triceps: 0.5 } },
    { id: 'curl', name: 'Curl', sets: 2, repMin: 8, repMax: 10, tip: '',
      muscles: { biceps: 1 }, legacyIds: ['tue_2'] },
  ],
}

const index = buildMuscleIndex([day])

const workout = (sets: WorkoutSets): Workout => ({
  id: 'w', date: '2026-11-07', type: 'Teszt', duration: null, note: null,
  day_id: 'teszt', total_volume: null, duration_sec: null, calories: null,
  avg_hr: null, max_hr: null, sets,
})

describe('buildMuscleIndex', () => {
  it('a régi azonosítót is ugyanarra a mozgásra képezi le', () => {
    expect(index.get('tue_2')).toEqual({ biceps: 1 })
  })

  it('a tervből kiesett régi gyakorlatokat is ismeri', () => {
    expect(index.get('wed_7')).toEqual({ abs: 1 }) // Russian twist
  })

  it('a beépített terv minden gyakorlatához tartozik izomcsoport', () => {
    const full = buildMuscleIndex(plan)
    for (const d of plan) {
      for (const ex of d.exercises) {
        expect(full.get(ex.id), `${d.name} / ${ex.name}`).toBeTruthy()
      }
    }
  })
})

describe('addWorkoutSets', () => {
  it('csak a kipipált sorozat számít', () => {
    const totals = addWorkoutSets(emptyTotals(), {
      press: { sets: [
        { w: 60, r: 10, done: true },
        { w: 60, r: 10, done: false },
      ] },
    }, index)
    expect(totals.chest.sets).toBe(1)
    expect(totals.chest.reps).toBe(10)
    expect(totals.chest.volume).toBe(600)
  })

  it('a másodlagos izom fél sorozatot kap, nem egészet', () => {
    const totals = addWorkoutSets(emptyTotals(), {
      press: { sets: [{ w: 60, r: 10, done: true }] },
    }, index)
    expect(totals.chest.sets).toBe(1)
    expect(totals.triceps.sets).toBe(0.5)
    expect(totals.triceps.volume).toBe(300)
  })

  it('az ismeretlen gyakorlatot kihagyja, nem dob hibát', () => {
    const totals = addWorkoutSets(emptyTotals(), {
      ismeretlen: { sets: [{ w: 50, r: 5, done: true }] },
    }, index)
    expect(hasMuscleData(totals)).toBe(false)
  })

  it('a hiányzó súly vagy ismétlés nem rontja el a sorozatszámot', () => {
    const totals = addWorkoutSets(emptyTotals(), {
      curl: { sets: [{ w: null, r: null, done: true }] },
    }, index)
    expect(totals.biceps.sets).toBe(1)
    expect(totals.biceps.volume).toBe(0)
  })
})

describe('muscleTotals', () => {
  it('több edzést összead', () => {
    const totals = muscleTotals(
      [
        workout({ curl: { sets: [{ w: 20, r: 10, done: true }] } }),
        workout({ curl: { sets: [{ w: 20, r: 10, done: true }] } }),
      ],
      index,
    )
    expect(totals.biceps.sets).toBe(2)
    expect(totals.biceps.volume).toBe(400)
  })

  it('a régi napló a legacyIds-en keresztül is beszámít', () => {
    const totals = muscleTotals(
      [workout({ tue_2: { sets: [{ w: 15, r: 12, done: true }] } })],
      index,
    )
    expect(totals.biceps.sets).toBe(1)
  })
})

describe('plannedTotals', () => {
  it('a terv minden előírt sorozatát számolja, pipától függetlenül', () => {
    const totals = plannedTotals(day, index)
    expect(totals.chest.sets).toBe(3)
    expect(totals.triceps.sets).toBe(1.5)
    expect(totals.biceps.sets).toBe(2)
  })
})

describe('countSets', () => {
  it('pipálva / összesen', () => {
    expect(countSets({
      press: { sets: [{ w: null, r: null, done: true }, { w: null, r: null, done: false }] },
      curl: { sets: [{ w: null, r: null, done: true }] },
    })).toEqual({ done: 2, total: 3 })
  })

  it('üres bemenetre nullát ad', () => {
    expect(countSets(null)).toEqual({ done: 0, total: 0 })
  })
})
