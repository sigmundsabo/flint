// Az adatbázis-séma TypeScript tükörképe (supabase/migrations/001_schema.sql).

import type { MuscleShare } from '@/domain/muscles'

export type HabitType = 'binary' | 'min' | 'max' | 'range' | 'time'
export type HabitFrequency = 'daily' | 'weekdays' | 'weekends'

/** Rendszerkulcs a különleges viselkedésű habitokhoz. */
export type SystemKey = 'quit' | 'toothbrush' | 'neck' | 'supplements'

/** A health_metrics tábla numerikus/idő oszlopai, amikhez habit köthető. */
export type MetricKey = 'steps' | 'calories' | 'sleep_hours' | 'water' | 'screen_time' | 'bedtime'

export interface Habit {
  id: string
  name: string
  icon: string
  type: HabitType
  /** min → alsó határ | max → felső limit | range → középérték */
  target_value: number | null
  /** range → ± tűrés százalékban */
  tolerance_pct: number | null
  /** time → határidő, 'HH:MM' vagy 'HH:MM:SS' */
  target_time: string | null
  unit: string | null
  frequency: HabitFrequency
  weight: number
  /** false → nem számít a napi pontszámba (fogmosás) */
  counts_toward_score: boolean
  system_key: SystemKey | null
  /** health_metrics oszlopnév, ha a habit egy nyers mérést tükröz. */
  metric_key: MetricKey | null
  active: boolean
  sort_order: number
  created_at: string
}

export interface HabitLog {
  id: string
  habit_id: string
  /** 'YYYY-MM-DD' */
  date: string
  done: boolean | null
  value: number | null
  /** 'HH:MM' vagy 'HH:MM:SS' */
  time_value: string | null
  created_at: string
  updated_at: string
}

export interface HealthMetrics {
  id: string
  date: string
  steps: number | null
  calories: number | null
  sleep_hours: number | null
  water: number | null
  screen_time: number | null
  bedtime: string | null
}

export interface WeightLog {
  id: string
  date: string
  measured_at: string
  weight: number
  note: string | null
}

export interface Workout {
  id: string
  date: string
  type: string
  duration: number | null
  note: string | null
  /** Melyik tervnap (PPLUL id), ha tervből indult. */
  day_id: string | null
  /** Megmozgatott súly kg-ban, a sorozatokból számolva. */
  total_volume: number | null
  duration_sec: number | null
  calories: number | null
  avg_hr: number | null
  max_hr: number | null
  sets: WorkoutSets | null
}

export interface DailyReview {
  id: string
  date: string
  mood: number | null
  energy: number | null
  stress: number | null
  note: string | null
}

export interface Supplement {
  id: string
  name: string
  dosage: string | null
  schedule: string | null
  active: boolean
  sort_order: number
}

export interface SupplementLog {
  id: string
  supplement_id: string
  date: string
  taken: boolean
}

export interface NeckExercise {
  name: string
  seconds: number
}

/* --- Edzésterv (Lower / Upper / Anterior / Posterior) -------------------- */

export type WorkoutPhase = 'hyper' | 'strength'

export interface PlanExercise {
  /**
   * Mozgás-azonosító, NEM napra vetítve: ha ugyanaz a gyakorlat két napon is
   * szerepel (pl. a chest press az Upperben és az Anteriorban), ugyanazt az
   * azonosítót kapja. Így az „Előző" referencia a mozgás teljes előzményét
   * látja, nem csak az adott napét.
   */
  id: string
  name: string
  sets: number
  repMin: number
  repMax: number
  tip: string
  /** Izomcsoport → részesedés (1 = elsődleges, 0,5 = másodlagos). */
  muscles?: MuscleShare
  /**
   * A régi (PPLUL) terv azonosítói ugyanerre a mozgásra. Csak olvasásra kell:
   * ezeken keresztül marad meg a 31 korábbi edzés előzménye és
   * izomcsoport-bontása, anélkül hogy a naplót át kellene írni.
   */
  legacyIds?: string[]
}

export interface WorkoutDay {
  id: string
  name: string
  phase: WorkoutPhase
  exercises: PlanExercise[]
}

/**
 * Az edzésnapló korábbi összesítése. A tételes előzmény a másik appban maradt;
 * ide csak a két összesítő szám jön át, hogy a statisztika ne nulláról induljon.
 */
export interface WorkoutBaseline {
  sessions: number
  volumeKg: number
}

/** A settings tábla ismert kulcsai és értéktípusai. */
export interface AppSettings {
  daily_threshold_pct: number
  target_weight: number | null
  workout_types: string[]
  neck_exercises: NeckExercise[]
  toothbrush_seconds: number
  /**
   * MELYIK edzésterv aktív. Maga a terv a kódban él (`src/data/plans/`), itt
   * csak a választás van eltéve.
   *
   * Korábban a teljes tervet ide mentettük (`workout_plan`), verziószámmal és
   * egyszeri frissítéssel. Az a megoldás abból a feltevésből indult, hogy EGY
   * terv van, ami időnként cserélődik — két terv mellett viszont ugyanannak az
   * adatnak két forrása lett volna, és a kettő elcsúszik. (El is csúszott: a
   * `seed_defaults` még a régi tervet adta az új felhasználóknak.)
   */
  active_plan: PlanId
  workout_baseline: WorkoutBaseline
}

/** A beépített edzéstervek azonosítói. A terveket a `src/data/plans/` írja le. */
export type PlanId = 'ulap' | 'pplul'

export const DEFAULT_SETTINGS: AppSettings = {
  daily_threshold_pct: 80,
  target_weight: null,
  workout_types: ['Konditerem', 'Futás', 'Kerékpár', 'Úszás', 'Nyakerősítés', 'Séta', 'Egyéb'],
  neck_exercises: [
    { name: 'Izometrikus előre', seconds: 30 },
    { name: 'Izometrikus hátra', seconds: 30 },
    { name: 'Izometrikus oldalra (bal)', seconds: 30 },
    { name: 'Izometrikus oldalra (jobb)', seconds: 30 },
    { name: 'Áll behúzás', seconds: 45 },
    { name: 'Nyakforgatás', seconds: 45 },
  ],
  toothbrush_seconds: 180,
  active_plan: 'ulap',
  // Az edzsterv.netlify.app-ban felhalmozott előzmény, 2026-09-01-i állás.
  workout_baseline: { sessions: 0, volumeKg: 0 },
}

/* --- Sorozat-szintű edzésrögzítés --------------------------------------- */

export interface WorkoutSet {
  /** Súly kg-ban. */
  w: number | null
  /** Ismétlés. */
  r: number | null
  done: boolean
}

/** Gyakorlat-azonosító → az adott gyakorlat sorozatai. */
export type WorkoutSets = Record<string, { sets: WorkoutSet[] }>

export interface WorkoutHealth {
  calories: number | null
  avgHr: number | null
  maxHr: number | null
}
