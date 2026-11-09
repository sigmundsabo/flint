import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react'
import { repo } from '@/data'
import { mirrorToLocal } from '@/data/mirrorToLocal'
import type { NewWorkout } from '@/data/repo'
import { triggerRelapseReset } from '@/domain/relapse'
import { computeHabitStreak, computeStreaks, dailyScore, scoreRange, type DailyScore, type StreakResult } from '@/domain/score'
import { addDaysKey, toDateKey } from '@/lib/date'
import {
  DEFAULT_SETTINGS,
  type AppSettings, type DailyReview, type Habit, type HabitLog,
  type HealthMetrics, type MetricKey, type Supplement, type SupplementLog,
  type SystemKey, type WeightLog, type Workout,
} from '@/lib/types'

/** Mennyi előzményt tartunk memóriában (az éves heatmaphez 365+ nap kell). */
const WINDOW_DAYS = 400

export interface HabitValuePatch {
  done?: boolean | null
  value?: number | null
  time_value?: string | null
}

interface AppDataState {
  loading: boolean
  error: string | null
  habits: Habit[]
  logs: HabitLog[]
  health: HealthMetrics[]
  weights: WeightLog[]
  workouts: Workout[]
  reviews: DailyReview[]
  supplements: Supplement[]
  supplementLogs: SupplementLog[]
  settings: AppSettings
}

interface AppDataValue extends AppDataState {
  windowStart: string
  today: string

  // --- származtatott ------------------------------------------------------
  logsByDate: Map<string, Map<string, HabitLog>>
  scores: DailyScore[]
  scoreByDate: Map<string, DailyScore>
  streaks: StreakResult
  quitStreak: StreakResult
  habitBySystemKey: (key: SystemKey) => Habit | undefined
  habitByMetricKey: (key: MetricKey) => Habit | undefined
  scoreFor: (dateKey: string) => DailyScore
  healthFor: (dateKey: string) => HealthMetrics | undefined
  reviewFor: (dateKey: string) => DailyReview | undefined

  // --- műveletek ----------------------------------------------------------
  refresh: () => Promise<void>
  ensureWindow: (dateKey: string) => Promise<void>
  writeHabitValue: (habit: Habit, dateKey: string, patch: HabitValuePatch) => Promise<void>
  /** Bináris váltás a LEGFRISSEBB állapotból, nem a render pillanatképéből. */
  toggleHabitDone: (habit: Habit, dateKey: string) => Promise<void>
  clearHabitValue: (habit: Habit, dateKey: string) => Promise<void>
  relapse: (dateKey: string) => Promise<void>
  addWeight: (input: { date: string; measured_at: string; weight: number; note?: string | null }) => Promise<void>
  deleteWeight: (id: string) => Promise<void>
  addWorkout: (input: NewWorkout) => Promise<void>
  deleteWorkout: (id: string) => Promise<void>
  saveReview: (dateKey: string, patch: Partial<Omit<DailyReview, 'id' | 'date'>>) => Promise<void>
  setSupplementTaken: (supplementId: string, dateKey: string, taken: boolean) => Promise<void>
  saveSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>
  updateHabit: (id: string, patch: Partial<Habit>) => Promise<void>
  createSupplement: (input: Omit<Supplement, 'id'>) => Promise<void>
  updateSupplement: (id: string, patch: Partial<Omit<Supplement, 'id'>>) => Promise<void>
  deleteSupplement: (id: string) => Promise<void>
}

const EMPTY_STATE: AppDataState = {
  loading: true,
  error: null,
  habits: [],
  logs: [],
  health: [],
  weights: [],
  workouts: [],
  reviews: [],
  supplements: [],
  supplementLogs: [],
  settings: DEFAULT_SETTINGS,
}


const AppDataContext = createContext<AppDataValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppDataState>(EMPTY_STATE)
  const [windowStart, setWindowStart] = useState(() => addDaysKey(toDateKey(), -WINDOW_DAYS))
  const today = toDateKey()

  // A gyors, egymást követő koppintásoknál a renderben rögzült `state` elavult
  // lenne (React kötegeli a frissítéseket), ezért minden írás ezen a refen megy
  // keresztül, amit SZINKRONBAN frissítünk — így tíz gyors koppintás tíz
  // növekményt ad, nem egyet.
  const stateRef = useRef(state)

  const commit = useCallback((next: AppDataState) => {
    stateRef.current = next
    setState(next)
  }, [])

  const currentLog = useCallback(
    (habitId: string, dateKey: string) =>
      stateRef.current.logs.find((l) => l.habit_id === habitId && l.date === dateKey),
    [],
  )

  const load = useCallback(async (fromDate: string) => {
    try {
      const toDate = addDaysKey(toDateKey(), 1)
      let habits = await repo.listHabits()
      if (habits.length === 0) {
        await repo.seedDefaults()
        habits = await repo.listHabits()
      }

      const [logs, health, weights, workouts, reviews, supplements, supplementLogs, settings] =
        await Promise.all([
          repo.listHabitLogs(fromDate, toDate),
          repo.listHealthMetrics(fromDate, toDate),
          repo.listWeightLogs(fromDate, toDate),
          repo.listWorkouts(fromDate, toDate),
          repo.listDailyReviews(fromDate, toDate),
          repo.listSupplements(),
          repo.listSupplementLogs(fromDate, toDate),
          repo.loadSettings(),
        ])

    
      commit({
        loading: false, error: null, habits, logs, health, weights,
        workouts, reviews, supplements, supplementLogs, settings,
      })

      // Belépés után eltesszük a teljes adatot a telefonra, hogy egy újabb
      // szerverkiesésnél ne kézzel kimentett, elavult fájlból kelljen
      // visszaállni. Szándékosan NEM várjuk meg: a felület már kész, ez
      // mögötte fut, és ha elbukik, az appból semmi nem látszik belőle.
      void mirrorToLocal()
    } catch (err) {
      console.error('[useAppData] betöltés sikertelen', err)
      commit({
        ...stateRef.current,
        loading: false,
        error: err instanceof Error ? err.message : 'Ismeretlen hiba a betöltés közben',
      })
    }
  }, [commit])

  useEffect(() => {
    void load(windowStart)
  }, [load, windowStart])

  const refresh = useCallback(() => load(windowStart), [load, windowStart])

  /** Ha a dátumnavigáció kifut az ablakból, kibővítjük és újratöltünk. */
  const ensureWindow = useCallback(
    async (dateKey: string) => {
      if (dateKey >= windowStart) return
      setWindowStart(addDaysKey(dateKey, -WINDOW_DAYS))
    },
    [windowStart],
  )

  // ---------------------------------------------------------------------
  // Írás. A metric_key-vel rendelkező habitok értéke MINDKÉT táblába megy,
  // hogy a napi pontszám és a nyers egészségnézet ne csúszhasson szét.
  // ---------------------------------------------------------------------
  const writeHabitValue = useCallback(
    async (habit: Habit, dateKey: string, patch: HabitValuePatch) => {
      // optimista frissítés — a pipálás azonnal látszik
      const s = stateRef.current
      const logs = s.logs.slice()
      const idx = logs.findIndex((l) => l.habit_id === habit.id && l.date === dateKey)
      const stamp = new Date().toISOString()
      if (idx >= 0) {
        logs[idx] = { ...logs[idx], ...patch, updated_at: stamp }
      } else {
        logs.push({
          id: `optimistic-${habit.id}-${dateKey}`,
          habit_id: habit.id, date: dateKey,
          done: patch.done ?? null, value: patch.value ?? null,
          time_value: patch.time_value ?? null,
          created_at: stamp, updated_at: stamp,
        })
      }

      let health = s.health
      if (habit.metric_key) {
        const raw = habit.type === 'time' ? patch.time_value : patch.value
        if (raw !== undefined) {
          health = s.health.slice()
          const hIdx = health.findIndex((m) => m.date === dateKey)
          if (hIdx >= 0) health[hIdx] = { ...health[hIdx], [habit.metric_key]: raw }
          else health.push({
            id: `optimistic-${dateKey}`, date: dateKey, steps: null, calories: null,
            sleep_hours: null, water: null, screen_time: null, bedtime: null,
            [habit.metric_key]: raw,
          } as HealthMetrics)
        }
      }
      commit({ ...s, logs, health })

      try {
        await repo.setHabitLog({ habit_id: habit.id, date: dateKey, ...patch })
        if (habit.metric_key) {
          const raw = habit.type === 'time' ? patch.time_value : patch.value
          if (raw !== undefined) {
            await repo.upsertHealthMetrics(dateKey, { [habit.metric_key]: raw })
          }
        }
      } catch (err) {
        console.error('[useAppData] mentés sikertelen', err)
        await refresh() // az optimista állapot visszaáll a szerverére
        throw err
      }
    },
    [commit, refresh],
  )

  const toggleHabitDone = useCallback(
    async (habit: Habit, dateKey: string) => {
      const previous = currentLog(habit.id, dateKey)?.done === true
      await writeHabitValue(habit, dateKey, { done: !previous })
    },
    [currentLog, writeHabitValue],
  )

  const clearHabitValue = useCallback(
    async (habit: Habit, dateKey: string) => {
      commit({
        ...stateRef.current,
        logs: stateRef.current.logs.filter(
          (l) => !(l.habit_id === habit.id && l.date === dateKey),
        ),
      })
      try {
        await repo.clearHabitLog(habit.id, dateKey)
        if (habit.metric_key) await repo.upsertHealthMetrics(dateKey, { [habit.metric_key]: null })
      } catch (err) {
        await refresh()
        throw err
      }
    },
    [commit, refresh],
  )

  const habitBySystemKey = useCallback(
    (key: SystemKey) => state.habits.find((h) => h.system_key === key),
    [state.habits],
  )

  const habitByMetricKey = useCallback(
    (key: MetricKey) => state.habits.find((h) => h.metric_key === key),
    [state.habits],
  )

  /** DESTRUKTÍV. Csak megerősítés után hívható — lásd 11-quit-reset-fogmosas-kivetel.md */
  const relapse = useCallback(
    async (dateKey: string) => {
      const quit = state.habits.find((h) => h.system_key === 'quit')
      if (!quit) throw new Error('Nincs Leszokás habit — a reset nem futtatható.')
      await triggerRelapseReset(dateKey, quit.id, {
        deleteHabitLogsForDate: (d) => repo.deleteHabitLogsForDate(d),
        deleteSupplementLogsForDate: (d) => repo.deleteSupplementLogsForDate(d),
        setHabitLog: ({ habitId, dateKey: d, done }) =>
          repo.setHabitLog({ habit_id: habitId, date: d, done }),
      })
      // a metric_key-s habitok nyers értékei is elveszítik az értelmüket aznapra
      await repo.upsertHealthMetrics(dateKey, {
        steps: null, calories: null, sleep_hours: null,
        water: null, screen_time: null, bedtime: null,
      })
      await refresh()
    },
    [state.habits, refresh],
  )

  const wrap = useCallback(
    <A extends unknown[]>(fn: (...args: A) => Promise<unknown>) =>
      async (...args: A) => {
        await fn(...args)
        await refresh()
      },
    [refresh],
  )

  const value = useMemo<AppDataValue>(() => {
    const logsByDate = new Map<string, Map<string, HabitLog>>()
    for (const log of state.logs) {
      let day = logsByDate.get(log.date)
      if (!day) {
        day = new Map()
        logsByDate.set(log.date, day)
      }
      day.set(log.habit_id, log)
    }

    const scores = scoreRange(state.habits, logsByDate, windowStart, today)
    const scoreByDate = new Map(scores.map((s) => [s.date, s]))
    const streaks = computeStreaks(scores, state.settings.daily_threshold_pct, today)

    const quit = state.habits.find((h) => h.system_key === 'quit')
    const quitDone = new Map<string, boolean>()
    if (quit) {
      for (const s of scores) {
        quitDone.set(s.date, logsByDate.get(s.date)?.get(quit.id)?.done === true)
      }
    }
    const quitStreak = computeHabitStreak(quitDone, today)

    const healthByDate = new Map(state.health.map((m) => [m.date, m]))
    const reviewByDate = new Map(state.reviews.map((r) => [r.date, r]))

    return {
      ...state,
      windowStart,
      today,
      logsByDate,
      scores,
      scoreByDate,
      streaks,
      quitStreak,
      habitBySystemKey,
      habitByMetricKey,
      scoreFor: (dateKey) =>
        scoreByDate.get(dateKey) ??
        dailyScore(state.habits, logsByDate.get(dateKey) ?? new Map(), dateKey),
      healthFor: (dateKey) => healthByDate.get(dateKey),
      reviewFor: (dateKey) => reviewByDate.get(dateKey),

      refresh,
      ensureWindow,
      writeHabitValue,
      toggleHabitDone,
      clearHabitValue,
      relapse,
      addWeight: wrap((input: Parameters<typeof repo.addWeightLog>[0]) => repo.addWeightLog(input)),
      deleteWeight: wrap((id: string) => repo.deleteWeightLog(id)),
      addWorkout: wrap((input: NewWorkout) => repo.addWorkout(input)),
      deleteWorkout: wrap((id: string) => repo.deleteWorkout(id)),
      saveReview: wrap((dateKey: string, patch: Partial<Omit<DailyReview, 'id' | 'date'>>) =>
        repo.upsertDailyReview(dateKey, patch)),
      setSupplementTaken: wrap((id: string, dateKey: string, taken: boolean) =>
        repo.setSupplementLog(id, dateKey, taken)),
      saveSetting: wrap(<K extends keyof AppSettings>(key: K, v: AppSettings[K]) =>
        repo.saveSetting(key, v)) as AppDataValue['saveSetting'],
      updateHabit: wrap((id: string, patch: Partial<Habit>) => repo.updateHabit(id, patch)),
      createSupplement: wrap((input: Omit<Supplement, 'id'>) => repo.createSupplement(input)),
      updateSupplement: wrap((id: string, patch: Partial<Omit<Supplement, 'id'>>) =>
        repo.updateSupplement(id, patch)),
      deleteSupplement: wrap((id: string) => repo.deleteSupplement(id)),
    }
  }, [
    state, windowStart, today, habitBySystemKey, habitByMetricKey,
    refresh, ensureWindow, writeHabitValue, toggleHabitDone,
    clearHabitValue, relapse, wrap,
  ])

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData csak DataProvider-en belül használható')
  return ctx
}

/** Az adott napra vonatkozó kiegészítő-pipák. */
export function useSupplementLogsFor(dateKey: string): Map<string, boolean> {
  const { supplementLogs } = useAppData()
  return useMemo(
    () => new Map(supplementLogs.filter((l) => l.date === dateKey).map((l) => [l.supplement_id, l.taken])),
    [supplementLogs, dateKey],
  )
}
