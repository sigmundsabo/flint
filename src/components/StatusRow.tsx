import type { ReactNode } from 'react'

export type Status = 'good' | 'warn' | 'bad' | 'none'

const STATUS_COLOR: Record<Status, string> = {
  good: 'var(--color-good)',
  warn: 'var(--color-warn)',
  bad: 'var(--color-bad)',
  none: 'var(--color-ink-faint)',
}

interface StatusRowProps {
  label: string
  /** A mért érték, már formázva (pl. "7,5 óra"). */
  value: ReactNode
  /** Egyszavas minősítés a jobb szélen (pl. "Rendben", "Kevés"). */
  statusLabel: string
  status: Status
  /** 0–1 közötti kitöltöttség a szegmentált sávhoz. */
  progress: number
  segments?: number
  onClick?: () => void
}

/**
 * Az Opal "Sleep 0m — Short" sorának a szerkezete: bal oldalt a címke és az
 * érték, jobb oldalt egy egyszavas minősítés szemantikus színnel, alatta
 * szegmentált sáv.
 *
 * A szín sosem egyedüli hordozó: a minősítés ki is van írva szóval, tehát
 * színtévesztéssel is olvasható.
 */
export function StatusRow({
  label, value, statusLabel, status, progress, segments = 5, onClick,
}: StatusRowProps) {
  const filled = Math.max(0, Math.min(1, progress)) * segments
  const color = STATUS_COLOR[status]

  const body = (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-semibold">
          {label} <span className="num ml-1 font-normal text-ink-soft">{value}</span>
        </span>
        <span className="shrink-0 text-[13.5px] font-medium" style={{ color }}>
          {statusLabel}
        </span>
      </div>
      <div className="mt-2.5 flex gap-1" aria-hidden>
        {Array.from({ length: segments }, (_, i) => {
          const fill = Math.max(0, Math.min(1, filled - i))
          return (
            <span key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/8">
              {/* clip-path, nem width: a szélesség animálása minden képkockán
                  újratördelést és újrafestést kér, a clip-path csak kompozitálást.
                  Ráadásul a lekerekített vég nem torzul, ahogy scaleX-nél tenné. */}
              <span
                className="block size-full rounded-full"
                style={{
                  background: color,
                  clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)`,
                  transition: 'clip-path 480ms var(--ease-out)',
                }}
              />
            </span>
          )
        })}
      </div>
    </>
  )

  if (!onClick) return <div className="py-3.5">{body}</div>

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${statusLabel}. Szerkesztés`}
      className="press w-full py-3.5 text-left"
    >
      {body}
    </button>
  )
}

/** Egy vízszintes tartomány-sáv középen "ÁTLAG" jelölővel (Opal: AVG chip). */
export function RangeRow({
  label, value, statusLabel, status, position,
}: {
  label: string
  value: ReactNode
  statusLabel: string
  status: Status
  /** 0–1: hol áll az érték a sávon belül. */
  position: number
}) {
  const color = STATUS_COLOR[status]
  const pos = Math.max(0.06, Math.min(0.94, position))
  return (
    <div className="py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-semibold">
          {label} <span className="num ml-1 font-normal text-ink-soft">{value}</span>
        </span>
        <span className="shrink-0 text-[13.5px] font-medium" style={{ color }}>
          {statusLabel}
        </span>
      </div>
      <div className="relative mt-3.5 h-[3px] rounded-full bg-white/8">
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: color,
            clipPath: `inset(0 ${(1 - pos) * 100}% 0 0)`,
            transition: 'clip-path 480ms var(--ease-out)',
          }}
        />
        <span
          className="eyebrow absolute -top-2.5 -translate-x-1/2 rounded-full border border-[var(--color-line)] bg-[var(--color-surface-3)] px-1.5 py-0.5 text-[9px] tracking-[0.1em]"
          style={{ left: `${pos * 100}%`, color: 'var(--color-ink-soft)' }}
        >
          ITT
        </span>
      </div>
    </div>
  )
}
