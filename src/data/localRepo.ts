// localStorage-alapú tartalék. Akkor lép életbe, ha a .env még nincs kitöltve —
// így az app azonnal kipróbálható, mielőtt a Supabase projekt elkészül.
// Ugyanazt a Repo interfészt teljesíti, tehát a UI nem tud róla.

import { DEFAULT_SETTINGS, type AppSettings, type DailyReview, type Habit,
  type HabitLog, type HealthMetrics, type Supplement, type SupplementLog,
  type WeightLog, type Workout } from '@/lib/types'
import type { HabitLogInput, HabitPatch, NewHabit, NewWorkout, Repo } from './repo'

/** A helyi tároló kulcsa. Kívülről is kell: seedelés és mentés (localSnapshot.ts). */
export const LOCAL_STORE_KEY = 'habit-tracker:v1'
const KEY = LOCAL_STORE_KEY

interface Store {
  habits: Habit[]
  habit_logs: HabitLog[]
  health_metrics: HealthMetrics[]
  weight_logs: WeightLog[]
  workouts: Workout[]
  daily_reviews: DailyReview[]
  supplements: Supplement[]
  supplement_logs: SupplementLog[]
  settings: Partial<AppSettings>
}

const empty = (): Store => ({
  habits: [], habit_logs: [], health_metrics: [], weight_logs: [],
  workouts: [], daily_reviews: [], supplements: [], supplement_logs: [], settings: {},
})

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...empty(), ...(JSON.parse(raw) as Store) } : empty()
  } catch {
    return empty()
  }
}

function write(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch (err) {
    console.error('[localRepo] mentés sikertelen', err)
  }
}

function mutate(fn: (store: Store) => void): void {
  const store = read()
  fn(store)
  write(store)
}

const uid = () => crypto.randomUUID()
const now = () => new Date().toISOString()
const inRange = <T extends { date: string }>(rows: T[], from: string, to: string) =>
  rows.filter((r) => r.date >= from && r.date <= to)

export const localRepo: Repo = {
  async listHabits() {
    return read().habits.slice().sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
  },
  async createHabit(input: NewHabit) {
    const habit: Habit = { ...input, id: uid(), created_at: now() }
    mutate((s) => { s.habits.push(habit) })
    return habit
  },
  async updateHabit(id: string, patch: HabitPatch) {
    mutate((s) => {
      const h = s.habits.find((x) => x.id === id)
      if (h) Object.assign(h, patch)
    })
  },
  async deleteHabit(id: string) {
    mutate((s) => {
      s.habits = s.habits.filter((h) => h.id !== id)
      s.habit_logs = s.habit_logs.filter((l) => l.habit_id !== id)
    })
  },

  async listHabitLogs(from, to) { return inRange(read().habit_logs, from, to) },
  async setHabitLog(input: HabitLogInput) {
    mutate((s) => {
      const existing = s.habit_logs.find((l) => l.habit_id === input.habit_id && l.date === input.date)
      if (existing) {
        if (input.done !== undefined) existing.done = input.done
        if (input.value !== undefined) existing.value = input.value
        if (input.time_value !== undefined) existing.time_value = input.time_value
        existing.updated_at = now()
      } else {
        s.habit_logs.push({
          id: uid(), habit_id: input.habit_id, date: input.date,
          done: input.done ?? null, value: input.value ?? null,
          time_value: input.time_value ?? null,
          created_at: now(), updated_at: now(),
        })
      }
    })
  },
  async clearHabitLog(habitId, date) {
    mutate((s) => {
      s.habit_logs = s.habit_logs.filter((l) => !(l.habit_id === habitId && l.date === date))
    })
  },
  async deleteHabitLogsForDate(date) {
    let removed = 0
    mutate((s) => {
      const before = s.habit_logs.length
      s.habit_logs = s.habit_logs.filter((l) => l.date !== date)
      removed = before - s.habit_logs.length
    })
    return removed
  },

  async listHealthMetrics(from, to) { return inRange(read().health_metrics, from, to) },
  async upsertHealthMetrics(date, patch) {
    mutate((s) => {
      const row = s.health_metrics.find((m) => m.date === date)
      if (row) Object.assign(row, patch)
      else s.health_metrics.push({
        id: uid(), date, steps: null, calories: null, sleep_hours: null,
        water: null, screen_time: null, bedtime: null, ...patch,
      })
    })
  },

  async listWeightLogs(from, to) {
    return inRange(read().weight_logs, from, to)
      .sort((a, b) => a.measured_at.localeCompare(b.measured_at))
  },
  async addWeightLog(input) {
    mutate((s) => {
      s.weight_logs.push({
        id: uid(), date: input.date, measured_at: input.measured_at,
        weight: input.weight, note: input.note ?? null,
      })
    })
  },
  async deleteWeightLog(id) {
    mutate((s) => { s.weight_logs = s.weight_logs.filter((w) => w.id !== id) })
  },

  async listWorkouts(from, to) {
    return inRange(read().workouts, from, to).sort((a, b) => b.date.localeCompare(a.date))
  },
  async addWorkout(input: NewWorkout) {
    mutate((s) => {
      s.workouts.push({
        duration: null, note: null, day_id: null, total_volume: null,
        duration_sec: null, calories: null, avg_hr: null, max_hr: null, sets: null,
        ...input,
        id: uid(),
      })
    })
  },
  async deleteWorkout(id) {
    mutate((s) => { s.workouts = s.workouts.filter((w) => w.id !== id) })
  },

  async listDailyReviews(from, to) { return inRange(read().daily_reviews, from, to) },
  async upsertDailyReview(date, patch) {
    mutate((s) => {
      const row = s.daily_reviews.find((r) => r.date === date)
      if (row) Object.assign(row, patch)
      else s.daily_reviews.push({
        id: uid(), date, mood: null, energy: null, stress: null, note: null, ...patch,
      })
    })
  },

  async listSupplements() {
    return read().supplements.slice().sort((a, b) => a.sort_order - b.sort_order)
  },
  async createSupplement(input) {
    mutate((s) => { s.supplements.push({ ...input, id: uid() }) })
  },
  async updateSupplement(id, patch) {
    mutate((s) => {
      const row = s.supplements.find((x) => x.id === id)
      if (row) Object.assign(row, patch)
    })
  },
  async deleteSupplement(id) {
    mutate((s) => {
      s.supplements = s.supplements.filter((x) => x.id !== id)
      s.supplement_logs = s.supplement_logs.filter((l) => l.supplement_id !== id)
    })
  },
  async listSupplementLogs(from, to) { return inRange(read().supplement_logs, from, to) },
  async setSupplementLog(supplementId, date, taken) {
    mutate((s) => {
      const row = s.supplement_logs.find((l) => l.supplement_id === supplementId && l.date === date)
      if (row) row.taken = taken
      else s.supplement_logs.push({ id: uid(), supplement_id: supplementId, date, taken })
    })
  },
  async deleteSupplementLogsForDate(date) {
    let removed = 0
    mutate((s) => {
      const before = s.supplement_logs.length
      s.supplement_logs = s.supplement_logs.filter((l) => l.date !== date)
      removed = before - s.supplement_logs.length
    })
    return removed
  },

  async loadSettings() { return { ...DEFAULT_SETTINGS, ...read().settings } },
  async saveSetting(key, value) {
    mutate((s) => { s.settings = { ...s.settings, [key]: value } })
  },

  async seedDefaults() {
    if (read().habits.length > 0) return
    const base = { icon: 'circle', unit: null, frequency: 'daily' as const, weight: 1,
      counts_toward_score: true, system_key: null, metric_key: null, active: true,
      target_value: null, tolerance_pct: null, target_time: null }

    const defs: NewHabit[] = [
      { ...base, name: 'Lépés', metric_key: 'steps', icon: 'footprints', type: 'min', target_value: 10000, unit: 'lépés', sort_order: 10 },
      { ...base, name: 'Alvás', metric_key: 'sleep_hours', icon: 'moon', type: 'min', target_value: 8, unit: 'óra', sort_order: 20 },
      { ...base, name: 'Kalória', metric_key: 'calories', icon: 'flame', type: 'range', target_value: 2400, tolerance_pct: 5, unit: 'kcal', sort_order: 30 },
      { ...base, name: 'Víz', metric_key: 'water', icon: 'droplet', type: 'min', target_value: 2.5, unit: 'l', sort_order: 40 },
      { ...base, name: 'Képernyőidő', metric_key: 'screen_time', icon: 'smartphone', type: 'max', target_value: 180, unit: 'perc', sort_order: 50 },
      { ...base, name: 'Lefekvés', metric_key: 'bedtime', icon: 'bed-double', type: 'time', target_time: '23:00', sort_order: 60 },
      { ...base, name: 'Edzés', icon: 'dumbbell', type: 'binary', sort_order: 70 },
      { ...base, name: 'Nyakerősítés', icon: 'activity', type: 'binary', system_key: 'neck', sort_order: 80 },
      { ...base, name: 'Kiegészítők', icon: 'pill', type: 'binary', system_key: 'supplements', sort_order: 90 },
      { ...base, name: 'Leszokás', icon: 'shield', type: 'binary', system_key: 'quit', sort_order: 100 },
      { ...base, name: 'Fogmosás', icon: 'sparkles', type: 'binary', system_key: 'toothbrush', counts_toward_score: false, sort_order: 110 },
    ]

    mutate((s) => {
      s.habits = defs.map((d) => ({ ...d, id: uid(), created_at: now() }))
      s.supplements = [
        { id: uid(), name: 'D-vitamin', dosage: '2000 NE', schedule: 'reggel', active: true, sort_order: 10 },
        { id: uid(), name: 'Omega-3', dosage: '1 g', schedule: 'étkezéssel', active: true, sort_order: 20 },
      ]
      s.settings = { ...DEFAULT_SETTINGS }
    })
  },
}
