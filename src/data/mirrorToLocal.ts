// A szerveren lévő adat HELYI MÁSOLATA — belépés után, magától.
//
// Miért kell: 2026 novemberében a Supabase-szervezet egress-kerete kimerült, és
// a Flint minden kérése 402-t adott. Az app helyi módba kapcsolható
// (`VITE_FORCE_LOCAL=1`), de olyankor üresen indult volna — a történetet egy
// kézzel kimentett `public/flint-seed.json`-ból kellett visszatölteni. Az a
// fájl egyszer készült, tehát azonnal elavult, a kiesés napjáig rögzített
// napokat nem tartalmazta, és mivel a `public/`-ban van, bárki letölthette.
//
// Ez a modul megszünteti a kézi lépést: belépés után letölti a TELJES adatot,
// és beírja ugyanabba a localStorage-tárolóba, amiből a `localRepo` dolgozik.
// Ha a szerver legközelebb elesik, a helyi mód nem egy régi mentést talál ott,
// hanem a legutóbbi belépés állapotát.
//
// A másolat a `repo`-n keresztül készül, nem közvetlen Supabase-hívásokkal:
// így egyetlen sor Supabase-kód sem kerül ebbe a kötegbe (a kliens lusta
// betöltése miatt ez fontos), és ha az adatréteg változik, ez automatikusan
// követi.

import { isSupabaseConfigured } from '@/lib/supabase'
import { repo } from './index'
import { LOCAL_STORE_KEY } from './localRepo'

/** Mikor készült a legutóbbi másolat (ISO-dátum). */
const AT_KEY = 'habit-tracker:helyi-masolat-ideje'

/**
 * Ennél sűrűbben nem másolunk magától.
 *
 * Nem a sávszélesség miatt — a teljes adat negyed megabájt —, hanem mert a
 * `load()` minden ablakbővítésnél újrafut, és egy nap alatt tízszer is
 * lefuthatna. Napi egy-két másolat bőven elég ahhoz, hogy egy váratlan
 * kiesésnél legfeljebb néhány órányi munka hiányozzon.
 */
const MIN_INTERVAL_MS = 12 * 60 * 60 * 1000

// A `Repo` minden listázója dátumtartományt kér, mert a felület mindig egy
// ablakot mutat. A másolatnak viszont MINDEN kell, ezért nyitjuk ki a határokat.
const ALL_FROM = '1970-01-01'
const ALL_TO = '2999-12-31'

export type MirrorResult = 'kesz' | 'kihagyva' | 'hiba'

/** A legutóbbi másolat ideje, vagy `null`, ha még nem készült. */
export function lastMirrorAt(): Date | null {
  try {
    const raw = localStorage.getItem(AT_KEY)
    if (!raw) return null
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

function fresh(): boolean {
  const at = lastMirrorAt()
  return at !== null && Date.now() - at.getTime() < MIN_INTERVAL_MS
}

/**
 * Letölti a teljes adatot, és elteszi a helyi tárolóba.
 *
 * Soha nem dob: a másolat kényelmi funkció, egy hibája nem akaszthatja meg az
 * appot. A `force` a Beállítások gombjához kell, ami a 12 órás szabályt
 * megkerüli.
 */
export async function mirrorToLocal({ force = false } = {}): Promise<MirrorResult> {
  // Helyi módban a forrás és a cél UGYANAZ a tároló — a másolat értelmetlen
  // lenne, és rosszabb esetben egy félig betöltött állapotot írna vissza.
  if (!isSupabaseConfigured) return 'kihagyva'
  if (!force && fresh()) return 'kihagyva'

  try {
    const [
      habits, habit_logs, health_metrics, weight_logs,
      workouts, daily_reviews, supplements, supplement_logs, settings,
    ] = await Promise.all([
      repo.listHabits(),
      repo.listHabitLogs(ALL_FROM, ALL_TO),
      repo.listHealthMetrics(ALL_FROM, ALL_TO),
      repo.listWeightLogs(ALL_FROM, ALL_TO),
      repo.listWorkouts(ALL_FROM, ALL_TO),
      repo.listDailyReviews(ALL_FROM, ALL_TO),
      repo.listSupplements(),
      repo.listSupplementLogs(ALL_FROM, ALL_TO),
      repo.loadSettings(),
    ])

    // Üres válaszra NEM írunk. Egy félbeszakadt kérés, egy lejárt munkamenet
    // vagy épp egy 402 üres listát is adhat — és akkor a meglévő, használható
    // másolatot cserélnénk le a semmire. Szokás nélkül nincs mit menteni.
    if (habits.length === 0) {
      console.warn('[helyi másolat] a szerver nem adott egyetlen szokást sem — a meglévő másolat marad.')
      return 'kihagyva'
    }

    localStorage.setItem(
      LOCAL_STORE_KEY,
      JSON.stringify({
        habits, habit_logs, health_metrics, weight_logs,
        workouts, daily_reviews, supplements, supplement_logs, settings,
      }),
    )
    localStorage.setItem(AT_KEY, new Date().toISOString())
    console.info(`[helyi másolat] kész — ${habit_logs.length} naplósor, ${workouts.length} edzés.`)
    return 'kesz'
  } catch (err) {
    // A `QuotaExceededError` is itt köt ki. Ha egyszer tele lesz a tároló, az
    // a jelzés, hogy a másolatot szűkíteni kell (pl. csak az utolsó két év) —
    // de attól az app még működik, csak a tartalék lesz régebbi.
    console.warn('[helyi másolat] nem sikerült', err)
    return 'hiba'
  }
}
