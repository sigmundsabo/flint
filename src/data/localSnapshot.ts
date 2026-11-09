// Áthidalás arra az esetre, amikor a Supabase nem elérhető (pl. a szervezet
// egress-kerete kimerült, és minden kérés 402-t ad). Ilyenkor az app helyi
// módban fut, de nem üresen: innen töltjük be a DB-ből kimentett előzményt.
//
// Két irány:
//   seedLocalStoreIfEmpty() — induláskor, EGYSZER, ha a tároló még üres
//   downloadLocalSnapshot() — a helyben rögzített napok kimentése, hogy a
//                             Supabase visszatérése után fel lehessen tölteni
//
// A seed sosem ír felül meglévő adatot: ha már van bármi a tárolóban, kilép.

import { LOCAL_STORE_KEY } from './localRepo'

/** Csak annyit ellenőrzünk, hogy a letöltött fájl egyáltalán tárolónak látszik-e. */
function looksLikeStore(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { habits?: unknown }).habits)
  )
}

/** Igaz, ha a tárolóban már van érdemi adat — ilyenkor nem seedelünk. */
function hasData(): boolean {
  try {
    const raw = localStorage.getItem(LOCAL_STORE_KEY)
    if (!raw) return false
    const parsed: unknown = JSON.parse(raw)
    if (!looksLikeStore(parsed)) return false
    return Object.values(parsed).some((v) => Array.isArray(v) && v.length > 0)
  } catch {
    // Olvashatatlan tároló: inkább ne nyúljunk hozzá, mint hogy felülírjuk.
    return true
  }
}

/**
 * Feltölti a helyi tárolót a `public/flint-seed.json`-ból, ha még üres.
 * A visszatérési érték csak naplózáshoz kell; hiba esetén nem dob, mert az
 * app seed nélkül is elindul — csak üresen.
 */
export async function seedLocalStoreIfEmpty(url = '/flint-seed.json'): Promise<boolean> {
  if (hasData()) return false

  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      console.warn(`[seed] ${url} nem elérhető (${res.status}) — az app üresen indul.`)
      return false
    }
    const data: unknown = await res.json()
    if (!looksLikeStore(data)) {
      console.warn('[seed] a fájl nem tárolónak látszik — kihagyva.')
      return false
    }
    localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(data))
    console.info('[seed] a helyi tároló feltöltve a kimentett előzményből.')
    return true
  } catch (err) {
    console.warn('[seed] nem sikerült betölteni', err)
    return false
  }
}

/**
 * A teljes helyi tárolót letölti egy JSON-fájlba. Ez a visszaút: amit helyi
 * módban rögzítettél, ebből kerül vissza a Supabase-be.
 */
export function downloadLocalSnapshot(): string {
  const raw = localStorage.getItem(LOCAL_STORE_KEY) ?? '{}'
  const stamp = new Date().toISOString().slice(0, 10)
  const name = `flint-helyi-${stamp}.json`

  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)

  return name
}
