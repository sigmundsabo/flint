import { describe, it, expect, beforeEach } from 'vitest'
import { triggerRelapseReset, type RelapseResetDeps } from './relapse'

interface FakeLog {
  habitId: string
  dateKey: string
  done: boolean
}

describe('triggerRelapseReset', () => {
  let habitLogs: FakeLog[]
  let supplementLogs: { supplementId: string; dateKey: string }[]
  let deps: RelapseResetDeps

  beforeEach(() => {
    habitLogs = [
      { habitId: 'lepes', dateKey: '2026-08-29', done: true },
      { habitId: 'alvas', dateKey: '2026-08-29', done: true },
      { habitId: 'quit', dateKey: '2026-08-29', done: true },
      { habitId: 'lepes', dateKey: '2026-08-30', done: true },
      { habitId: 'alvas', dateKey: '2026-08-30', done: true },
      { habitId: 'quit', dateKey: '2026-08-30', done: true },
      { habitId: 'lepes', dateKey: '2026-08-31', done: true },
      { habitId: 'quit', dateKey: '2026-08-31', done: true },
    ]
    supplementLogs = [
      { supplementId: 'dvitamin', dateKey: '2026-08-30' },
      { supplementId: 'd3', dateKey: '2026-08-30' },
      { supplementId: 'dvitamin', dateKey: '2026-08-29' },
    ]

    deps = {
      async deleteHabitLogsForDate(dateKey) {
        const before = habitLogs.length
        habitLogs = habitLogs.filter((l) => l.dateKey !== dateKey)
        return before - habitLogs.length
      },
      async deleteSupplementLogsForDate(dateKey) {
        const before = supplementLogs.length
        supplementLogs = supplementLogs.filter((l) => l.dateKey !== dateKey)
        return before - supplementLogs.length
      },
      async setHabitLog({ habitId, dateKey, done }) {
        const existing = habitLogs.find((l) => l.habitId === habitId && l.dateKey === dateKey)
        if (existing) existing.done = done
        else habitLogs.push({ habitId, dateKey, done })
      },
    }
  })

  it('kitörli az adott nap MINDEN habit-logját', async () => {
    await triggerRelapseReset('2026-08-30', 'quit', deps)
    const sameDay = habitLogs.filter((l) => l.dateKey === '2026-08-30')
    expect(sameDay.map((l) => l.habitId)).toEqual(['quit'])
  })

  it('a Leszokás logot false-ra írja, nem törli nyom nélkül', async () => {
    await triggerRelapseReset('2026-08-30', 'quit', deps)
    const quit = habitLogs.find((l) => l.dateKey === '2026-08-30' && l.habitId === 'quit')
    expect(quit).toBeDefined()
    expect(quit!.done).toBe(false)
  })

  it('a korábbi napok streak-előzményét NEM írja felül visszamenőleg', async () => {
    await triggerRelapseReset('2026-08-30', 'quit', deps)
    const earlier = habitLogs.filter((l) => l.dateKey === '2026-08-29')
    expect(earlier).toHaveLength(3)
    expect(earlier.every((l) => l.done === true)).toBe(true)
  })

  it('a későbbi napokat sem érinti', async () => {
    await triggerRelapseReset('2026-08-30', 'quit', deps)
    const later = habitLogs.filter((l) => l.dateKey === '2026-08-31')
    expect(later).toHaveLength(2)
    expect(later.every((l) => l.done === true)).toBe(true)
  })

  it('az aznapi kiegészítő-pipákat is nullázza, a többi napét nem', async () => {
    await triggerRelapseReset('2026-08-30', 'quit', deps)
    expect(supplementLogs.filter((l) => l.dateKey === '2026-08-30')).toHaveLength(0)
    expect(supplementLogs.filter((l) => l.dateKey === '2026-08-29')).toHaveLength(1)
  })

  it('visszaadja, mennyi sort törölt', async () => {
    const summary = await triggerRelapseReset('2026-08-30', 'quit', deps)
    expect(summary).toEqual({
      dateKey: '2026-08-30',
      deletedHabitLogs: 3,
      deletedSupplementLogs: 2,
    })
  })

  it('érvénytelen dátumra hibát dob, és nem nyúl semmihez', async () => {
    await expect(triggerRelapseReset('tegnap', 'quit', deps)).rejects.toThrow()
    expect(habitLogs).toHaveLength(8)
  })
})
