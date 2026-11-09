import { Icon } from './Icon'
import { addDaysKey, formatDateHu, isFutureKey, toDateKey } from '@/lib/date'
import { haptic } from '@/hooks/useHaptics'

interface DateNavProps {
  dateKey: string
  onChange: (next: string) => void
  /** Nagyobb, fejlécként használt változat (Opal: ‹ Today › középen). */
  prominent?: boolean
}

/**
 * Napok közti lapozás. Előre nem enged a mai napnál tovább — a jövőt nem lehet
 * naplózni; visszafelé bármeddig, mert az utólagos pótlás támogatott.
 */
export function DateNav({ dateKey, onChange, prominent }: DateNavProps) {
  const canGoForward = !isFutureKey(addDaysKey(dateKey, 1))
  const isToday = dateKey === toDateKey()

  const step = (delta: number) => {
    haptic('tick')
    onChange(addDaysKey(dateKey, delta))
  }

  if (prominent) {
    return (
      <div className="flex items-center justify-center gap-1">
        <button
          type="button" onClick={() => step(-1)} aria-label="Előző nap"
          className="press grid size-11 place-items-center rounded-full text-ink-faint"
        >
          <Icon name="chevron-left" size={20} />
        </button>
        <button
          type="button"
          onClick={() => !isToday && onChange(toDateKey())}
          disabled={isToday}
          aria-label={isToday ? 'A mai nap' : 'Ugrás a mai napra'}
          className="press min-w-[128px] px-2 py-1 text-[17px] font-semibold disabled:opacity-100"
        >
          {formatDateHu(dateKey)}
        </button>
        <button
          type="button" onClick={() => step(1)} aria-label="Következő nap" disabled={!canGoForward}
          className="press grid size-11 place-items-center rounded-full text-ink-faint disabled:opacity-25"
        >
          <Icon name="chevron-right" size={20} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button" onClick={() => step(-1)} aria-label="Előző nap"
        className="press btn-round text-ink-soft"
      >
        <Icon name="chevron-left" size={19} />
      </button>
      <button
        type="button"
        onClick={() => !isToday && onChange(toDateKey())}
        aria-label={isToday ? 'A mai nap' : 'Ugrás a mai napra'}
        disabled={isToday}
        className="press min-w-[132px] rounded-full bg-white/6 px-4 py-2.5 text-[14px] font-semibold disabled:opacity-100"
      >
        {formatDateHu(dateKey)}
      </button>
      <button
        type="button" onClick={() => step(1)} aria-label="Következő nap" disabled={!canGoForward}
        className="press btn-round text-ink-soft disabled:opacity-30"
      >
        <Icon name="chevron-right" size={19} />
      </button>
    </div>
  )
}
