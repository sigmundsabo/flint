// A Beállítások oldal egy darabja. A lap 628 soros volt — egyetlen
// fájlban kilenc, egymástól független beállítás-csoporttal. Szétszedve
// mindegyik a saját nevén kereshető, és egy módosítás nem görget át a
// többi nyolcon.

import { useState } from 'react'
import { Card, SectionTitle } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { NumberField, TextField } from '@/components/fields'
import { useAppData } from '@/hooks/useAppData'

export function NeckSettings() {
  const { settings, saveSetting } = useAppData()
  const [name, setName] = useState('')
  const [seconds, setSeconds] = useState<number | null>(30)

  return (
    <section>
      <SectionTitle>Nyakerősítés gyakorlatok</SectionTitle>
      <Card className="flex flex-col gap-3">
        {settings.neck_exercises.map((ex, i) => (
          <div key={`${ex.name}-${i}`} className="flex items-center gap-3 rounded-xl bg-white/4 px-3 py-2.5">
            <span className="min-w-0 flex-1 truncate text-[14.5px]">{ex.name}</span>
            <span className="num text-[13px] text-ink-soft">{ex.seconds} mp</span>
            <button
              type="button"
              aria-label={`${ex.name} törlése`}
              onClick={() =>
                void saveSetting('neck_exercises', settings.neck_exercises.filter((_, j) => j !== i))
              }
              className="press grid size-10 shrink-0 place-items-center rounded-full text-ink-faint"
            >
              <Icon name="trash" size={16} />
            </button>
          </div>
        ))}

        <div className="mt-1 flex flex-col gap-3 border-t border-[var(--color-line)] pt-3">
          <TextField label="Gyakorlat neve" value={name} onChange={setName} placeholder="pl. Áll behúzás" />
          <NumberField label="Időtartam" unit="mp" min={5} value={seconds} onCommit={setSeconds} />
          <button
            type="button"
            disabled={!name.trim() || !seconds}
            onClick={() => {
              void saveSetting('neck_exercises', [
                ...settings.neck_exercises,
                { name: name.trim(), seconds: seconds! },
              ])
              setName('')
            }}
            className="press btn-quiet h-11 w-full text-[14.5px] disabled:opacity-40"
          >
            Hozzáadás
          </button>
        </div>
      </Card>
    </section>
  )
}

/* ========================================================================== */
