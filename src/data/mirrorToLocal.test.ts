// @vitest-environment jsdom
//
// A helyi másolat a VÉGSŐ tartalék: ha a szerver elesik, ez marad. Ezért nem
// elég, hogy „működik" — azt kell bizonyítani, hogy SOHA nem ront el egy
// meglévő, használható másolatot.

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LOCAL_STORE_KEY } from './localRepo'

const { repo } = vi.hoisted(() => ({
  repo: {
    listHabits: vi.fn(),
    listHabitLogs: vi.fn(),
    listHealthMetrics: vi.fn(),
    listWeightLogs: vi.fn(),
    listWorkouts: vi.fn(),
    listDailyReviews: vi.fn(),
    listSupplements: vi.fn(),
    listSupplementLogs: vi.fn(),
    loadSettings: vi.fn(),
  },
}))

vi.mock('@/lib/supabase', () => ({ isSupabaseConfigured: true }))
vi.mock('./index', () => ({ repo }))

const { lastMirrorAt, mirrorToLocal } = await import('./mirrorToLocal')

const AT_KEY = 'habit-tracker:helyi-masolat-ideje'

/** A szerver „mindent rendben" válasza. */
function serverHasData() {
  repo.listHabits.mockResolvedValue([{ id: 'h1', name: 'Víz' }])
  repo.listHabitLogs.mockResolvedValue([{ id: 'l1', date: '2026-11-01', value: 6 }])
  repo.listHealthMetrics.mockResolvedValue([])
  repo.listWeightLogs.mockResolvedValue([])
  repo.listWorkouts.mockResolvedValue([])
  repo.listDailyReviews.mockResolvedValue([])
  repo.listSupplements.mockResolvedValue([])
  repo.listSupplementLogs.mockResolvedValue([])
  repo.loadSettings.mockResolvedValue({ daily_threshold_pct: 70 })
}

const readStore = () => JSON.parse(localStorage.getItem(LOCAL_STORE_KEY) ?? 'null')

describe('mirrorToLocal', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    serverHasData()
  })

  it('a teljes adatot elteszi, és megjegyzi, mikor', async () => {
    expect(await mirrorToLocal()).toBe('kesz')

    const store = readStore()
    expect(store.habits).toHaveLength(1)
    expect(store.habit_logs).toHaveLength(1)
    expect(store.settings).toEqual({ daily_threshold_pct: 70 })
    expect(lastMirrorAt()).toBeInstanceOf(Date)
  })

  it('NYITOTT dátumhatárral kér, nem a felület ablakával', async () => {
    await mirrorToLocal()
    // A tartalék akkor ér valamit, ha a teljes történet benne van — nem csak
    // az a 400 nap, amit a Ma fül éppen mutat.
    const [from, to] = repo.listHabitLogs.mock.calls[0]
    expect(from <= '1970-01-01').toBe(true)
    expect(to >= '2999-12-31').toBe(true)
  })

  it('üres szerverválasznál NEM írja felül a meglévő másolatot', async () => {
    await mirrorToLocal()
    const jo = readStore()

    // Lejárt munkamenet, félbeszakadt kérés vagy 402 — mind üres listát ad.
    repo.listHabits.mockResolvedValue([])
    expect(await mirrorToLocal({ force: true })).toBe('kihagyva')

    expect(readStore()).toEqual(jo)
  })

  it('hibát sem engedi el a másolat rovására', async () => {
    await mirrorToLocal()
    const jo = readStore()

    repo.listHabitLogs.mockRejectedValue(new Error('402 Payment Required'))
    expect(await mirrorToLocal({ force: true })).toBe('hiba')

    expect(readStore()).toEqual(jo)
  })

  it('12 órán belül nem másol újra magától, de kérésre igen', async () => {
    await mirrorToLocal()
    expect(repo.listHabits).toHaveBeenCalledTimes(1)

    // A `load()` minden ablakbővítésnél lefut; ettől nem indulhat új másolat.
    expect(await mirrorToLocal()).toBe('kihagyva')
    expect(repo.listHabits).toHaveBeenCalledTimes(1)

    expect(await mirrorToLocal({ force: true })).toBe('kesz')
    expect(repo.listHabits).toHaveBeenCalledTimes(2)
  })

  it('12 óra után magától is újramásol', async () => {
    await mirrorToLocal()
    const regen = new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString()
    localStorage.setItem(AT_KEY, regen)

    expect(await mirrorToLocal()).toBe('kesz')
  })

  it('olvashatatlan időbélyegre nem omlik össze', async () => {
    localStorage.setItem(AT_KEY, 'ez nem dátum')
    expect(lastMirrorAt()).toBeNull()
    expect(await mirrorToLocal()).toBe('kesz')
  })
})

describe('mirrorToLocal helyi módban', () => {
  it('meg sem szólal — a forrás és a cél ugyanaz a tároló', async () => {
    vi.resetModules()
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: false }))
    const helyi = await import('./mirrorToLocal')

    localStorage.clear()
    vi.clearAllMocks()
    expect(await helyi.mirrorToLocal({ force: true })).toBe('kihagyva')
    expect(repo.listHabits).not.toHaveBeenCalled()
    expect(localStorage.getItem(LOCAL_STORE_KEY)).toBeNull()
  })
})
