/** Helyi idő szerinti 'YYYY-MM-DD'. Sosem toISOString() — az UTC-re csúsztat. */
export function toDateKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 'YYYY-MM-DD' → helyi éjfélre állított Date. */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDaysKey(key: string, days: number): string {
  const d = fromDateKey(key)
  d.setDate(d.getDate() + days)
  return toDateKey(d)
}

export function isFutureKey(key: string): boolean {
  return key > toDateKey()
}

const HU_DAYS = ['vasárnap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat']
const HU_MONTHS = [
  'január', 'február', 'március', 'április', 'május', 'június',
  'július', 'augusztus', 'szeptember', 'október', 'november', 'december',
]

export function formatDateHu(key: string): string {
  const today = toDateKey()
  if (key === today) return 'Ma'
  if (key === addDaysKey(today, -1)) return 'Tegnap'
  if (key === addDaysKey(today, 1)) return 'Holnap'
  const d = fromDateKey(key)
  return `${HU_MONTHS[d.getMonth()]} ${d.getDate()}. · ${HU_DAYS[d.getDay()]}`
}

/** Mindig a tényleges dátum, relatív szó nélkül: "augusztus 31., hétfő". */
export function formatDateLongHu(key: string): string {
  const d = fromDateKey(key)
  return `${HU_MONTHS[d.getMonth()]} ${d.getDate()}., ${HU_DAYS[d.getDay()]}`
}

export function formatDateShortHu(key: string): string {
  const d = fromDateKey(key)
  return `${d.getMonth() + 1}. ${d.getDate()}.`
}
