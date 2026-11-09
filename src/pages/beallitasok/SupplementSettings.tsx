// A Beállítások oldal egy darabja. A lap 628 soros volt — egyetlen
// fájlban kilenc, egymástól független beállítás-csoporttal. Szétszedve
// mindegyik a saját nevén kereshető, és egy módosítás nem görget át a
// többi nyolcon.

import { useToast } from '@/components/Toast'
import { useState } from 'react'
import { Card, SectionTitle } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { TextField } from '@/components/fields'
import { useAppData } from '@/hooks/useAppData'

export function SupplementSettings() {
  const { supplements, createSupplement, updateSupplement, deleteSupplement } = useAppData()
  const toast = useToast()
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [schedule, setSchedule] = useState('')

  return (
    <section>
      <SectionTitle>Kiegészítők</SectionTitle>
      <Card className="flex flex-col gap-3">
        {supplements.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-xl bg-white/4 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14.5px] font-medium">{s.name}</p>
              <p className="truncate text-[12.5px] text-ink-faint">
                {[s.dosage, s.schedule].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={s.active}
              aria-label={`${s.name} aktív`}
              onClick={() => void updateSupplement(s.id, { active: !s.active })}
              className="press rounded-full px-3 py-1.5 text-[12px] font-medium"
              style={{
                background: s.active ? 'rgba(var(--accent-rgb),0.16)' : 'rgba(255,255,255,0.06)',
                color: s.active ? 'var(--accent)' : 'var(--color-ink-faint)',
              }}
            >
              {s.active ? 'Aktív' : 'Szünetel'}
            </button>
            <button
              type="button"
              aria-label={`${s.name} törlése`}
              onClick={async () => {
                await deleteSupplement(s.id)
                toast.show(`${s.name} törölve.`, 'info')
              }}
              className="press grid size-10 shrink-0 place-items-center rounded-full text-ink-faint"
            >
              <Icon name="trash" size={16} />
            </button>
          </div>
        ))}

        <div className="mt-1 flex flex-col gap-3 border-t border-[var(--color-line)] pt-3">
          <TextField label="Név" value={name} onChange={setName} placeholder="pl. Magnézium" />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Adag" value={dosage} onChange={setDosage} placeholder="400 mg" />
            <TextField label="Mikor" value={schedule} onChange={setSchedule} placeholder="lefekvés előtt" />
          </div>
          <button
            type="button"
            disabled={!name.trim()}
            onClick={async () => {
              await createSupplement({
                name: name.trim(),
                dosage: dosage.trim() || null,
                schedule: schedule.trim() || null,
                active: true,
                sort_order: (supplements.at(-1)?.sort_order ?? 0) + 10,
              })
              setName('')
              setDosage('')
              setSchedule('')
              toast.show('Kiegészítő hozzáadva.', 'success')
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
