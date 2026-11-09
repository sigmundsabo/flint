import { describe, it, expect } from 'vitest'
import { computeHabitStreak, computeStreaks, dailyScore, groupScores, isSuccessfulDay, scoreRange, completionRates } from './score'
import type { DailyScore } from './score'
import { makeHabit, makeLog, logMap } from './testFactories'
import type { HabitLog } from '@/lib/types'

const habits = [
  makeHabit({ id: 'lepes', type: 'min', target_value: 10000 }),
  makeHabit({ id: 'alvas', type: 'min', target_value: 8 }),
  makeHabit({ id: 'kepernyo', type: 'max', target_value: 180 }),
  makeHabit({ id: 'lefekves', type: 'time', target_time: '23:00' }),
  makeHabit({ id: 'fogmosas', type: 'binary', counts_toward_score: false, system_key: 'toothbrush' }),
]

describe('dailyScore', () => {
  it('arányos %-ot ad, nem darabszámot', () => {
    const logs = logMap([
      makeLog({ habit_id: 'lepes', date: '2026-08-31', value: 12000 }),
      makeLog({ habit_id: 'alvas', date: '2026-08-31', value: 7 }),
      makeLog({ habit_id: 'kepernyo', date: '2026-08-31', value: 100 }),
      makeLog({ habit_id: 'lefekves', date: '2026-08-31', time_value: '22:40' }),
    ])
    const score = dailyScore(habits, logs, '2026-08-31')
    // 4 pontozható habit, 3 teljesült (alvás nem)
    expect(score.applicableCount).toBe(4)
    expect(score.completedCount).toBe(3)
    expect(score.pct).toBe(75)
  })

  it('a fogmosás bepipálása nem növeli a pontszámot', () => {
    const withBrush = logMap([
      makeLog({ habit_id: 'lepes', date: '2026-08-31', value: 12000 }),
      makeLog({ habit_id: 'fogmosas', date: '2026-08-31', done: true }),
    ])
    expect(dailyScore(habits, withBrush, '2026-08-31').pct).toBe(25)
  })

  it('üres nap 0%', () => {
    expect(dailyScore(habits, new Map(), '2026-08-31').pct).toBe(0)
  })

  it('a súlyokat figyelembe veszi', () => {
    const weighted = [
      makeHabit({ id: 'alvas', type: 'binary', weight: 3 }),
      makeHabit({ id: 'viz', type: 'binary', weight: 1 }),
    ]
    const onlySleep = logMap([makeLog({ habit_id: 'alvas', date: '2026-08-31', done: true })])
    expect(dailyScore(weighted, onlySleep, '2026-08-31').pct).toBe(75)

    const onlyWater = logMap([makeLog({ habit_id: 'viz', date: '2026-08-31', done: true })])
    expect(dailyScore(weighted, onlyWater, '2026-08-31').pct).toBe(25)
  })

  it('nincs érvényes habit → 0%, nem NaN', () => {
    const none = [makeHabit({ id: 'x', type: 'binary', active: false })]
    expect(dailyScore(none, new Map(), '2026-08-31').pct).toBe(0)
  })
})

describe('isSuccessfulDay', () => {
  it('a küszöb elérése már siker', () => {
    expect(isSuccessfulDay(80, 80)).toBe(true)
    expect(isSuccessfulDay(79, 80)).toBe(false)
    expect(isSuccessfulDay(100, 80)).toBe(true)
  })
})

const score = (date: string, pct: number): DailyScore => ({
  date, pct, completedCount: 0, applicableCount: 0, weightDone: 0, weightTotal: 0,
})

describe('computeStreaks', () => {
  it('egymást követő sikeres napokat számol', () => {
    const scores = [
      score('2026-08-28', 90),
      score('2026-08-29', 85),
      score('2026-08-30', 100),
      score('2026-08-31', 90),
    ]
    expect(computeStreaks(scores, 80, '2026-08-31').current).toBe(4)
  })

  it('egy sikertelen nap megtöri a sorozatot', () => {
    const scores = [
      score('2026-08-28', 90),
      score('2026-08-29', 40),
      score('2026-08-30', 100),
      score('2026-08-31', 90),
    ]
    expect(computeStreaks(scores, 80, '2026-08-31').current).toBe(2)
  })

  it('a folyamatban lévő mai nap még nem töri meg a streaket', () => {
    const scores = [
      score('2026-08-29', 90),
      score('2026-08-30', 90),
      score('2026-08-31', 10), // ma, reggel, még alig van adat
    ]
    expect(computeStreaks(scores, 80, '2026-08-31').current).toBe(2)
  })

  it('a legjobb streak külön követhető', () => {
    const scores = [
      score('2026-08-20', 90),
      score('2026-08-21', 90),
      score('2026-08-22', 90),
      score('2026-08-23', 90),
      score('2026-08-24', 10),
      score('2026-08-25', 90),
      score('2026-08-26', 10),
    ]
    const result = computeStreaks(scores, 80, '2026-08-26')
    expect(result.best).toBe(4)
    // ma (08-26) még folyamatban → türelmi nap, a lánc tegnaptól számít
    expect(result.current).toBe(1)
  })

  it('a türelmi nap csak a mai napra jár, a tegnapelőttre nem', () => {
    const scores = [score('2026-08-29', 90), score('2026-08-30', 10), score('2026-08-31', 10)]
    expect(computeStreaks(scores, 80, '2026-08-31').current).toBe(0)
  })

  it('a hiányzó (nem rögzített) nap is megtöri a sorozatot', () => {
    const scores = [score('2026-08-28', 90), score('2026-08-31', 90)]
    expect(computeStreaks(scores, 80, '2026-08-31').current).toBe(1)
  })

  it('utólagos pótlás után újraszámolva összeáll a lánc', () => {
    const before = [score('2026-08-29', 90), score('2026-08-30', 20), score('2026-08-31', 90)]
    expect(computeStreaks(before, 80, '2026-08-31').current).toBe(1)

    const after = [score('2026-08-29', 90), score('2026-08-30', 95), score('2026-08-31', 90)]
    expect(computeStreaks(after, 80, '2026-08-31').current).toBe(3)
  })
})

describe('computeHabitStreak — Leszokás', () => {
  it('egymást követő tiszta napokat számol', () => {
    const done = new Map([
      ['2026-08-29', true],
      ['2026-08-30', true],
      ['2026-08-31', true],
    ])
    expect(computeHabitStreak(done, '2026-08-31')).toEqual({ current: 3, best: 3 })
  })

  it('a relapszus nullázza a jelenlegi streaket, a legjobbat megőrzi', () => {
    const done = new Map([
      ['2026-08-27', true],
      ['2026-08-28', true],
      ['2026-08-29', true],
      ['2026-08-30', false],
      ['2026-08-31', false],
    ])
    expect(computeHabitStreak(done, '2026-08-31')).toEqual({ current: 0, best: 3 })
  })
})

describe('scoreRange', () => {
  it('a tartomány minden napjára ad sort, a hiányzókra is', () => {
    const logsByDate = new Map<string, Map<string, HabitLog>>([
      ['2026-08-30', logMap([makeLog({ habit_id: 'lepes', date: '2026-08-30', value: 11000 })])],
    ])
    const range = scoreRange(habits, logsByDate, '2026-08-29', '2026-08-31')
    expect(range.map((s) => s.date)).toEqual(['2026-08-29', '2026-08-30', '2026-08-31'])
    expect(range[1].pct).toBe(25)
    expect(range[0].pct).toBe(0)
  })
})

describe('completionRates', () => {
  it('a leggyengébb láncszem kerül előre', () => {
    const dates = ['2026-08-29', '2026-08-30', '2026-08-31']
    const logsByDate = new Map<string, Map<string, HabitLog>>(
      dates.map((d) => [
        d,
        logMap([
          makeLog({ habit_id: 'lepes', date: d, value: 12000 }),
          makeLog({ habit_id: 'alvas', date: d, value: d === '2026-08-31' ? 9 : 6 }),
        ]),
      ]),
    )
    const rates = completionRates(habits, logsByDate, dates)
    // növekvő teljesítési arány szerint: elöl a leggyengébbek
    expect(rates.map((r) => r.pct)).toEqual([...rates.map((r) => r.pct)].sort((a, b) => a - b))
    expect(rates[0].pct).toBe(0)
    expect(rates.slice(0, 2).map((r) => r.habit.id).sort()).toEqual(['kepernyo', 'lefekves'])
    const lepes = rates.find((r) => r.habit.id === 'lepes')!
    expect(lepes.pct).toBe(100)
    const alvas = rates.find((r) => r.habit.id === 'alvas')!
    expect(alvas.pct).toBe(33)
    expect(rates.some((r) => r.habit.id === 'fogmosas')).toBe(false)
  })
})

describe('groupScores', () => {
  it('területenként bontja a napot, és a részhalmazokon ugyanaz a számítás fut', () => {
    const mixed = [
      makeHabit({ id: 'lepes', type: 'min', target_value: 10000, metric_key: 'steps' }),
      makeHabit({ id: 'alvas', type: 'min', target_value: 8, metric_key: 'sleep_hours' }),
      makeHabit({ id: 'edzes', type: 'binary', name: 'Edzés' }),
      makeHabit({ id: 'nyak', type: 'binary', system_key: 'neck' }),
      makeHabit({ id: 'quit', type: 'binary', system_key: 'quit' }),
    ]
    const logs = logMap([
      makeLog({ habit_id: 'lepes', date: '2026-08-31', value: 12000 }),
      makeLog({ habit_id: 'edzes', date: '2026-08-31', done: true }),
      makeLog({ habit_id: 'nyak', date: '2026-08-31', done: true }),
    ])
    const groups = groupScores(mixed, logs, '2026-08-31')
    expect(groups.map((g) => [g.group, g.pct])).toEqual([
      ['egeszseg', 50],
      ['edzes', 100],
      ['szokasok', 0],
    ])
  })

  it('üres terület 0%-ot ad, nem NaN-t', () => {
    const onlyHealth = [makeHabit({ id: 'lepes', type: 'min', target_value: 1, metric_key: 'steps' })]
    const groups = groupScores(onlyHealth, new Map(), '2026-08-31')
    expect(groups.find((g) => g.group === 'edzes')).toEqual({
      group: 'edzes', pct: 0, completedCount: 0, applicableCount: 0,
    })
  })
})
