import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { haptic } from '@/hooks/useHaptics'

interface TimerProps {
  seconds: number
  label?: string
  onComplete?: () => void
  size?: number
}

/**
 * Visszaszámláló. A nagy, tabuláris számjegyek az Opal időzítőjének a
 * karakterét viszik tovább (60fps.design) — fix szélességű számok, hogy a
 * layout ne remegjen másodpercenként.
 *
 * Az idő valós időbélyegből számolódik, nem tick-számlálásból, így a háttérbe
 * tett fül visszatéréskor is helyes értéket mutat.
 */
export function Timer({ seconds, label, onComplete, size = 220 }: TimerProps) {
  const [remaining, setRemaining] = useState(seconds)
  const [running, setRunning] = useState(false)
  const deadlineRef = useRef(0)
  const rafRef = useRef(0)
  const completedRef = useRef(false)

  useEffect(() => {
    setRemaining(seconds)
    setRunning(false)
    completedRef.current = false
  }, [seconds])

  const tick = useCallback(() => {
    const left = Math.max(0, (deadlineRef.current - Date.now()) / 1000)
    setRemaining(left)
    if (left <= 0) {
      setRunning(false)
      if (!completedRef.current) {
        completedRef.current = true
        haptic('success')
        onComplete?.()
      }
      return
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [onComplete])

  const start = () => {
    completedRef.current = false
    deadlineRef.current = Date.now() + (remaining > 0 ? remaining : seconds) * 1000
    setRunning(true)
    haptic('tick')
    rafRef.current = requestAnimationFrame(tick)
  }

  const pause = () => {
    cancelAnimationFrame(rafRef.current)
    setRunning(false)
    haptic('tick')
  }

  const reset = () => {
    cancelAnimationFrame(rafRef.current)
    setRunning(false)
    completedRef.current = false
    setRemaining(seconds)
    haptic('tick')
  }

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const progress = seconds > 0 ? 1 - remaining / seconds : 0
  const stroke = size * 0.055
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(Math.floor(remaining % 60)).padStart(2, '0')
  const finished = remaining <= 0

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative grid place-items-center" style={{ width: size, height: size }}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full blur-2xl transition-opacity duration-500"
          style={{
            background: 'radial-gradient(circle, rgba(var(--accent-rgb),0.4), transparent 70%)',
            opacity: running ? 0.55 : 0.18,
          }}
        />
        <svg width={size} height={size} className="relative -rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke="url(#ring-mint)" strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            style={{ transition: running ? 'none' : 'stroke-dashoffset 320ms var(--ease-out)' }}
          />
        </svg>
        <div
          className="absolute inset-0 grid place-content-center text-center"
          role="timer"
          aria-live="off"
          aria-label={`${label ?? 'Időzítő'}: ${mm}:${ss} van hátra`}
        >
          <p className="num text-[44px] leading-none font-bold" style={{ color: finished ? 'var(--color-good)' : 'var(--color-ink)' }}>
            {mm}:{ss}
          </p>
          {label ? <p className="mt-1.5 text-[12.5px] text-ink-soft">{label}</p> : null}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={running ? pause : start}
          disabled={finished && !running}
          className="press btn-primary h-12 min-w-[136px] px-6 text-[15px]"
        >
          <Icon name={running ? 'pause' : 'play'} size={18} />
          {running ? 'Szünet' : remaining < seconds ? 'Folytatás' : 'Indítás'}
        </button>
        <button
          type="button" onClick={reset} aria-label="Visszaállítás"
          className="press grid size-12 place-items-center rounded-full border border-[var(--color-line)] bg-white/5 text-ink-soft"
        >
          <Icon name="rotate-ccw" size={18} />
        </button>
      </div>
    </div>
  )
}
