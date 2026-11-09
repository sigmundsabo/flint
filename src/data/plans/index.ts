// A két edzésterv. Mindkettő a KÓDBAN él, nem a beállításokban.
//
// Korábban a terv a `settings.workout_plan` mezőben, felhasználónként
// elmentve lakott. Két terv mellett ez nem tartható: ugyanannak az adatnak
// két forrása lenne (a JSON és a mentett másolat), és a kettő elcsúszna —
// pontosan ez történt is, a `seed_defaults` még a RÉGI tervet írta be az új
// felhasználóknak. Most a beállításokban csak annyi van, MELYIK terv aktív.
//
// A napok azonosítói a két terv között NEM ütköznek (ULAP: lower/upper/
// anterior/posterior, PPLUL: mon/tue/wed/fri/sat), ezért a napló bármelyik
// terv szerinti régi edzést meg tudja nevezni, akkor is, ha épp a másik terv
// az aktív.

import type { PlanId, WorkoutDay } from '@/lib/types'
import PPLUL_DAYS from './pplul.json'
import ULAP_DAYS from './ulap.json'

export interface Plan {
  id: PlanId
  name: string
  /** Mit takar a betűszó — hogy ne kelljen fejből tudni. */
  subtitle: string
  days: WorkoutDay[]
}

export const PLANS: Record<PlanId, Plan> = {
  ulap: {
    id: 'ulap',
    name: 'ULAP',
    subtitle: 'Lower · Upper · Anterior · Posterior — 4 nap',
    days: ULAP_DAYS as WorkoutDay[],
  },
  pplul: {
    id: 'pplul',
    name: 'PPLUL',
    subtitle: 'Hát · Mell · Láb · Felső erő · Alsó erő — 5 nap',
    days: PPLUL_DAYS as WorkoutDay[],
  },
}

export const PLAN_IDS = ['ulap', 'pplul'] as const
export const DEFAULT_PLAN_ID: PlanId = 'ulap'

/** A választott terv napjai. Ismeretlen azonosítónál az alapértelmezés. */
export function planDays(id: PlanId | undefined): WorkoutDay[] {
  return PLANS[id ?? DEFAULT_PLAN_ID]?.days ?? PLANS[DEFAULT_PLAN_ID].days
}

/**
 * Egy nap megkeresése MINDKÉT tervben.
 *
 * A naplóhoz és a munkamenet-nézethez kell: a régi edzéseid a PPLUL napjai
 * alatt vannak rögzítve, és azokat akkor is meg kell tudni nevezni, amikor
 * épp az ULAP az aktív terv. Csak az aktív tervben keresve a korábbi edzések
 * neve és gyakorlatlistája eltűnne.
 */
export function findPlanDay(dayId: string | null | undefined): WorkoutDay | undefined {
  if (!dayId) return undefined
  for (const plan of Object.values(PLANS)) {
    const day = plan.days.find((d) => d.id === dayId)
    if (day) return day
  }
  return undefined
}

/**
 * Az izomtérkép forrása — MINDIG az ULAP, az aktív tervtől függetlenül.
 *
 * Az izomcsoport-részesedések csak az ULAP gyakorlatain vannak kitöltve, és
 * azok `legacyIds` mezője képezi le a régi terv gépeit is. A PPLUL
 * gyakorlatain nincs `muscles`, tehát ha az aktív terv szerint építenénk az
 * indexet, PPLUL-ra váltva a pókháló kiürülne. A `LEGACY_MUSCLES` (muscles.ts)
 * zárja a maradék rést: együtt a régi terv mind a 37 gyakorlata le van fedve.
 */
export const MUSCLE_SOURCE_DAYS: WorkoutDay[] = PLANS.ulap.days
