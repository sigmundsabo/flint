import { useCallback, useEffect, useRef, useState } from 'react'
import { haptic } from '@/hooks/useHaptics'

interface HoldToConfirmProps {
  label: string
  holdingLabel?: string
  onConfirm: () => void
  /** Meddig kell nyomva tartani (ms). */
  durationMs?: number
  disabled?: boolean
}

/**
 * Nyomva tartós megerősítés — az Opal "Hold to Leave" gombjának mintájára.
 * Destruktív műveletnél ez érezteti a tétet: egy elgépelt tap nem elég.
 *
 * A töltés `clip-path`-szal megy, CSS-átmenettel, nem képkockánként rajzolva.
 * Így a kompozitorra kerül, és akkor is egyenletes marad, ha a főszál dolgozik.
 * Az időzítés szándékosan aszimmetrikus: a lenyomás lassú és LINEÁRIS (a
 * haladásjelző ne gyorsuljon), az elengedés viszont rövid és ease-out — ott már
 * a rendszer válaszol, nem a felhasználó dönt.
 *
 * Billentyűzettel is működik (Space / Enter nyomva tartás), tehát nem
 * gesztus-kizárólagos interakció.
 */
export function HoldToConfirm({
  label,
  holdingLabel = 'Tartsd nyomva…',
  onConfirm,
  durationMs = 1600,
  disabled = false,
}: HoldToConfirmProps) {
  const [holding, setHolding] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hapticRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const firedRef = useRef(false)

  const stop = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    if (hapticRef.current !== null) clearInterval(hapticRef.current)
    timerRef.current = null
    hapticRef.current = null
    setHolding(false)
  }, [])

  const start = useCallback(() => {
    if (disabled || holding) return
    firedRef.current = false
    setHolding(true)
    haptic('tick')

    // A megerősítést IDŐZÍTŐ váltja ki, nem a rajzolás: ha a böngésző háttérbe
    // teszi a lapot, a nyomva tartás akkor sem ragad be félúton.
    timerRef.current = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true
        haptic('warning')
        onConfirm()
      }
      stop()
    }, durationMs)

    hapticRef.current = setInterval(() => haptic('tick'), durationMs / 4)
  }, [disabled, durationMs, holding, onConfirm, stop])

  useEffect(() => stop, [stop])

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
          e.preventDefault()
          start()
        }
      }}
      onKeyUp={(e) => {
        if (e.key === ' ' || e.key === 'Enter') stop()
      }}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={`${label} — tartsd nyomva ${Math.round(durationMs / 100) / 10} másodpercig a megerősítéshez`}
      className="relative w-full touch-none overflow-hidden rounded-[var(--radius-pill)] border border-[rgba(226,115,133,0.42)] bg-[rgba(226,115,133,0.13)] px-5 py-4 text-[15px] font-semibold text-ink select-none disabled:opacity-40"
      style={{
        transform: holding ? 'scale(0.97)' : 'none',
        transition: 'transform 140ms var(--ease-out)',
      }}
    >
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, rgba(226,115,133,0.55), rgba(200,90,110,0.9))',
          clipPath: holding ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
          transition: holding
            ? `clip-path ${durationMs}ms linear`
            : 'clip-path 200ms var(--ease-out)',
        }}
      />
      <span className="relative z-10">{holding ? holdingLabel : label}</span>
    </button>
  )
}
