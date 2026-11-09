// A Beállítások oldal egy darabja. A lap 628 soros volt — egyetlen
// fájlban kilenc, egymástól független beállítás-csoporttal. Szétszedve
// mindegyik a saját nevén kereshető, és egy módosítás nem görget át a
// többi nyolcon.

import { useState } from 'react'
import { Card, SectionTitle } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { useToast } from '@/components/Toast'
import { downloadLocalSnapshot } from '@/data/localSnapshot'
import { lastMirrorAt, mirrorToLocal } from '@/data/mirrorToLocal'
import { isLocalMode } from '@/data'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

function PasswordSetter() {
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const supabase = await getSupabase()
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) {
      toast.show(error.message, 'error')
      return
    }
    setPassword('')
    toast.show('Jelszó beállítva. Mostantól e-mail nélkül is beléphetsz.', 'success')
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="acct-password" className="px-0.5 text-[13px] font-medium text-ink-soft">
        Jelszó beállítása
      </label>
      <input
        id="acct-password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="legalább 6 karakter"
        className="h-12 w-full rounded-[var(--radius-pill)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 text-[16px] outline-none focus:border-[rgba(140,240,205,0.5)]"
      />
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving || password.length < 6}
        className="press btn-primary h-12 w-full text-[15px]"
      >
        {saving ? 'Mentés…' : 'Jelszó mentése'}
      </button>
    </div>
  )
}

/** „3 órája", „tegnap", „2026-10-18" — amelyik a legrövidebben pontos. */
function relativeHu(at: Date): string {
  const perc = Math.round((Date.now() - at.getTime()) / 60000)
  if (perc < 2) return 'az imént'
  if (perc < 60) return `${perc} perce`
  const ora = Math.round(perc / 60)
  if (ora < 24) return `${ora} órája`
  const nap = Math.round(ora / 24)
  if (nap === 1) return 'tegnap'
  if (nap < 7) return `${nap} napja`
  return at.toLocaleDateString('hu-HU')
}

/**
 * A helyi másolat állapota — csak Supabase-módban van értelme.
 *
 * Azért látszik a felületen, és nem csendben működik: ha egyszer tényleg
 * elesik a szerver, az első kérdés az lesz, hogy „meddig van meg az adat". Ezt
 * előre tudni kell, nem akkor kideríteni.
 */
function LocalMirrorRow() {
  const toast = useToast()
  const [at, setAt] = useState<Date | null>(() => lastMirrorAt())
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    const result = await mirrorToLocal({ force: true })
    setBusy(false)
    setAt(lastMirrorAt())
    toast.show(
      result === 'kesz'
        ? 'A teljes adatod eltéve erre az eszközre.'
        : 'Nem sikerült most lemásolni — a korábbi másolat megmaradt.',
      result === 'kesz' ? 'success' : 'error',
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] text-ink-soft">
        {at
          ? `Teljes helyi másolat: ${relativeHu(at)}. Ennyi adat maradna meg, ha a szerver most elesne.`
          : 'Még nincs helyi másolat. Belépés után magától elkészül, de most is kérheted.'}
      </p>
      <button
        type="button"
        onClick={() => void run()}
        disabled={busy}
        className="press btn-quiet h-12 w-full text-[15px]"
      >
        <Icon name="rotate-ccw" size={17} />
        {busy ? 'Másolás…' : 'Helyi másolat frissítése'}
      </button>
    </div>
  )
}

export
function AccountSection() {
  const toast = useToast()
  return (
    <section>
      <SectionTitle>Fiók</SectionTitle>
      <Card className="flex flex-col gap-3">
        <p className="text-[13px] text-ink-soft">
          {isLocalMode
            ? 'Helyi mód: az adatok ennek a böngészőnek a tárolójában vannak, nem szinkronizálódnak. Amíg ez tart, mentsd le a JSON-t, mielőtt visszaállunk Supabase-re — abból kerül vissza minden, amit közben rögzítettél.'
            : 'Az adatok Supabase-ben vannak, RLS mögött — csak a te fiókod látja őket. Belépés után az app magától eltesz egy teljes másolatot erre az eszközre is, hogy egy szerverkiesés ne állítson meg.'}
        </p>
        {isLocalMode ? null : <LocalMirrorRow />}
        {/* A mentés Supabase-módban is kell: ott a helyi másolatot tölti le,
            tehát egy kézzel megfogható biztonsági példány a gépeden. */}
        <button
          type="button"
          onClick={() => {
            const name = downloadLocalSnapshot()
            toast.show(`Lementve: ${name}`, 'success')
          }}
          className="press btn-quiet h-12 w-full text-[15px]"
        >
          <Icon name="download" size={17} />
          {isLocalMode ? 'Helyi adatok mentése (JSON)' : 'Helyi másolat letöltése (JSON)'}
        </button>
        {isSupabaseConfigured ? <PasswordSetter /> : null}
        {isSupabaseConfigured ? (
          <button
            type="button"
            onClick={async () => {
              await (await getSupabase()).auth.signOut()
              toast.show('Kijelentkeztél.', 'info')
            }}
            className="press btn-quiet h-12 w-full text-[15px]"
          >
            <Icon name="log-out" size={17} />
            Kijelentkezés
          </button>
        ) : null}
      </Card>
    </section>
  )
}
