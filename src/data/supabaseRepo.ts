import { getSupabase } from '@/lib/supabase'
import { DEFAULT_SETTINGS, type AppSettings } from '@/lib/types'
import type { HabitLogInput, HabitPatch, NewHabit, NewWorkout, Repo } from './repo'

/**
 * Minden metódus első sora `const supabase = await getSupabase()`.
 *
 * A kliens lusta kötegből jön (lásd `lib/supabase.ts`), a `Repo` felület
 * viszont változatlan marad: a hívók nem tudnak róla, hogy a köteg esetleg
 * most érkezik. A `getSupabase()` a MÁSODIK hívástól ugyanazt a beígért
 * klienst adja vissza, tehát ez nem harminc letöltés, csak egy.
 */
function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export const supabaseRepo: Repo = {
  // --- habits -------------------------------------------------------------
  async listHabits() {
    const supabase = await getSupabase()
    return unwrap(
      await supabase.from('habits').select('*').order('sort_order').order('name'),
    )
  },
  async createHabit(input: NewHabit) {
    const supabase = await getSupabase()
    return unwrap(await supabase.from('habits').insert(input).select().single())
  },
  async updateHabit(id: string, patch: HabitPatch) {
    const supabase = await getSupabase()
    const { error } = await supabase.from('habits').update(patch).eq('id', id)
    if (error) throw new Error(error.message)
  },
  async deleteHabit(id: string) {
    const supabase = await getSupabase()
    const { error } = await supabase.from('habits').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  // --- habit_logs ---------------------------------------------------------
  async listHabitLogs(fromDate, toDate) {
    const supabase = await getSupabase()
    return unwrap(
      await supabase.from('habit_logs').select('*').gte('date', fromDate).lte('date', toDate),
    )
  },
  async setHabitLog(input: HabitLogInput) {
    const supabase = await getSupabase()
    const { error } = await supabase.from('habit_logs').upsert(
      {
        habit_id: input.habit_id,
        date: input.date,
        done: input.done ?? null,
        value: input.value ?? null,
        time_value: input.time_value ?? null,
      },
      { onConflict: 'habit_id,date' },
    )
    if (error) throw new Error(error.message)
  },
  async clearHabitLog(habitId, date) {
    const supabase = await getSupabase()
    const { error } = await supabase
      .from('habit_logs').delete().eq('habit_id', habitId).eq('date', date)
    if (error) throw new Error(error.message)
  },
  async deleteHabitLogsForDate(date) {
    const supabase = await getSupabase()
    const { data, error } = await supabase
      .from('habit_logs').delete().eq('date', date).select('id')
    if (error) throw new Error(error.message)
    return data?.length ?? 0
  },

  // --- health_metrics -----------------------------------------------------
  async listHealthMetrics(fromDate, toDate) {
    const supabase = await getSupabase()
    return unwrap(
      await supabase.from('health_metrics').select('*').gte('date', fromDate).lte('date', toDate),
    )
  },
  async upsertHealthMetrics(date, patch) {
    const supabase = await getSupabase()
    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('health_metrics')
      .upsert({ user_id: userData.user?.id, date, ...patch }, { onConflict: 'user_id,date' })
    if (error) throw new Error(error.message)
  },

  // --- weight_logs --------------------------------------------------------
  async listWeightLogs(fromDate, toDate) {
    const supabase = await getSupabase()
    return unwrap(
      await supabase.from('weight_logs').select('*')
        .gte('date', fromDate).lte('date', toDate).order('measured_at'),
    )
  },
  async addWeightLog(input) {
    const supabase = await getSupabase()
    const { error } = await supabase.from('weight_logs').insert({
      date: input.date, measured_at: input.measured_at,
      weight: input.weight, note: input.note ?? null,
    })
    if (error) throw new Error(error.message)
  },
  async deleteWeightLog(id) {
    const supabase = await getSupabase()
    const { error } = await supabase.from('weight_logs').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  // --- workouts -----------------------------------------------------------
  async listWorkouts(fromDate, toDate) {
    const supabase = await getSupabase()
    return unwrap(
      await supabase.from('workouts').select('*')
        .gte('date', fromDate).lte('date', toDate).order('date', { ascending: false }),
    )
  },
  async addWorkout(input: NewWorkout) {
    const supabase = await getSupabase()
    const { error } = await supabase.from('workouts').insert(input)
    if (error) throw new Error(error.message)
  },
  async deleteWorkout(id) {
    const supabase = await getSupabase()
    const { error } = await supabase.from('workouts').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  // --- daily_reviews ------------------------------------------------------
  async listDailyReviews(fromDate, toDate) {
    const supabase = await getSupabase()
    return unwrap(
      await supabase.from('daily_reviews').select('*').gte('date', fromDate).lte('date', toDate),
    )
  },
  async upsertDailyReview(date, patch) {
    const supabase = await getSupabase()
    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('daily_reviews')
      .upsert({ user_id: userData.user?.id, date, ...patch }, { onConflict: 'user_id,date' })
    if (error) throw new Error(error.message)
  },

  // --- supplements --------------------------------------------------------
  async listSupplements() {
    const supabase = await getSupabase()
    return unwrap(await supabase.from('supplements').select('*').order('sort_order'))
  },
  async createSupplement(input) {
    const supabase = await getSupabase()
    const { error } = await supabase.from('supplements').insert(input)
    if (error) throw new Error(error.message)
  },
  async updateSupplement(id, patch) {
    const supabase = await getSupabase()
    const { error } = await supabase.from('supplements').update(patch).eq('id', id)
    if (error) throw new Error(error.message)
  },
  async deleteSupplement(id) {
    const supabase = await getSupabase()
    const { error } = await supabase.from('supplements').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
  async listSupplementLogs(fromDate, toDate) {
    const supabase = await getSupabase()
    return unwrap(
      await supabase.from('supplement_logs').select('*').gte('date', fromDate).lte('date', toDate),
    )
  },
  async setSupplementLog(supplementId, date, taken) {
    const supabase = await getSupabase()
    const { error } = await supabase
      .from('supplement_logs')
      .upsert({ supplement_id: supplementId, date, taken }, { onConflict: 'supplement_id,date' })
    if (error) throw new Error(error.message)
  },
  async deleteSupplementLogsForDate(date) {
    const supabase = await getSupabase()
    const { data, error } = await supabase
      .from('supplement_logs').delete().eq('date', date).select('id')
    if (error) throw new Error(error.message)
    return data?.length ?? 0
  },

  // --- settings -----------------------------------------------------------
  async loadSettings() {
    const supabase = await getSupabase()
    const rows = unwrap<{ key: string; value: unknown }[]>(
      await supabase.from('settings').select('key, value'),
    )
    const out: Record<string, unknown> = { ...DEFAULT_SETTINGS }
    for (const row of rows ?? []) {
      if (row.key in out) out[row.key] = row.value
    }
    return out as unknown as AppSettings
  },
  async saveSetting(key, value) {
    const supabase = await getSupabase()
    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('settings')
      .upsert({ user_id: userData.user?.id, key, value }, { onConflict: 'user_id,key' })
    if (error) throw new Error(error.message)
  },

  // --- egyéb --------------------------------------------------------------
  async seedDefaults() {
    const supabase = await getSupabase()
    const { error } = await supabase.rpc('seed_defaults')
    if (error) throw new Error(error.message)
  },
}
