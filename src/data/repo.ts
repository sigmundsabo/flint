// Adat-hozzáférési réteg (02-scaffold-mappastruktura.md).
// A UI SOHA nem hív közvetlenül Supabase-t — mindig ezen az interfészen keresztül.
// Két implementáció: Supabase (éles) és localStorage (amíg nincs .env kitöltve).

import type {
  AppSettings, DailyReview, Habit, HabitLog, HealthMetrics,
  Supplement, SupplementLog, WeightLog, Workout,
} from '@/lib/types'

export type NewHabit = Omit<Habit, 'id' | 'created_at'>
export type HabitPatch = Partial<Omit<Habit, 'id' | 'created_at'>>

/** Új edzés. A dátum és a típus kötelező, a többi mező opcionális. */
export type NewWorkout = Pick<Workout, 'date' | 'type'> &
  Partial<Omit<Workout, 'id' | 'date' | 'type'>>

export interface HabitLogInput {
  habit_id: string
  date: string
  done?: boolean | null
  value?: number | null
  time_value?: string | null
}

export interface Repo {
  // --- habits -------------------------------------------------------------
  listHabits(): Promise<Habit[]>
  createHabit(input: NewHabit): Promise<Habit>
  updateHabit(id: string, patch: HabitPatch): Promise<void>
  deleteHabit(id: string): Promise<void>

  // --- habit_logs ---------------------------------------------------------
  listHabitLogs(fromDate: string, toDate: string): Promise<HabitLog[]>
  setHabitLog(input: HabitLogInput): Promise<void>
  clearHabitLog(habitId: string, date: string): Promise<void>
  deleteHabitLogsForDate(date: string): Promise<number>

  // --- health_metrics -----------------------------------------------------
  listHealthMetrics(fromDate: string, toDate: string): Promise<HealthMetrics[]>
  upsertHealthMetrics(date: string, patch: Partial<Omit<HealthMetrics, 'id' | 'date'>>): Promise<void>

  // --- weight_logs --------------------------------------------------------
  listWeightLogs(fromDate: string, toDate: string): Promise<WeightLog[]>
  addWeightLog(input: { date: string; measured_at: string; weight: number; note?: string | null }): Promise<void>
  deleteWeightLog(id: string): Promise<void>

  // --- workouts -----------------------------------------------------------
  listWorkouts(fromDate: string, toDate: string): Promise<Workout[]>
  addWorkout(input: NewWorkout): Promise<void>
  deleteWorkout(id: string): Promise<void>

  // --- daily_reviews ------------------------------------------------------
  listDailyReviews(fromDate: string, toDate: string): Promise<DailyReview[]>
  upsertDailyReview(date: string, patch: Partial<Omit<DailyReview, 'id' | 'date'>>): Promise<void>

  // --- supplements --------------------------------------------------------
  listSupplements(): Promise<Supplement[]>
  createSupplement(input: Omit<Supplement, 'id'>): Promise<void>
  updateSupplement(id: string, patch: Partial<Omit<Supplement, 'id'>>): Promise<void>
  deleteSupplement(id: string): Promise<void>
  listSupplementLogs(fromDate: string, toDate: string): Promise<SupplementLog[]>
  setSupplementLog(supplementId: string, date: string, taken: boolean): Promise<void>
  deleteSupplementLogsForDate(date: string): Promise<number>

  // --- settings -----------------------------------------------------------
  loadSettings(): Promise<AppSettings>
  saveSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void>

  // --- egyéb --------------------------------------------------------------
  seedDefaults(): Promise<void>
}
