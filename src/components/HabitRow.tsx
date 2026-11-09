import { motion } from 'motion/react'
import { Icon } from './Icon'
import { evaluateHabit, habitProgress, habitVerdict, rangeBounds } from '@/domain/evaluate'
import { formatTimeShort } from '@/domain/time'
import { haptic } from '@/hooks/useHaptics'
import type { Habit, HabitLog } from '@/lib/types'

export interface HabitRowProps {
  habit: Habit
  log: HabitLog | undefined
  /** Bináris váltás, illetve numerikus/idő gyors-rögzítés. */
  onToggle: () => void
  onQuickAdd?: () => void
  onOpenDetail: () => void
}

/** A habit típusához illő rövid értékfelirat. */
function valueLabel(habit: Habit, log: HabitLog | undefined): string {
  if (!log) return '—'
  switch (habit.type) {
    case 'binary':
      return log.done ? 'Kész' : log.done === false ? 'Nem' : '—'
    case 'time':
      return formatTimeShort(log.time_value)
    default:
      return log.value === null ? '—' : `${formatNumber(log.value)}${habit.unit ? ' ' + habit.unit : ''}`
  }
}

function targetLabel(habit: Habit): string {
  switch (habit.type) {
    case 'min':
      return `cél ≥ ${formatNumber(habit.target_value)}${habit.unit ? ' ' + habit.unit : ''}`
    case 'max':
      return `limit ≤ ${formatNumber(habit.target_value)}${habit.unit ? ' ' + habit.unit : ''}`
    case 'range': {
      const b = rangeBounds(habit)
      return b ? `${formatNumber(b.low)}–${formatNumber(b.high)}${habit.unit ? ' ' + habit.unit : ''}` : ''
    }
    case 'time':
      return `${formatTimeShort(habit.target_time)} előtt`
    default:
      return ''
  }
}

function formatNumber(n: number | null): string {
  if (n === null) return '—'
  return new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 2 }).format(n)
}

export function HabitRow({ habit, log, onToggle, onQuickAdd, onOpenDetail }: HabitRowProps) {
  const done = evaluateHabit(habit, log)
  const progress = habitProgress(habit, log)
  const verdict = habitVerdict(habit, log)
  const isBinary = habit.type === 'binary'

  // A csík színe a minősítést hordozza, nem a kitöltöttséget.
  //
  // Korábban csak a „warn" volt külön kezelve, minden más zöldet kapott — így
  // a 180 perces limitre beírt 6500 perc teli ZÖLD csíkot adott, vagyis a
  // legrosszabb eredmény úgy nézett ki, mint a teljesített. A minősítés
  // mindhárom állapotát ki kell színezni, különben a sáv az ellenkezőjét
  // állítja annak, ami történt.
  const hairline =
    verdict.status === 'bad'
      ? 'linear-gradient(90deg, rgba(226,115,133,0.45), var(--color-bad))'
      : verdict.status === 'warn'
        ? 'linear-gradient(90deg, rgba(240,198,116,0.5), var(--color-warn))'
        : 'linear-gradient(90deg, var(--accent-deep), var(--accent-2))'

  return (
    <div
      className="relative flex items-center gap-3 overflow-hidden border-b border-[var(--color-line)] px-3.5 py-3 last:border-b-0"
    >
      {/* Az Opal sorai tömörek: a haladást nem a sor háttere mutatja, hanem egy
          hajszálvékony csík az alsó élen — így a lista nem lesz foltos. */}
      {!isBinary && progress > 0 && !done ? (
        <span aria-hidden className="absolute inset-x-3.5 bottom-1 h-[2px] overflow-hidden rounded-full">
          <span
            className="block size-full rounded-full"
            style={{
              background: hairline,
              opacity: 0.75,
              clipPath: `inset(0 ${100 - Math.min(100, progress * 100)}% 0 0)`,
              transition: 'clip-path 320ms var(--ease-out)',
            }}
          />
        </span>
      ) : null}

      <button
        type="button"
        onClick={onOpenDetail}
        className="relative z-1 flex min-h-[44px] flex-1 items-center gap-3 text-left"
        aria-label={`${habit.name} szerkesztése`}
      >
        <span
          className="grid size-9 shrink-0 place-items-center rounded-xl transition-colors"
          style={{
            background: done ? 'rgba(var(--accent-rgb),0.16)' : 'rgba(255,255,255,0.055)',
            color: done ? 'var(--accent)' : 'var(--color-ink-soft)',
          }}
        >
          <Icon name={habit.icon} size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium">{habit.name}</span>
          <span className="block truncate text-[12.5px] text-ink-faint">{targetLabel(habit)}</span>
        </span>
        {!isBinary ? (
          (() => {
            const text = valueLabel(habit, log)
            const empty = text === '—'
            return (
              <span
                className="num shrink-0 font-semibold"
                style={{
                  fontSize: empty ? 13 : 15,
                  color: empty
                    ? 'var(--color-ink-faint)'
                    : done
                      ? 'var(--accent)'
                      : verdict.status === 'bad'
                        ? 'var(--color-bad)'
                        : verdict.status === 'warn'
                          ? 'var(--color-warn)'
                          : 'var(--color-ink-soft)',
                }}
              >
                {empty ? 'nincs' : text}
              </span>
            )
          })()
        ) : null}
      </button>

      {/* Egy tap: pipálás / gyors érték — almenü nélkül */}
      {isBinary ? (
        <CheckButton
          checked={done}
          label={habit.name}
          onClick={() => {
            haptic(done ? 'tick' : 'success')
            onToggle()
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            haptic('tick')
            // Az idő típusnál az egy koppintásos „most" bélyegzés valódi
            // gyorsítás. A számoknál viszont nincs mit léptetni: 13 740
            // lépéshez tizennégy koppintás kellene, ezért itt a beviteli mező
            // nyílik meg, fókuszáltan.
            if (habit.type === 'time') onQuickAdd?.()
            else onOpenDetail()
          }}
          aria-label={
            habit.type === 'time'
              ? `${habit.name}: aktuális idő rögzítése`
              : `${habit.name} értékének beírása`
          }
          className="press relative z-1 grid size-11 shrink-0 place-items-center rounded-full border border-[var(--color-line)] bg-white/5 text-ink-soft"
        >
          <Icon name={habit.type === 'time' ? 'timer' : 'pencil'} size={18} />
        </button>
      )}
    </div>
  )
}

export function CheckButton({
  checked, label, onClick,
}: { checked: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onClick}
      className="press relative z-1 grid size-11 shrink-0 place-items-center rounded-full border transition-colors"
      style={{
        borderColor: checked ? 'transparent' : 'var(--color-line-strong)',
        background: checked
          ? 'linear-gradient(135deg, var(--accent), var(--accent-2))'
          : 'rgba(255,255,255,0.04)',
        color: checked ? '#04251b' : 'var(--color-ink-faint)',
      }}
    >
      <motion.span
        initial={false}
        animate={checked ? { scale: [0.6, 1.18, 1], opacity: 1 } : { scale: 1, opacity: 0.5 }}
        transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
        className="grid place-items-center"
      >
        <Icon name="check" size={20} strokeWidth={checked ? 2.6 : 1.75} />
      </motion.span>
    </button>
  )
}
