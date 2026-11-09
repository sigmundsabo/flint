// A Beállítások oldal egy darabja. A lap 628 soros volt — egyetlen
// fájlban kilenc, egymástól független beállítás-csoporttal. Szétszedve
// mindegyik a saját nevén kereshető, és egy módosítás nem görget át a
// többi nyolcon.

import { NumberField, TimeField } from '@/components/fields'
import { useToast } from '@/components/Toast'
import { Icon } from '@/components/Icon'
import { Sheet } from '@/components/Sheet'
import { rangeBounds } from '@/domain/evaluate'
import { formatTimeShort } from '@/domain/time'
import { useAppData } from '@/hooks/useAppData'
import type { Habit } from '@/lib/types'

const nf = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 2 })
const fmt = (n: number | null) => (n === null ? '—' : nf.format(n))

export
function describeTarget(h: Habit): string {
  const unit = h.unit ? ` ${h.unit}` : ''
  switch (h.type) {
    case 'binary':
      return h.counts_toward_score ? 'Igen / nem' : 'Igen / nem · nem számít a pontszámba'
    case 'min':
      return `Legalább ${fmt(h.target_value)}${unit}`
    case 'max':
      return `Legfeljebb ${fmt(h.target_value)}${unit}`
    case 'range': {
      const b = rangeBounds(h)
      return b ? `${fmt(b.low)}–${fmt(b.high)}${unit} (±${h.tolerance_pct}%)` : 'Sáv'
    }
    case 'time':
      return `${formatTimeShort(h.target_time)} előtt`
  }
}

/* ========================================================================== */
export
function HabitEditSheet({ habit, onClose }: { habit: Habit | null; onClose: () => void }) {
  const { updateHabit } = useAppData()
  const toast = useToast()
  if (!habit) return null

  const save = async (patch: Partial<Habit>) => {
    await updateHabit(habit.id, patch)
    toast.show('Mentve.', 'success')
  }

  return (
    // Pipa, nem X: minden mező azonnal mentődik (a „Mentve." visszajelzés is
    // ezt mondja), a gomb tehát nyugtázás, nem elvetés.
    <Sheet open onClose={onClose} title={habit.name} confirm>
      <div className="flex flex-col gap-4">
        {habit.type === 'time' ? (
          <TimeField
            label="Határidő"
            value={habit.target_time}
            onCommit={(v) => void save({ target_time: v })}
            hint="Az összehasonlítás éjfél-biztos: a 00:01 későbbnek számít, mint a 23:00."
          />
        ) : habit.type !== 'binary' ? (
          <>
            <NumberField
              label={habit.type === 'max' ? 'Felső limit' : habit.type === 'min' ? 'Alsó határ' : 'Célérték'}
              unit={habit.unit}
              value={habit.target_value}
              onCommit={(v) => void save({ target_value: v })}
            />
            {habit.type === 'range' ? (
              <NumberField
                label="Tűrés"
                unit="%"
                min={0}
                value={habit.tolerance_pct}
                onCommit={(v) => void save({ tolerance_pct: v })}
                hint="A célérték körüli sáv szélessége mindkét irányban."
              />
            ) : null}
          </>
        ) : (
          <p className="rounded-2xl bg-white/4 px-4 py-3 text-[13.5px] text-ink-soft">
            Bináris szokás — nincs számszerű célértéke.
          </p>
        )}

        <NumberField
          label="Súly a napi pontszámban"
          min={0}
          value={habit.weight}
          onCommit={(v) => v !== null && void save({ weight: v })}
          hint="1 = alapértelmezett. Nagyobb szám nagyobb részt vállal a napi százalékból."
        />

        <ToggleRow
          label="Aktív"
          hint="Kikapcsolva eltűnik a listákból, de az előzmény megmarad."
          checked={habit.active}
          onChange={(v) => void save({ active: v })}
        />
        <ToggleRow
          label="Beleszámít a napi pontszámba"
          hint="A fogmosásnál ez szándékosan ki van kapcsolva."
          checked={habit.counts_toward_score}
          onChange={(v) => void save({ counts_toward_score: v })}
        />

        <button type="button" onClick={onClose} className="press btn-primary h-12 w-full text-[15px]">
          <Icon name="check" size={18} />
          Kész
        </button>
      </div>
    </Sheet>
  )
}

function ToggleRow({
  label, hint, checked, onChange,
}: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] font-medium">{label}</p>
        {hint ? <p className="mt-0.5 text-[12.5px] text-ink-faint">{hint}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="relative h-8 w-14 shrink-0 rounded-full transition-colors"
        style={{ background: checked ? 'var(--accent)' : 'rgba(255,255,255,0.14)' }}
      >
        <span
          className="absolute top-1 size-6 rounded-full bg-white shadow"
          style={{
            left: checked ? 30 : 4,
            transition: 'left 240ms var(--ease-out)',
          }}
        />
      </button>
    </div>
  )
}

/* ========================================================================== */
