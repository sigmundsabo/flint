import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { tokenFromLink } from '@/domain/authLink'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import { Icon } from './Icon'
import { LaunchScreen } from './LaunchScreen'

/**
 * 07-auth-rls-export.md — rendes Supabase auth, nem nyitott hozzáférés.
 * Egyszemélyes app, ezért jelszó nélküli e-mailes belépés: nincs mit
 * elfelejteni és nincs mit kiszivárogtatni.
 *
 * A belépés KÉTFÉLE bemenetet fogad — kódot vagy magát a linket —, és ez nem
 * kényelmi extra:
 *
 * iOS-en a kezdőképernyőre tett app külön tárolót kap, nem osztozik a
 * Safarival. A levélben lévő link viszont MINDIG a Safariban nyílik meg, tehát
 * a munkamenet oda kerül — az appba soha. Aki így próbál belépni, végtelen
 * körbe fut: belép a böngészőben, megnyitja az appot, és az újra a címét kéri.
 * A megoldás, hogy a token ne a böngészőn keresztül érkezzen. Ha a Supabase
 * levele hatjegyű kódot tartalmaz, azt beírod. Ha csak linket — az ingyenes
 * csomagon a sablon nem szerkeszthető, tehát alapból ez a helyzet —, akkor a
 * linket KIMÁSOLOD (megnyitás nélkül) és ide illeszted: a `token` paramétere
 * ugyanaz a beváltható token. Mindkét úton az app váltja be, nem a Safari.
 *
 * Ha a .env nincs kitöltve, az app helyi módban indul, és ez a kapu átenged.
 */
/**
 * A nyers Supabase-hibából olvasható magyar mondat.
 *
 * A zárt kör kapuját adatbázis-trigger őrzi (`004_allowed_emails.sql`), mert a
 * felületi ellenőrzést a nyilvános kulccsal meg lehetne kerülni. A trigger
 * viszont a GoTrue-n keresztül jut vissza, ami a saját kivételét „Database
 * error saving new user" formában csomagolja újra — ez a felhasználónak
 * semmit nem mond, és úgy hangzik, mintha az app lenne elromolva, nem pedig
 * ő nem lenne meghívva.
 */
function emberiHiba(message: string): string {
  if (/nincs engedélyezve|Database error saving new user|unexpected_failure/i.test(message)) {
    return 'Ez a cím nincs a meghívottak között. A Flint zárt körben fut — szólj a tulajdonosnak, és felveszi a listára.'
  }
  if (/Invalid login credentials/i.test(message)) {
    return 'Nem stimmel az e-mail cím vagy a jelszó.'
  }
  if (/Email not confirmed/i.test(message)) {
    return 'Előbb erősítsd meg a címedet a kiküldött levélben.'
  }
  return message
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setChecking(false)
      return
    }
    // A kliens külön kötegből jön, tehát itt már a letöltését is meg kell
    // várni. Az `alive` jelző azért kell, mert a hatás lefuthat előbb, mint
    // ahogy a köteg megérkezik (StrictMode alatt ez garantáltan megtörténik):
    // olyankor sem állapotot nem írunk, sem feliratkozást nem hagyunk hátra.
    let alive = true
    let unsubscribe: (() => void) | undefined

    void getSupabase().then(async (supabase) => {
      const { data } = await supabase.auth.getSession()
      if (!alive) return
      setSession(data.session)
      setChecking(false)
      const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
      unsubscribe = () => sub.subscription.unsubscribe()
      if (!alive) unsubscribe()
    })

    return () => {
      alive = false
      unsubscribe?.()
    }
  }, [])

  if (!isSupabaseConfigured) return <LocalModeBanner>{children}</LocalModeBanner>

  if (checking) return <LaunchScreen label="Belépés ellenőrzése…" />

  if (session) return <>{children}</>

  // Jelszóval: nincs e-mail, nincs napi keret, és a kezdőképernyős appban is
  // működik. Ez az elsődleges út; a kódos/linkes csak akkor kell, ha még nincs
  // jelszó beállítva (Beállítások → Fiók).
  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSending(true)
    const supabase = await getSupabase()
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setSending(false)
    if (err) setError(emberiHiba(err.message))
  }

  const sendCode = async () => {
    setError(null)
    setSending(true)
    const supabase = await getSupabase()
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    setSending(false)
    if (err) setError(emberiHiba(err.message))
    else setSent(true)
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setVerifying(true)

    const raw = code.trim()
    const linkToken = tokenFromLink(raw)

    const supabase = await getSupabase()
    const { error: err } = linkToken
      ? await supabase.auth.verifyOtp(linkToken)
      : await supabase.auth.verifyOtp({ email: email.trim(), token: raw, type: 'email' })

    setVerifying(false)
    // Sikernél nem csinálunk semmit: az `onAuthStateChange` beállítja a
    // munkamenetet, és a kapu magától átenged.
    if (!err) return

    // A token egyszer használatos. A leggyakoribb ok nem az elgépelés, hanem
    // hogy valami MÁR ELHASZNÁLTA: rákoppintottál a linkre, vagy a levelező
    // biztonsági ellenőrzője megnyitotta helyetted. Ezt mondjuk is meg, mert a
    // nyers „Token has expired or is invalid" ebből semmit nem árul el.
    const expired = /expired|invalid/i.test(err.message)
    setError(
      expired
        ? 'Ez a link vagy kód már nem érvényes. Egyszer használható, és elhasználja az is, ha rákoppintasz, vagy ha a levelező ellenőrzi. Kérj újat, és csak másold ki — ne nyisd meg.'
        : emberiHiba(err.message),
    )
  }

  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <div className="card-2 w-full max-w-sm p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="grad-mint grid size-11 place-items-center rounded-2xl">
            <Icon name="flame" size={22} />
          </span>
          <div>
            <h1 className="display text-[24px] leading-none">Flint</h1>
            <p className="text-[13px] text-ink-soft">Belépés — zárt kör</p>
          </div>
        </div>

        {sent ? (
          <form onSubmit={verify} className="flex flex-col gap-3">
            <div className="rounded-2xl border border-[rgba(127,224,174,0.35)] bg-[rgba(127,224,174,0.1)] p-4">
              <p className="text-[14px]">
                Elküldtük a levelet a <strong>{email}</strong> címre. Írd be belőle a
                hatjegyű kódot.
              </p>
              <p className="mt-2 text-[12.5px] text-ink-soft">
                Ha a levélben csak link van: <strong>ne koppints rá</strong> — tartsd
                nyomva, <em>Link másolása</em>, és illeszd ide. A linkre koppintva a
                Safariban lépnél be, nem itt.
              </p>
            </div>
            <label htmlFor="auth-code" className="px-0.5 text-[13px] font-medium text-ink-soft">
              Kód vagy beillesztett link
            </label>
            <input
              id="auth-code"
              // `one-time-code`: iOS így felajánlja a kódot a billentyűzet
              // fölött, és nem kell átváltani a levelezőbe.
              autoComplete="one-time-code"
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456 vagy a kimásolt link"
              className="h-12 w-full rounded-[var(--radius-pill)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 text-[16px] outline-none focus:border-[rgba(140,240,205,0.5)]"
            />
            {error ? (
              <p role="alert" className="text-[13px] text-[var(--color-bad)]">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={verifying || code.trim().length < 6}
              className="press btn-primary h-12 w-full text-[15px]"
            >
              {verifying ? 'Ellenőrzés…' : 'Belépés'}
            </button>
            <button
              type="button"
              onClick={() => { setSent(false); setCode(''); setError(null) }}
              className="press h-10 w-full text-[13px] text-ink-soft"
            >
              Másik cím megadása
            </button>
          </form>
        ) : (
          <form onSubmit={submitPassword} className="flex flex-col gap-3">
            <label htmlFor="auth-email" className="px-0.5 text-[13px] font-medium text-ink-soft">
              E-mail cím
            </label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="te@pelda.hu"
              className="h-12 w-full rounded-[var(--radius-pill)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 text-[16px] outline-none focus:border-[rgba(140,240,205,0.5)]"
            />
            <label htmlFor="auth-password" className="px-0.5 text-[13px] font-medium text-ink-soft">
              Jelszó
            </label>
            <input
              id="auth-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="h-12 w-full rounded-[var(--radius-pill)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 text-[16px] outline-none focus:border-[rgba(140,240,205,0.5)]"
            />
            {error ? (
              <p role="alert" className="text-[13px] text-[var(--color-bad)]">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={sending || email.trim().length < 3 || password.length < 6}
              className="press btn-primary h-12 w-full text-[15px]"
            >
              {sending ? 'Belépés…' : 'Belépés'}
            </button>
            <button
              type="button"
              onClick={() => void sendCode()}
              disabled={sending || email.trim().length < 3}
              className="press h-10 w-full text-[13px] text-ink-soft"
            >
              Nincs még jelszavam — küldjön kódot e-mailben
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function LocalModeBanner({ children }: { children: ReactNode }) {
  const [dismissed, setDismissed] = useState(false)
  return (
    <>
      {!dismissed ? (
        <div className="relative z-30 border-b border-[rgba(255,196,107,0.28)] bg-[rgba(255,196,107,0.1)] px-4 py-2.5 pt-safe text-[12.5px] text-ink-soft">
          <div className="mx-auto flex max-w-lg items-center gap-2">
            <Icon name="circle-alert" size={15} style={{ color: 'var(--color-warn)' }} />
            <span className="flex-1">
              Helyi mód — az adatok csak ezen az eszközön vannak, nem szinkronizálódnak.
              Mentsd le őket a Beállításokban, mielőtt visszaállunk.
            </span>
            <button
              type="button" onClick={() => setDismissed(true)} aria-label="Értesítés elrejtése"
              className="press grid size-8 shrink-0 place-items-center rounded-full"
            >
              <Icon name="x" size={15} />
            </button>
          </div>
        </div>
      ) : null}
      {children}
    </>
  )
}
