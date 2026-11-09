// Reális korlátok a beírt értékekre.
//
// Egy elgépelés (1500 óra alvás, 6500 perc képernyőidő) nem csak csúnya: a
// trendgrafikon skáláját évekre szétlövi, az átlagokat használhatatlanná
// teszi, és a napi pontszám is rosszul számol. Ezért a nyilvánvalóan
// lehetetlen értéket el sem mentjük — de nem némán: a mező alatt megjelenik,
// miért nem fogadtuk el.
//
// A határok FIZIKAIAK, nem célértékhez igazítottak: a napnak 24 órája van,
// ezért az alvás 24-nél nem lehet több, akkor sem, ha a cél 8. A cél alatti
// vagy fölötti érték teljesen érvényes adat — azt a kiértékelés minősíti.

import type { Habit, MetricKey } from '@/lib/types'

export interface ValueLimits {
  min: number
  max: number
}

/** Egy nap hossza percben / órában — innen jön a legtöbb felső korlát. */
const MINUTES_PER_DAY = 1440
const HOURS_PER_DAY = 24

const METRIC_LIMITS: Record<MetricKey, ValueLimits> = {
  // A világrekord napi lépésszám is 100 ezer alatt van.
  steps: { min: 0, max: 100_000 },
  // Versenyevő-kategória; efölött biztosan elütés.
  calories: { min: 0, max: 15_000 },
  sleep_hours: { min: 0, max: HOURS_PER_DAY },
  // 15 liter már egészségügyi kockázat, tehát biztosan nem mérés.
  water: { min: 0, max: 15 },
  screen_time: { min: 0, max: MINUTES_PER_DAY },
  // Idő típus: nem számmező, a `<input type="time">` maga korlátoz.
  bedtime: { min: 0, max: MINUTES_PER_DAY },
}

/**
 * Szabad kezű habitnál nincs fizikai jelentés, amiből határt lehetne vezetni.
 * Itt csak a nagyságrendi elütést fogjuk meg (billentyű beragadás, vágólapra
 * került telefonszám).
 */
const GENERIC_LIMITS: ValueLimits = { min: 0, max: 1_000_000 }

export function valueLimits(habit: Habit): ValueLimits {
  return habit.metric_key ? METRIC_LIMITS[habit.metric_key] : GENERIC_LIMITS
}

const nf = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 2 })

/**
 * Elfogadható-e a beírt érték? Hibaüzenetet ad vissza, vagy `null`-t, ha
 * rendben van. Az üres mező (null) mindig rendben: az a bejegyzés törlése.
 */
export function validateValue(habit: Habit, value: number | null): string | null {
  if (value === null) return null
  if (!Number.isFinite(value)) return 'Ez nem szám.'

  const { min, max } = valueLimits(habit)
  const unit = habit.unit ? ` ${habit.unit}` : ''

  if (value < min) {
    return min === 0 ? 'Negatív érték nem lehet.' : `Legalább ${nf.format(min)}${unit} lehet.`
  }
  if (value > max) {
    return `Egy napra legfeljebb ${nf.format(max)}${unit} írható be — ez elgépelésnek tűnik.`
  }
  return null
}
