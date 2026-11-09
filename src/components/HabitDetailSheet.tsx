import { useEffect, useRef, useState } from 'react'
import { Sheet } from './Sheet'
import { NumberField, TimeField } from './fields'
import { CheckButton } from './HabitRow'
import { Icon } from './Icon'
import { evaluateHabit, rangeBounds } from '@/domain/evaluate'
import { validateValue, valueLimits } from '@/domain/limits'
import { formatTimeShort } from '@/domain/time'
import { useAppData } from '@/hooks/useAppData'
import { haptic } from '@/hooks/useHaptics'
import { formatDateHu } from '@/lib/date'
import type { Habit } from '@/lib/types'

interface Props {
  habit: Habit | null
  dateKey: string
  onClose: () => void
}

export function HabitDetailSheet({ habit, dateKey, onClose }: Props) {
  const { logsByDate, writeHabitValue, clearHabitValue } = useAppData()
  const [busy, setBusy] = useState(false)
  // A lehetetlen értéket (1500 óra alvás) nem mentjük el, de a hibát meg kell
  // mutatni — különben a beírt szám ott áll a mezőben, és úgy tűnik, mentve van.
  const [error, setError] = useState<string | null>(null)

  // A bezáráskor megtartjuk az utolsó habitot, különben a lap tartalma eltűnne,
  // mielőtt a kicsúszó animáció lefutna.
  const lastRef = useRef<Habit | null>(habit)
  useEffect(() => {
    if (habit) lastRef.current = habit
    setError(null)
  }, [habit])
  const shown = habit ?? lastRef.current
  if (!shown) return null

  const log = logsByDate.get(dateKey)?.get(shown.id)
  const done = evaluateHabit(shown, log)
  const bounds = rangeBounds(shown)

  const write = async (patch: Parameters<typeof writeHabitValue>[2]) => {
    setBusy(true)
    try {
      await writeHabitValue(shown, dateKey, patch)
    } finally {
      setBusy(false)
    }
  }

  const limits = valueLimits(shown)

  return (
    // A fejléc gombja pipa, nem X — a beírt érték ekkor már el van mentve, a
    // koppintás nyugtázás. Hibás értéknél viszont marad az X: ott tényleg van
    // mit elvetni.
    <Sheet open={Boolean(habit)} onClose={onClose} title={shown.name} confirm={!error}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3 rounded-2xl bg-white/4 px-4 py-3">
          <span
            className="grid size-10 place-items-center rounded-xl"
            style={{
              background: done ? 'rgba(var(--accent-rgb),0.16)' : 'rgba(255,255,255,0.06)',
              color: done ? 'var(--accent)' : 'var(--color-ink-soft)',
            }}
          >
            <Icon name={shown.icon} size={20} />
          </span>
          <div className="flex-1">
            <p className="text-[14px] font-medium">{formatDateHu(dateKey)}</p>
            <p className="text-[12.5px] text-ink-soft">
              {shown.type === 'binary' && 'Igen / nem'}
              {shown.type === 'min' && `Cél: legalább ${shown.target_value} ${shown.unit ?? ''}`}
              {shown.type === 'max' && `Limit: legfeljebb ${shown.target_value} ${shown.unit ?? ''}`}
              {shown.type === 'range' && bounds &&
                `Sáv: ${bounds.low}–${bounds.high} ${shown.unit ?? ''} (±${shown.tolerance_pct}%)`}
              {shown.type === 'time' && `Határidő: ${formatTimeShort(shown.target_time)}`}
            </p>
          </div>
          <span
            className="rounded-full px-3 py-1 text-[12px] font-semibold"
            style={{
              background: done ? 'rgba(var(--accent-rgb),0.16)' : 'rgba(255,255,255,0.06)',
              color: done ? 'var(--accent)' : 'var(--color-ink-faint)',
            }}
          >
            {done ? 'Teljesítve' : 'Nincs meg'}
          </span>
        </div>

        {shown.type === 'binary' ? (
          <div className="flex items-center justify-between rounded-2xl bg-white/4 px-4 py-3">
            <span className="text-[15px]">Mai állapot</span>
            <CheckButton
              checked={log?.done === true}
              label={shown.name}
              onClick={() => {
                haptic(log?.done ? 'tick' : 'success')
                void write({ done: !(log?.done === true) })
              }}
            />
          </div>
        ) : shown.type === 'time' ? (
          <div className="flex flex-col gap-3">
            <TimeField
              label="Rögzített időpont"
              hint={`Teljesítve, ha ${formatTimeShort(shown.target_time)} előtt van — éjfél után is helyesen számol.`}
              value={log?.time_value ?? null}
              onCommit={(v) => void write({ time_value: v })}
            />
            <button
              type="button"
              onClick={() => {
                const now = new Date()
                const hh = String(now.getHours()).padStart(2, '0')
                const mm = String(now.getMinutes()).padStart(2, '0')
                haptic('tick')
                void write({ time_value: `${hh}:${mm}` })
              }}
              className="press btn-quiet h-11 w-full text-[14px]"
            >
              Most
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <NumberField
              label="Érték"
              autoFocus
              unit={shown.unit}
              min={limits.min}
              max={limits.max}
              error={error ?? undefined}
              hint={
                shown.type === 'range' && bounds
                  ? `A ${bounds.low}–${bounds.high} sávon belül számít teljesítettnek.`
                  : undefined
              }
              value={log?.value ?? null}
              onCommit={(v) => {
                const message = validateValue(shown, v)
                setError(message)
                if (!message) void write({ value: v })
              }}
            />
            {shown.target_value !== null ? (
              <div className="flex gap-2">
                {quickValues(shown).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      haptic('tick')
                      void write({ value: v })
                    }}
                    className="press btn-quiet num h-10 flex-1 text-[14px]"
                  >
                    {v}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* Lezáró gomb hüvelykujj-magasságban. A lap tetején is ott a pipa, de
            telefonon a fejléc a képernyő túlsó végén van — a billentyűzet
            fölül épp ez a sáv marad kézre eső távolságban. */}
        <button
          type="button"
          disabled={Boolean(error)}
          onClick={onClose}
          className="press btn-primary h-12 w-full text-[15px] disabled:opacity-40"
        >
          <Icon name="check" size={18} />
          Kész
        </button>

        {log ? (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              await clearHabitValue(shown, dateKey)
              onClose()
            }}
            className="press btn-quiet h-11 w-full text-[14px] text-ink-soft disabled:opacity-40"
          >
            <Icon name="rotate-ccw" size={16} />
            Bejegyzés törlése
          </button>
        ) : null}
      </div>
    </Sheet>
  )
}

function quickValues(habit: Habit): number[] {
  const t = habit.target_value
  if (t === null) return []
  const round = (n: number) => (t >= 1000 ? Math.round(n / 100) * 100 : Number(n.toFixed(2)))
  return [round(t * 0.5), round(t * 0.75), round(t)]
}
