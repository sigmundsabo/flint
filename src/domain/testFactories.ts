import type { Habit, HabitLog } from '@/lib/types'

export function makeHabit(partial: Partial<Habit> & Pick<Habit, 'id' | 'type'>): Habit {
  return {
    name: partial.id,
    icon: 'circle',
    target_value: null,
    tolerance_pct: null,
    target_time: null,
    unit: null,
    frequency: 'daily',
    weight: 1,
    counts_toward_score: true,
    system_key: null,
    metric_key: null,
    active: true,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    ...partial,
  }
}

export function makeLog(
  partial: Partial<HabitLog> & Pick<HabitLog, 'habit_id' | 'date'>,
): HabitLog {
  return {
    id: `${partial.habit_id}-${partial.date}`,
    done: null,
    value: null,
    time_value: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...partial,
  }
}

export function logMap(logs: HabitLog[]): Map<string, HabitLog> {
  return new Map(logs.map((l) => [l.habit_id, l]))
}
