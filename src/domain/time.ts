// 09-hataridobug-javitas.md
//
// A hiba: a lefekvés-határidőt naiv óra-perc összehasonlítással értékeltük ki.
// Ha a cél 23:00 és a tényleges idő 00:01, akkor `0 < 23` miatt a naiv változat
// tévesen "korábbinak", azaz teljesítettnek minősítette.
//
// A javítás: mindkét időpontot egy közös referenciaponthoz (dél) képest mérjük
// percben. Ha az eredmény negatív (hajnali időpont), hozzáadunk 24 óra percet —
// így a hajnali időpontok az előző este UTÁN kerülnek a sorrendben.

const MINUTES_PER_DAY = 24 * 60
const NOON = 12 * 60

/** 'HH:MM' / 'HH:MM:SS' → percek éjfél óta. Érvénytelen bemenetre null. */
export function parseTimeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time.trim())
  if (!m) return null
  const hours = Number(m[1])
  const minutes = Number(m[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

/**
 * Percek dél óta, éjfél-biztosan. A hajnali időpontok (00:00–11:59) a nap
 * VÉGÉRE kerülnek, nem az elejére — ez a lényege a javításnak.
 */
export function minutesSinceNoon(minutesSinceMidnight: number): number {
  const shifted = minutesSinceMidnight - NOON
  return shifted < 0 ? shifted + MINUTES_PER_DAY : shifted
}

/**
 * Teljesítve van-e egy `time` típusú habit: a tényleges időpont a határidőn
 * belül (azaz nem később) van-e?
 *
 * 23:00 cél + 22:59 tényleges → true
 * 23:00 cél + 23:00 tényleges → true  (pontosan a határidő még belefér)
 * 23:00 cél + 23:01 tényleges → false
 * 23:00 cél + 00:01 tényleges → false (ez volt a bug)
 */
export function compareTimeToDeadline(
  actual: string | null | undefined,
  deadline: string | null | undefined,
): boolean {
  const a = parseTimeToMinutes(actual)
  const d = parseTimeToMinutes(deadline)
  if (a === null || d === null) return false
  return minutesSinceNoon(a) <= minutesSinceNoon(d)
}

/** 'HH:MM:SS' → 'HH:MM' megjelenítéshez. */
export function formatTimeShort(time: string | null | undefined): string {
  const minutes = parseTimeToMinutes(time)
  if (minutes === null) return '—'
  const h = String(Math.floor(minutes / 60)).padStart(2, '0')
  const m = String(minutes % 60).padStart(2, '0')
  return `${h}:${m}`
}
