// Az edzsterv.netlify.app logikájának átemelése, tiszta, tesztelhető formában.

import type { PlanExercise, Workout, WorkoutDay, WorkoutSet, WorkoutSets } from '@/lib/types'
import { addDaysKey } from '@/lib/date'

/** Üres sorozatlista egy tervnaphoz — annyi sorozat, amennyit a terv előír. */
export function freshSets(day: WorkoutDay): WorkoutSets {
  const out: WorkoutSets = {}
  for (const ex of day.exercises) {
    out[ex.id] = { sets: Array.from({ length: ex.sets }, () => ({ w: null, r: null, done: false })) }
  }
  return out
}

/**
 * A meglévő piszkozatot hozzáigazítja a tervhez: hiányzó gyakorlat vagy
 * sorozat pótlódik, a már beírt értékek megmaradnak. Erre azért van szükség,
 * mert a terv a Beállításokból szerkeszthető — közben is változhat.
 */
export function reconcileSets(existing: WorkoutSets | null, day: WorkoutDay): WorkoutSets {
  if (!existing) return freshSets(day)
  const out: WorkoutSets = {}
  for (const ex of day.exercises) {
    const prev = existing[ex.id]?.sets ?? []
    const sets = prev.slice()
    while (sets.length < ex.sets) sets.push({ w: null, r: null, done: false })
    out[ex.id] = { sets }
  }
  return out
}

/**
 * Megmozgatott súly: csak a KIPIPÁLT sorozatok számítanak, és csak akkor, ha
 * súly és ismétlés is meg van adva. A félig kitöltött sor nem szám.
 */
export function calcVolume(sets: WorkoutSets | null | undefined): number {
  if (!sets) return 0
  let total = 0
  for (const rec of Object.values(sets)) {
    for (const s of rec.sets) {
      if (s.done && s.w !== null && s.r !== null) total += s.w * s.r
    }
  }
  return Math.round(total * 10) / 10
}

/** Hány gyakorlatba kezdtél bele (van benne legalább egy kipipált sorozat). */
export function completedExercises(sets: WorkoutSets | null | undefined): number {
  if (!sets) return 0
  return Object.values(sets).filter((rec) => rec.sets.some((s) => s.done)).length
}

export interface PreviousReference {
  /** 'legutóbb' vagy 'előző hét' — hét napnál régebbi az utóbbi. */
  label: string
  weight: number | null
  reps: number | null
  date: string
}

/**
 * Mit nyomtál legutóbb ezen a gyakorlaton, ugyanezen a sorozat-sorszámon?
 *
 * Ez a progresszív túlterhelés referenciája: a mai sor mellett ott van, mi volt
 * a múltkor, tehát nem emlékezetből kell dolgozni. A MAI edzéseket kihagyja,
 * különben önmagát mutatná vissza.
 */
export function previousReference(
  history: Workout[],
  exerciseId: string,
  setIndex: number,
  todayKey: string,
): PreviousReference | null {
  const weekAgo = addDaysKey(todayKey, -7)

  const sorted = history
    .filter((w) => w.date < todayKey && w.sets)
    .sort((a, b) => b.date.localeCompare(a.date))

  for (const w of sorted) {
    const set = w.sets?.[exerciseId]?.sets?.[setIndex]
    if (!set) continue
    if (set.w === null && set.r === null) continue
    return {
      label: w.date <= weekAgo ? 'előző hét' : 'legutóbb',
      weight: set.w,
      reps: set.r,
      date: w.date,
    }
  }
  return null
}

/** Egy gyakorlat cél-felirata: "4 × 8–10". */
export function targetLabel(ex: PlanExercise): string {
  const reps = ex.repMin === ex.repMax ? `${ex.repMin}` : `${ex.repMin}–${ex.repMax}`
  return `${ex.sets} × ${reps}`
}

/** Másodperc → mm:ss. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

/** Minden sorozat kipipálva ennél a gyakorlatnál? */
export function isExerciseDone(sets: WorkoutSet[] | undefined): boolean {
  return Boolean(sets && sets.length > 0 && sets.every((s) => s.done))
}
