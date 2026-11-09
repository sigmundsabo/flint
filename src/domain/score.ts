// 10-napi-pontszam-kuszob-streak.md
//
// A napi teljesítmény ARÁNYOSAN számolt százalék, nem darabszám. Minden habit
// súlyozottan számít (alapértelmezetten mindegyik súlya 1, azaz egyenlő) —
// a súly a `habits.weight` oszlopból jön, Beállításokból szerkeszthető.

import type { Habit, HabitLog } from '@/lib/types'
import { evaluateHabit, habitGroup, scorableHabitsOn, type HabitGroup } from './evaluate'
import { addDaysKey, toDateKey } from '@/lib/date'

export interface DailyScore {
  date: string
  /** 0–100 */
  pct: number
  /** Hány habit teljesült (darab, csak kijelzéshez) */
  completedCount: number
  /** Hány habit volt aznap érvényes */
  applicableCount: number
  weightDone: number
  weightTotal: number
}

export const EMPTY_SCORE = (date: string): DailyScore => ({
  date,
  pct: 0,
  completedCount: 0,
  applicableCount: 0,
  weightDone: 0,
  weightTotal: 0,
})

/**
 * Egy nap összesített teljesítmény-százaléka.
 * `logs` az adott napra vonatkozó logok (habit_id → log).
 */
export function dailyScore(
  habits: Habit[],
  logsByHabitId: Map<string, HabitLog>,
  dateKey: string,
): DailyScore {
  const applicable = scorableHabitsOn(habits, dateKey)
  if (applicable.length === 0) return EMPTY_SCORE(dateKey)

  let weightTotal = 0
  let weightDone = 0
  let completedCount = 0

  for (const habit of applicable) {
    weightTotal += habit.weight
    if (evaluateHabit(habit, logsByHabitId.get(habit.id))) {
      weightDone += habit.weight
      completedCount += 1
    }
  }

  return {
    date: dateKey,
    pct: weightTotal === 0 ? 0 : Math.round((weightDone / weightTotal) * 100),
    completedCount,
    applicableCount: applicable.length,
    weightDone,
    weightTotal,
  }
}

/** Sikeres-e a nap? A küszöb a settings táblából jön (alap: 80%). */
export function isSuccessfulDay(pct: number, thresholdPct: number): boolean {
  return pct >= thresholdPct
}

/**
 * Napi pontszámok egy dátumtartományra. A logokat dátum szerint csoportosítva
 * várja — így egyetlen lekérdezésből újraszámolható az egész előzmény
 * (utólagos szerkesztés után is).
 */
export function scoreRange(
  habits: Habit[],
  logsByDate: Map<string, Map<string, HabitLog>>,
  fromKey: string,
  toKey: string,
): DailyScore[] {
  const out: DailyScore[] = []
  let cursor = fromKey
  let guard = 0
  while (cursor <= toKey && guard < 4000) {
    out.push(dailyScore(habits, logsByDate.get(cursor) ?? new Map(), cursor))
    cursor = addDaysKey(cursor, 1)
    guard += 1
  }
  return out
}

export interface StreakResult {
  current: number
  best: number
}

/**
 * Streak a NAPI %-pontszámból, nem habitonként.
 *
 * A mai nap még folyamatban van, ezért nem szakítja meg a sorozatot: ha ma még
 * nincs meg a küszöb, a számolás tegnaptól indul. Egy sikeres mai nap viszont
 * már beleszámít.
 */
export function computeStreaks(
  scores: DailyScore[],
  thresholdPct: number,
  todayKey: string = toDateKey(),
): StreakResult {
  const successByDate = new Map<string, boolean>()
  for (const s of scores) successByDate.set(s.date, isSuccessfulDay(s.pct, thresholdPct))

  // --- jelenlegi streak: visszafelé a mai naptól ---
  let current = 0
  let cursor = todayKey
  if (!successByDate.get(todayKey)) {
    cursor = addDaysKey(todayKey, -1) // a folyamatban lévő mai nap nem tör
  }
  while (successByDate.get(cursor)) {
    current += 1
    cursor = addDaysKey(cursor, -1)
  }

  // --- valaha volt legjobb streak ---
  const sorted = [...scores].sort((a, b) => a.date.localeCompare(b.date))
  let best = 0
  let run = 0
  let prevDate: string | null = null
  for (const s of sorted) {
    const ok = isSuccessfulDay(s.pct, thresholdPct)
    const contiguous = prevDate !== null && addDaysKey(prevDate, 1) === s.date
    if (ok) {
      run = contiguous ? run + 1 : 1
      if (run > best) best = run
    } else {
      run = 0
    }
    prevDate = s.date
  }

  return { current, best: Math.max(best, current) }
}

/**
 * A Leszokás habit saját streakje: egymást követő napok, amikor a Leszokás log `done`.
 * A mai nap itt is türelmi napot kap, amíg nincs róla bejegyzés.
 */
export function computeHabitStreak(
  doneByDate: Map<string, boolean>,
  todayKey: string = toDateKey(),
): StreakResult {
  let current = 0
  let cursor = todayKey
  if (!doneByDate.get(todayKey)) cursor = addDaysKey(todayKey, -1)
  while (doneByDate.get(cursor)) {
    current += 1
    cursor = addDaysKey(cursor, -1)
  }

  const dates = [...doneByDate.keys()].sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const d of dates) {
    const contiguous = prev !== null && addDaysKey(prev, 1) === d
    if (doneByDate.get(d)) {
      run = contiguous ? run + 1 : 1
      if (run > best) best = run
    } else {
      run = 0
    }
    prev = d
  }
  return { current, best: Math.max(best, current) }
}

export interface GroupScore {
  group: HabitGroup
  pct: number
  completedCount: number
  applicableCount: number
}

/**
 * Területenkénti alpontszám ugyanarra a napra. Ugyanaz a súlyozott számítás
 * fut, csak a habitok egy részhalmazára — így a három pill összege konzisztens
 * a fő pontszámmal.
 */
export function groupScores(
  habits: Habit[],
  logsByHabitId: Map<string, HabitLog>,
  dateKey: string,
): GroupScore[] {
  const groups: HabitGroup[] = ['egeszseg', 'edzes', 'szokasok']
  return groups.map((group) => {
    const subset = habits.filter((h) => habitGroup(h) === group)
    const score = dailyScore(subset, logsByHabitId, dateKey)
    return {
      group,
      pct: score.pct,
      completedCount: score.completedCount,
      applicableCount: score.applicableCount,
    }
  })
}

export interface HabitCompletionRate {
  habit: Habit
  done: number
  applicable: number
  /** 0–100 */
  pct: number
}

/** Szokásonkénti teljesítési arány — melyik a leggyengébb láncszem. */
export function completionRates(
  habits: Habit[],
  logsByDate: Map<string, Map<string, HabitLog>>,
  dateKeys: string[],
): HabitCompletionRate[] {
  return habits
    .filter((h) => h.active && h.counts_toward_score)
    .map((habit) => {
      let done = 0
      let applicable = 0
      for (const dateKey of dateKeys) {
        if (!scorableHabitsOn([habit], dateKey).length) continue
        applicable += 1
        if (evaluateHabit(habit, logsByDate.get(dateKey)?.get(habit.id))) done += 1
      }
      return {
        habit,
        done,
        applicable,
        pct: applicable === 0 ? 0 : Math.round((done / applicable) * 100),
      }
    })
    .sort((a, b) => a.pct - b.pct)
}
