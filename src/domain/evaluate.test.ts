import { describe, it, expect } from 'vitest'
import { evaluateHabit, habitProgress, habitVerdict, isHabitApplicableOn, rangeBounds, scorableHabitsOn } from './evaluate'
import { makeHabit, makeLog } from './testFactories'

describe('evaluateHabit — binary', () => {
  const h = makeHabit({ id: 'quit', type: 'binary' })

  it('done === true → teljesítve', () => {
    expect(evaluateHabit(h, makeLog({ habit_id: 'quit', date: '2026-08-31', done: true }))).toBe(true)
  })
  it('done === false → nem teljesítve', () => {
    expect(evaluateHabit(h, makeLog({ habit_id: 'quit', date: '2026-08-31', done: false }))).toBe(false)
  })
  it('nincs log → nem teljesítve', () => {
    expect(evaluateHabit(h, null)).toBe(false)
  })
})

describe('evaluateHabit — min', () => {
  const h = makeHabit({ id: 'lepes', type: 'min', target_value: 10000 })
  const log = (value: number) => makeLog({ habit_id: 'lepes', date: '2026-08-31', value })

  it('érték ≥ cél → teljesítve', () => {
    expect(evaluateHabit(h, log(10000))).toBe(true)
    expect(evaluateHabit(h, log(12500))).toBe(true)
  })
  it('érték < cél → nem teljesítve', () => {
    expect(evaluateHabit(h, log(9999))).toBe(false)
  })
  it('nulla is érvényes érték, nem hiányzó adat', () => {
    expect(evaluateHabit(h, log(0))).toBe(false)
  })
})

describe('evaluateHabit — max', () => {
  const h = makeHabit({ id: 'kepernyo', type: 'max', target_value: 180 })
  const log = (value: number) => makeLog({ habit_id: 'kepernyo', date: '2026-08-31', value })

  it('érték ≤ limit → teljesítve', () => {
    expect(evaluateHabit(h, log(120))).toBe(true)
    expect(evaluateHabit(h, log(180))).toBe(true)
  })
  it('limit felett → nem teljesítve', () => {
    expect(evaluateHabit(h, log(181))).toBe(false)
  })
})

describe('evaluateHabit — range', () => {
  const h = makeHabit({ id: 'kaloria', type: 'range', target_value: 2400, tolerance_pct: 5 })
  const log = (value: number) => makeLog({ habit_id: 'kaloria', date: '2026-08-31', value })

  it('a tűrés 2280–2520 közötti sávot ad', () => {
    expect(rangeBounds(h)).toEqual({ low: 2280, high: 2520 })
  })
  it('a sávon belül teljesítve, a határok is beleértve', () => {
    expect(evaluateHabit(h, log(2400))).toBe(true)
    expect(evaluateHabit(h, log(2280))).toBe(true)
    expect(evaluateHabit(h, log(2520))).toBe(true)
  })
  it('a sávon kívül nem teljesítve — mindkét irányban', () => {
    expect(evaluateHabit(h, log(2279))).toBe(false)
    expect(evaluateHabit(h, log(2521))).toBe(false)
  })
  it('0% tűrés → pontos egyezés kell', () => {
    const strict = makeHabit({ id: 'k', type: 'range', target_value: 100, tolerance_pct: 0 })
    expect(evaluateHabit(strict, makeLog({ habit_id: 'k', date: '2026-08-31', value: 100 }))).toBe(true)
    expect(evaluateHabit(strict, makeLog({ habit_id: 'k', date: '2026-08-31', value: 101 }))).toBe(false)
  })
})

describe('evaluateHabit — time', () => {
  const h = makeHabit({ id: 'lefekves', type: 'time', target_time: '23:00' })
  const log = (time_value: string) => makeLog({ habit_id: 'lefekves', date: '2026-08-31', time_value })

  it('határidő előtt teljesítve', () => {
    expect(evaluateHabit(h, log('22:30'))).toBe(true)
  })
  it('éjfél után NEM teljesítve', () => {
    expect(evaluateHabit(h, log('00:15'))).toBe(false)
  })
})

describe('habitProgress', () => {
  it('teljesített habit mindig 1', () => {
    const h = makeHabit({ id: 'l', type: 'min', target_value: 10000 })
    expect(habitProgress(h, makeLog({ habit_id: 'l', date: '2026-08-31', value: 12000 }))).toBe(1)
  })
  it('részteljesítés arányos', () => {
    const h = makeHabit({ id: 'l', type: 'min', target_value: 10000 })
    expect(habitProgress(h, makeLog({ habit_id: 'l', date: '2026-08-31', value: 4000 }))).toBeCloseTo(0.4)
  })
  it('log nélkül 0', () => {
    expect(habitProgress(makeHabit({ id: 'l', type: 'min', target_value: 100 }), null)).toBe(0)
  })
})

describe('isHabitApplicableOn', () => {
  // 2026-08-31 hétfő, 2026-08-30 vasárnap
  it('daily mindig', () => {
    expect(isHabitApplicableOn('daily', '2026-08-30')).toBe(true)
    expect(isHabitApplicableOn('daily', '2026-08-31')).toBe(true)
  })
  it('weekdays csak hétköznap', () => {
    expect(isHabitApplicableOn('weekdays', '2026-08-31')).toBe(true)
    expect(isHabitApplicableOn('weekdays', '2026-08-30')).toBe(false)
  })
  it('weekends csak hétvégén', () => {
    expect(isHabitApplicableOn('weekends', '2026-08-30')).toBe(true)
    expect(isHabitApplicableOn('weekends', '2026-08-31')).toBe(false)
  })
})

describe('scorableHabitsOn — a fogmosás kivétele', () => {
  const habits = [
    makeHabit({ id: 'lepes', type: 'min', target_value: 10000 }),
    makeHabit({ id: 'fogmosas', type: 'binary', counts_toward_score: false, system_key: 'toothbrush' }),
    makeHabit({ id: 'regi', type: 'binary', active: false }),
  ]

  it('a fogmosás nem számít a napi pontszámba', () => {
    expect(scorableHabitsOn(habits, '2026-08-31').map((h) => h.id)).toEqual(['lepes'])
  })
})

describe('habitVerdict — egyszavas minősítés', () => {
  it('adat nélkül "Nincs adat", nem hibaállapot', () => {
    const h = makeHabit({ id: 'l', type: 'min', target_value: 10000 })
    expect(habitVerdict(h, null)).toEqual({ status: 'none', label: 'Nincs adat', progress: 0 })
  })

  it('min: teljesítve → Rendben, közel → Közel, alatta → Kevés', () => {
    const h = makeHabit({ id: 'l', type: 'min', target_value: 10000 })
    const at = (v: number) => habitVerdict(h, makeLog({ habit_id: 'l', date: '2026-08-31', value: v }))
    expect(at(11000).status).toBe('good')
    expect(at(8000)).toMatchObject({ status: 'warn', label: 'Közel' })
    expect(at(3000)).toMatchObject({ status: 'bad', label: 'Kevés' })
  })

  it('max: a limit alatt Rendben, kicsit fölötte Sok, jóval fölötte Túl sok', () => {
    const h = makeHabit({ id: 'k', type: 'max', target_value: 180 })
    const at = (v: number) => habitVerdict(h, makeLog({ habit_id: 'k', date: '2026-08-31', value: v }))
    expect(at(120)).toMatchObject({ status: 'good', label: 'Rendben' })
    expect(at(200)).toMatchObject({ status: 'warn', label: 'Sok' })
    expect(at(400)).toMatchObject({ status: 'bad', label: 'Túl sok' })
  })

  it('range: sávon belül Rendben, kicsit mellette Kevés/Sok', () => {
    const h = makeHabit({ id: 'c', type: 'range', target_value: 2400, tolerance_pct: 5 })
    const at = (v: number) => habitVerdict(h, makeLog({ habit_id: 'c', date: '2026-08-31', value: v }))
    expect(at(2400).status).toBe('good')
    expect(at(2200)).toMatchObject({ status: 'warn', label: 'Kevés' })
    expect(at(2600)).toMatchObject({ status: 'warn', label: 'Sok' })
    expect(at(1200)).toMatchObject({ status: 'bad', label: 'Kívül' })
  })

  it('time: határidő előtt Időben, utána Késő — éjfél után is', () => {
    const h = makeHabit({ id: 't', type: 'time', target_time: '23:00' })
    const at = (v: string) => habitVerdict(h, makeLog({ habit_id: 't', date: '2026-08-31', time_value: v }))
    expect(at('22:30')).toMatchObject({ status: 'good', label: 'Időben' })
    expect(at('00:20')).toMatchObject({ status: 'bad', label: 'Késő' })
  })
})
