// 08-habit-tipusok-kiertekeles.md
// Tiszta, UI-mentes kiértékelő réteg. Semmilyen célérték nincs kódba égetve —
// minden a `habit` sorból jön.

import type { Habit, HabitLog, HabitFrequency } from '@/lib/types'
import { compareTimeToDeadline } from './time'
import { fromDateKey } from '@/lib/date'

/** Van-e egyáltalán rögzített érték a loghoz? (Az üres log nem "nem teljesített".) */
export function hasLogValue(habit: Habit, log: HabitLog | null | undefined): boolean {
  if (!log) return false
  switch (habit.type) {
    case 'binary':
      return log.done !== null
    case 'min':
    case 'max':
    case 'range':
      return log.value !== null
    case 'time':
      return log.time_value !== null
  }
}

/** A `range` típus alsó/felső határa a középértékből és a ± tűrés %-ból. */
export function rangeBounds(habit: Habit): { low: number; high: number } | null {
  if (habit.target_value === null) return null
  const tol = habit.tolerance_pct ?? 0
  const delta = (habit.target_value * tol) / 100
  return { low: habit.target_value - delta, high: habit.target_value + delta }
}

/**
 * Teljesítve van-e a habit az adott logban?
 *
 *   binary → done === true
 *   min    → érték ≥ cél
 *   max    → érték ≤ limit
 *   range  → érték a [cél − tűrés, cél + tűrés] sávban
 *   time   → a rögzített időpont nem későbbi a határidőnél (éjfél-biztosan)
 *
 * Hiányzó adat vagy hiányzó célérték esetén false — a nem rögzített szokás
 * nem számít teljesítettnek.
 */
export function evaluateHabit(habit: Habit, log: HabitLog | null | undefined): boolean {
  if (!log) return false

  switch (habit.type) {
    case 'binary':
      return log.done === true

    case 'min':
      if (log.value === null || habit.target_value === null) return false
      return log.value >= habit.target_value

    case 'max':
      if (log.value === null || habit.target_value === null) return false
      return log.value <= habit.target_value

    case 'range': {
      const bounds = rangeBounds(habit)
      if (log.value === null || bounds === null) return false
      return log.value >= bounds.low && log.value <= bounds.high
    }

    case 'time':
      return compareTimeToDeadline(log.time_value, habit.target_time)
  }
}

/**
 * Rész-teljesítés 0..1 között — csak vizuális visszajelzéshez (haladássáv).
 * A napi pontszám NEM ebből számol, hanem az `evaluateHabit` bináris
 * eredményéből (lásd 10-napi-pontszam-kuszob-streak.md).
 */
export function habitProgress(habit: Habit, log: HabitLog | null | undefined): number {
  if (evaluateHabit(habit, log)) return 1
  if (!log) return 0

  switch (habit.type) {
    case 'min':
      if (log.value === null || !habit.target_value) return 0
      return clamp01(log.value / habit.target_value)

    case 'max': {
      // A limit alatt maradni a cél: minél közelebb a limithez, annál "telibb".
      if (log.value === null || !habit.target_value) return 0
      return clamp01(log.value / habit.target_value)
    }

    case 'range': {
      const bounds = rangeBounds(habit)
      if (log.value === null || bounds === null || !habit.target_value) return 0
      return clamp01(log.value / habit.target_value)
    }

    default:
      return 0
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

/** Érvényes-e a habit az adott napon (frequency alapján)? */
export function isHabitApplicableOn(frequency: HabitFrequency, dateKey: string): boolean {
  if (frequency === 'daily') return true
  const day = fromDateKey(dateKey).getDay() // 0 = vasárnap
  const isWeekend = day === 0 || day === 6
  return frequency === 'weekends' ? isWeekend : !isWeekend
}

/**
 * A három terület, amire a Ma-képernyő alpontszámai bontanak — ugyanaz a
 * hármas felosztás, ami a navigációban is van. (Az Opal Sleep / Focus / Rest
 * pilljeinek a megfelelője.)
 */
export type HabitGroup = 'egeszseg' | 'edzes' | 'szokasok'

export function habitGroup(habit: Habit): HabitGroup {
  if (habit.metric_key) return 'egeszseg'
  if (habit.system_key === 'neck' || habit.name.toLowerCase().startsWith('edzés')) return 'edzes'
  return 'szokasok'
}

/**
 * Az adott napon a napi pontszámba beleszámító habitok.
 * Kizárva: inaktív habitok, a nem érvényes gyakoriságúak, és a
 * `counts_toward_score = false` jelöltek (fogmosás).
 */
export function scorableHabitsOn(habits: Habit[], dateKey: string): Habit[] {
  return habits.filter(
    (h) => h.active && h.counts_toward_score && isHabitApplicableOn(h.frequency, dateKey),
  )
}

/* ==========================================================================
   Egyszavas minősítés a mért értékekhez — az Opal "Short / Great" sorainak a
   megfelelője. A szín mellett MINDIG van szöveg is, hogy színtévesztéssel is
   olvasható legyen.
   ========================================================================== */

export type HabitStatus = 'good' | 'warn' | 'bad' | 'none'

export interface HabitVerdict {
  status: HabitStatus
  /** Magyar, egyszavas minősítés. */
  label: string
  /** 0–1 a szegmentált sávhoz. */
  progress: number
}

export function habitVerdict(habit: Habit, log: HabitLog | null | undefined): HabitVerdict {
  if (!hasLogValue(habit, log)) return { status: 'none', label: 'Nincs adat', progress: 0 }
  if (evaluateHabit(habit, log)) {
    return {
      status: 'good',
      label: habit.type === 'time' ? 'Időben' : 'Rendben',
      progress: habit.type === 'max' ? clamp01((log!.value ?? 0) / (habit.target_value || 1)) : 1,
    }
  }

  switch (habit.type) {
    case 'binary':
      return { status: 'bad', label: 'Kimaradt', progress: 0 }

    case 'time':
      return { status: 'bad', label: 'Késő', progress: 1 }

    case 'min': {
      const ratio = clamp01((log!.value ?? 0) / (habit.target_value || 1))
      return ratio >= 0.7
        ? { status: 'warn', label: 'Közel', progress: ratio }
        : { status: 'bad', label: 'Kevés', progress: ratio }
    }

    case 'max': {
      const ratio = (log!.value ?? 0) / (habit.target_value || 1)
      return ratio <= 1.25
        ? { status: 'warn', label: 'Sok', progress: 1 }
        : { status: 'bad', label: 'Túl sok', progress: 1 }
    }

    case 'range': {
      const bounds = rangeBounds(habit)
      const value = log!.value ?? 0
      if (!bounds || !habit.target_value) return { status: 'bad', label: 'Kívül', progress: 0 }
      const halfBand = bounds.high - habit.target_value
      const drift = Math.abs(value - habit.target_value)
      const ratio = clamp01(value / habit.target_value)
      return drift <= halfBand * 2
        ? { status: 'warn', label: value < bounds.low ? 'Kevés' : 'Sok', progress: ratio }
        : { status: 'bad', label: 'Kívül', progress: ratio }
    }
  }
}
