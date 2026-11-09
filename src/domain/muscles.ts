// Izomcsoport-követés: melyik gyakorlat mit terhel, és ebből mennyi jött össze.
//
// A számítás alapja az „effektív sorozat": egy gyakorlat minden izomcsoporthoz
// súlyt kap (1 = elsődleges, 0,5 = másodlagos, 0,25 = érintőleges), és egy
// kipipált sorozat ennyivel növeli az adott csoport számlálóját. A fekvenyomás
// tehát 1 mell + 0,5 tricepsz sorozatot ad, nem kettő teljeset — különben a
// nyomások háromszor beszámítanák a tricepszet, és a terv kiegyensúlyozottnak
// látszana ott is, ahol nem az.
//
// Csak a KIPIPÁLT sorozatok számítanak, ugyanúgy, mint a megmozgatott súlynál
// (`calcVolume`): a félig kitöltött sor nem edzés.

import type { PlanExercise, Workout, WorkoutDay, WorkoutSets } from '@/lib/types'

export type MuscleId =
  | 'chest' | 'back' | 'shoulders' | 'traps' | 'biceps'
  | 'triceps' | 'quads' | 'hams' | 'calves' | 'abs'

export interface MuscleGroup {
  id: MuscleId
  /** Teljes név a listához. */
  label: string
  /** Rövid név a pókhálódiagram tengelyeire — ott nincs hely. */
  short: string
}

/**
 * Tíz csoport. Szándékosan nem több: a pókhálódiagram tengelyfeliratainak el
 * kell férniük egy telefon szélességében. Ezért van az alkar a bicepszbe
 * olvasztva (mindkettőt könyökhajlítás viszi), és a farizom a combhajlítóba
 * (a hátsó lánc együtt mozog).
 */
export const MUSCLE_GROUPS: MuscleGroup[] = [
  { id: 'chest', label: 'Mell', short: 'Mell' },
  { id: 'shoulders', label: 'Váll', short: 'Váll' },
  { id: 'triceps', label: 'Tricepsz', short: 'Tricepsz' },
  { id: 'abs', label: 'Has', short: 'Has' },
  { id: 'quads', label: 'Comb', short: 'Comb' },
  { id: 'calves', label: 'Vádli', short: 'Vádli' },
  { id: 'hams', label: 'Combhajlító', short: 'Hajlító' },
  { id: 'biceps', label: 'Bicepsz (+ alkar)', short: 'Bicepsz' },
  { id: 'traps', label: 'Trapéz', short: 'Trapéz' },
  { id: 'back', label: 'Hát', short: 'Hát' },
]

export const MUSCLE_LABEL: Record<MuscleId, string> = Object.fromEntries(
  MUSCLE_GROUPS.map((g) => [g.id, g.label]),
) as Record<MuscleId, string>

/** Izomcsoport → részesedés (1 = elsődleges, 0,5 = másodlagos). */
export type MuscleShare = Partial<Record<MuscleId, number>>

/**
 * A RÉGI (PPLUL) terv gyakorlatai. A tervet lecseréltük, de a napló 31 edzése
 * a régi azonosítókra hivatkozik — enélkül az addigi terhelés eltűnne a
 * statisztikából. Amelyik mozgás megmaradt, annak az azonosítója az új terv
 * `legacyIds` mezőjében van, és onnan öröklődik; itt csak azok szerepelnek,
 * amik kiestek a tervből.
 */
export const LEGACY_MUSCLES: Record<string, MuscleShare> = {
  tue_1: { chest: 1, shoulders: 0.5, triceps: 0.5 }, // Döntött pados nyomás kézisúlyzókkal
  tue_7: { chest: 1 }, // Cable fly High to Low
  wed_1: { quads: 1 }, // Lábnyújtó gép
  wed_2: { quads: 1, hams: 0.5 }, // Guggolás Smith kereten
  wed_3: { hams: 0.5 }, // Abductor gép
  wed_4: { hams: 1 }, // Fekvő lábhajlító gép
  wed_6: { abs: 1 }, // Hiperextenziós felülés
  wed_7: { abs: 1 }, // Russian twist
  wed_8: { abs: 1 }, // Lógó térdfelhúzás
  sat_1: { quads: 1, hams: 0.5 }, // Guggolás Smith kereten
  sat_2: { hams: 1 }, // Csípőfeszítő gép
  sat_4: { hams: 0.5 }, // Abductor gép
  sat_5: { abs: 1 },
  sat_6: { abs: 1 },
  sat_7: { abs: 1 },
}

/**
 * Gyakorlat-azonosító → izomcsoportok. Az aktuális tervből épül (a `legacyIds`
 * alatt futó régi azonosítókkal együtt), a maradékot a `LEGACY_MUSCLES` adja.
 */
export function buildMuscleIndex(plan: WorkoutDay[] | undefined): Map<string, MuscleShare> {
  const index = new Map<string, MuscleShare>(Object.entries(LEGACY_MUSCLES))
  for (const day of plan ?? []) {
    for (const ex of day.exercises) {
      const share = ex.muscles
      if (!share) continue
      index.set(ex.id, share)
      for (const legacy of ex.legacyIds ?? []) index.set(legacy, share)
    }
  }
  return index
}

export interface MuscleLoad {
  /** Effektív sorozat: a részesedésekkel súlyozva. */
  sets: number
  /** Ismétlés × részesedés. */
  reps: number
  /** Megmozgatott súly (kg) × részesedés. */
  volume: number
}

export type MuscleTotals = Record<MuscleId, MuscleLoad>

export function emptyTotals(): MuscleTotals {
  const out = {} as MuscleTotals
  for (const g of MUSCLE_GROUPS) out[g.id] = { sets: 0, reps: 0, volume: 0 }
  return out
}

/** Egy edzés sorozatait hozzáadja a futó összegzéshez. */
export function addWorkoutSets(
  totals: MuscleTotals,
  sets: WorkoutSets | null | undefined,
  index: Map<string, MuscleShare>,
): MuscleTotals {
  if (!sets) return totals
  for (const [exerciseId, rec] of Object.entries(sets)) {
    const share = index.get(exerciseId)
    if (!share) continue
    for (const s of rec.sets) {
      if (!s.done) continue
      for (const [muscle, weight] of Object.entries(share) as [MuscleId, number][]) {
        const slot = totals[muscle]
        if (!slot) continue
        slot.sets += weight
        slot.reps += (s.r ?? 0) * weight
        slot.volume += (s.w ?? 0) * (s.r ?? 0) * weight
      }
    }
  }
  return totals
}

/** Több edzés összesítve — ez megy a pókhálódiagramba. */
export function muscleTotals(
  workouts: Workout[],
  index: Map<string, MuscleShare>,
): MuscleTotals {
  const totals = emptyTotals()
  for (const w of workouts) addWorkoutSets(totals, w.sets, index)
  return round(totals)
}

function round(totals: MuscleTotals): MuscleTotals {
  for (const g of MUSCLE_GROUPS) {
    const t = totals[g.id]
    t.sets = Math.round(t.sets * 100) / 100
    t.reps = Math.round(t.reps)
    t.volume = Math.round(t.volume)
  }
  return totals
}

/**
 * Amit a tervnap ÍGÉR: minden előírt sorozat beszámít, függetlenül attól, hogy
 * ki van-e pipálva. Ez a pókhálódiagram halvány külső kontúrja.
 */
export function plannedTotals(
  day: WorkoutDay | undefined,
  index: Map<string, MuscleShare>,
): MuscleTotals {
  const totals = emptyTotals()
  if (!day) return totals
  for (const ex of day.exercises) {
    const share = index.get(ex.id) ?? ex.muscles
    if (!share) continue
    for (const [muscle, weight] of Object.entries(share) as [MuscleId, number][]) {
      const slot = totals[muscle]
      if (slot) slot.sets += ex.sets * weight
    }
  }
  return round(totals)
}

/** Nyers sorozatszám: „8 / 24" — pipálva / összesen. */
export function countSets(sets: WorkoutSets | null | undefined): { done: number; total: number } {
  let done = 0
  let total = 0
  for (const rec of Object.values(sets ?? {})) {
    for (const s of rec.sets) {
      total += 1
      if (s.done) done += 1
    }
  }
  return { done, total }
}

/**
 * Heti ajánlott sorozatszám izomcsoportonként. Az edzéstudományban gyakran
 * idézett 10–20 sorozatos sáv alsó széle; nem szabály, hanem viszonyítás,
 * ezért a felületen is így van megfogalmazva.
 */
export const WEEKLY_SET_TARGET = 10

/** Van-e egyáltalán izomcsoport-adat? (Régi, sorozat nélküli naplónál nincs.) */
export function hasMuscleData(totals: MuscleTotals): boolean {
  return MUSCLE_GROUPS.some((g) => totals[g.id].sets > 0)
}

/** Egy gyakorlat izomcsoportjai, olvasható formában: „Mell · Tricepsz". */
export function describeMuscles(ex: PlanExercise): string {
  const share = ex.muscles
  if (!share) return ''
  return (Object.entries(share) as [MuscleId, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => MUSCLE_LABEL[id])
    .filter(Boolean)
    .join(' · ')
}
