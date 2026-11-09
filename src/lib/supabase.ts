import type { SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Vészkapcsoló: ha a Supabase nem elérhető (pl. a szervezet egress-kerete
 * kimerült, és minden kérés 402-t ad), ezzel helyi módba kényszeríthető az
 * app — belépés nélkül, a public/flint-seed.json-ból feltöltve.
 *
 * Azért külön kapcsoló, és nem a Supabase-változók kiürítése: a Vite-ban a
 * process.env felülírja a .env fájlokat, tehát a buildkörnyezetben beállított
 * VITE_SUPABASE_URL legyőzné az üresre állított értéket, és mégis éles build
 * készülne. Ez a kapcsoló viszont pont a buildkörnyezetből jön.
 */
const forceLocal = import.meta.env.VITE_FORCE_LOCAL === '1'

/** Igaz, ha a .env ki van töltve. Enélkül az app offline-demó módban indul. */
export const isSupabaseConfigured = Boolean(url && anonKey) && !forceLocal

if (!isSupabaseConfigured) {
  console.warn(
    '[supabase] Hiányzó VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Másold a .env.example-t .env-be, és töltsd ki. Addig az app helyi (localStorage) módban fut.',
  )
}

/**
 * A kliens LUSTÁN, külön kötegben jön — nem a főkötegben.
 *
 * Miért: a `@supabase/supabase-js` behúzza az auth-ot, a postgrestet, a
 * storage-ot, a realtime-ot (és a Phoenix-csatornát), a functionst és az
 * iceberg-et is, EGYSÉGBEN — a fára-rázás nem tudja kidobni a nem használt
 * részeit, mert a főbelépő mindet felsorolja. Ez a köteg legnagyobb
 * összetevője volt, nagyobb, mint a React.
 *
 * Az app viszont ebből CSAK az authot és a postgrestet használja, helyi módban
 * pedig semennyit: a `VITE_FORCE_LOCAL=1` build minden kérést a
 * localStorage-ból szolgál ki. Statikus importtal a telefon mégis letöltötte
 * és értelmezte az egészet minden indításkor.
 *
 * Így viszont csak akkor és csak ott töltődik le, ahol tényleg kell. Ha a
 * .env ki van töltve, a letöltés AZONNAL elindul (lásd lent), párhuzamosan a
 * főköteggel — tehát a belépés nem lesz lassabb, csak a helyi mód lesz
 * könnyebb.
 */
let pending: Promise<SupabaseClient> | null = null

export function getSupabase(): Promise<SupabaseClient> {
  // `||`, nem `??`: az üres string is hiányzó értéknek számít. A `??` csak
  // null/undefined esetén esik vissza, így egy üresre állított környezeti
  // változó — ami buildkörnyezetben a leggyakoribb eset — a createClient
  // „supabaseUrl is required" kivételével, fekete képernyővel állította meg az
  // appot, miközben az isSupabaseConfigured fent már helyi módot jelzett.
  pending ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url || 'http://localhost:54321', anonKey || 'public-anon-key-placeholder', {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    }),
  )
  return pending
}

// Ha van mivel belépni, ne várjuk meg az első hívást: a letöltés induljon a
// lap betöltésével együtt. Így a lusta import nem ad késleltetést a
// belépéshez, csak a helyi módból vesz ki minden Supabase-kódot.
if (isSupabaseConfigured) void getSupabase()
