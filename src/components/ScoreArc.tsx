import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface ScoreArcProps {
  /** 0–100 */
  pct: number
  /** Sikerküszöb — vékony jelölés a pályán. */
  thresholdPct: number
  label?: string
  /** Változás az előző naphoz képest, százalékpontban. */
  delta?: number | null
  size?: number
}

/**
 * Nyitott ív a napi pontszámhoz — az Opal "Opal Score" mutatójának a
 * geometriája: ~240 fokos pálya, alul réssel, vastag lekerekített vonal,
 * menta→jáde színátmenet, mögötte elmosott másolat az izzáshoz.
 *
 * Nem teljes gyűrű: a nyitott ív méroműszernek olvasódik, nem befejezendő
 * körnek — ettől nem lesz szemrehányó, ha a nap nincs tele.
 */
const SWEEP = 240 // fok
const START = -210 // fok, a 12 óra irányához képest elforgatva

export function ScoreArc({ pct, thresholdPct, label, delta, size = 224 }: ScoreArcProps) {
  const reduced = useReducedMotion()
  const clamped = Math.max(0, Math.min(100, pct))
  const displayed = useCountUp(clamped, reduced)

  const stroke = size * 0.055
  const r = (size - stroke * 2) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const visible = circumference * (SWEEP / 360)
  const progress = visible * (clamped / 100)
  const reached = clamped >= thresholdPct
  // 0%-nál a lekerekített vonalvég egy magányos pontot rajzolna a pálya elejére
  const showProgress = clamped > 0

  // A küszöb helye az íven, fokban
  const thresholdDeg = START + SWEEP * (thresholdPct / 100)

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size * 0.78 }}>
      {/* menta derengés, ami a teljesítéssel erősödik */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-full rounded-full blur-3xl transition-opacity duration-700"
        style={{
          background: 'radial-gradient(circle at 50% 44%, rgba(140,240,205,0.3), transparent 58%)',
          opacity: 0.1 + (clamped / 100) * 0.34,
        }}
      />

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute top-0 left-1/2 -translate-x-1/2"
        aria-hidden
      >
        <defs>
          <linearGradient id="arc-mint" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-jade-deep)" />
            <stop offset="45%" stopColor="var(--color-jade)" />
            <stop offset="100%" stopColor="var(--color-mint)" />
          </linearGradient>
          <filter id="arc-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={stroke * 0.7} />
          </filter>
        </defs>

        <g transform={`rotate(${START} ${cx} ${cy})`}>
          {/* pálya */}
          <circle
            cx={cx} cy={cy} r={r} fill="none"
            stroke="rgba(255,255,255,0.11)" strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${visible} ${circumference}`}
          />
          {/* izzás */}
          {showProgress ? (
          <circle
            cx={cx} cy={cy} r={r} fill="none"
            stroke="url(#arc-mint)" strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            filter="url(#arc-glow)"
            opacity={0.55}
            style={{ transition: reduced ? 'none' : 'stroke-dasharray 900ms var(--ease-out)' }}
          />
          ) : null}
          {/* maga az ív */}
          {showProgress ? (
          <circle
            cx={cx} cy={cy} r={r} fill="none"
            stroke="url(#arc-mint)" strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            style={{ transition: reduced ? 'none' : 'stroke-dasharray 900ms var(--ease-out)' }}
          />
          ) : null}
        </g>

        {/* küszöb-jelölés */}
        <g transform={`rotate(${thresholdDeg} ${cx} ${cy})`}>
          <line
            x1={cx} y1={cy - r - stroke * 0.62} x2={cx} y2={cy - r + stroke * 0.62}
            stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} strokeLinecap="round"
          />
        </g>
      </svg>

      <div className="absolute inset-x-0 top-[26%] flex flex-col items-center">
        <div className="flex items-start gap-1.5">
          <span
            className="num leading-none font-semibold"
            style={{ fontSize: size * 0.29, color: reached ? 'var(--color-mint)' : 'var(--color-ink)' }}
          >
            {Math.round(displayed)}
          </span>
          {delta !== null && delta !== undefined && delta !== 0 ? (
            <span
              className="num mt-2 flex items-center gap-0.5 text-[13px] font-semibold"
              style={{ color: delta > 0 ? 'var(--color-good)' : 'var(--color-bad)' }}
              aria-label={`${delta > 0 ? 'Növekedés' : 'Csökkenés'} ${Math.abs(delta)} százalékpont a tegnapihoz képest`}
            >
              <svg width="9" height="8" viewBox="0 0 9 8" aria-hidden>
                <path
                  d={delta > 0 ? 'M4.5 0 9 8H0z' : 'M4.5 8 0 0h9z'}
                  fill="currentColor"
                />
              </svg>
              {Math.abs(delta)}
            </span>
          ) : null}
        </div>
        {label ? <p className="mt-0.5 text-[13px] text-ink-soft">{label}</p> : null}
      </div>
    </div>
  )
}

/** Számgördítés — a 60fps "counter" mintája, ease-out kifutással. */
function useCountUp(target: number, disabled: boolean): number {
  const [value, setValue] = useState(target)
  const frame = useRef<number>(0)
  const from = useRef(target)

  useEffect(() => {
    if (disabled) {
      setValue(target)
      from.current = target
      return
    }
    const start = performance.now()
    const startValue = from.current
    const duration = 780

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(startValue + (target - startValue) * eased)
      if (t < 1) frame.current = requestAnimationFrame(tick)
      else from.current = target
    }

    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [target, disabled])

  return value
}
