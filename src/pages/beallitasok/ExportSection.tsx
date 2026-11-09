// A Beállítások oldal egy darabja. A lap 628 soros volt — egyetlen
// fájlban kilenc, egymástól független beállítás-csoporttal. Szétszedve
// mindegyik a saját nevén kereshető, és egy módosítás nem görget át a
// többi nyolcon.

import { useState } from 'react'
import { Card, SectionTitle } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { useToast } from '@/components/Toast'
import { exportAll } from '@/data/exportCsv'

export function ExportSection() {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string[] | null>(null)

  return (
    <section>
      <SectionTitle>Biztonsági mentés</SectionTitle>
      <Card className="flex flex-col gap-3">
        <p className="text-[13px] text-ink-soft">
          Három CSV készül: szokásnapló, egészségmetrikák és testsúlymérések. A fájlok
          azonnal letöltődnek.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              const result = await exportAll()
              setDone(result.files.map((f) => `${f.name} — ${f.rows} sor`))
              toast.show('Az export elkészült, a fájlok letöltve.', 'success')
            } catch (err) {
              toast.show(err instanceof Error ? err.message : 'Az export nem sikerült.', 'error')
            } finally {
              setBusy(false)
            }
          }}
          className="press btn-quiet h-12 w-full text-[15px] disabled:opacity-40"
        >
          <Icon name="download" size={18} />
          {busy ? 'Export készül…' : 'CSV export'}
        </button>

        {done ? (
          <ul
            className="flex flex-col gap-1 rounded-2xl border border-[rgba(127,224,174,0.3)] bg-[rgba(127,224,174,0.09)] p-3 text-[12.5px]"
            aria-live="polite"
          >
            {done.map((line) => (
              <li key={line} className="flex items-center gap-2">
                <Icon name="check" size={14} style={{ color: 'var(--color-good)' }} />
                {line}
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </section>
  )
}

/**
 * Jelszó beállítása a már belépett fiókhoz.
 *
 * Nem kényelmi funkció: e-mailes belépéssel iOS-en a kezdőképernyős app nem
 * érhető el (külön tároló, a link a Safariban nyílik), a Supabase beépített
 * levélküldője pedig ingyenes csomagon pár levél óránként. Jelszóval a belépés
 * nem függ e-mailtől: bárhol, bármikor, korlát nélkül.
 */
