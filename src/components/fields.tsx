import { useEffect, useId, useState, type ReactNode } from 'react'
import { haptic } from '@/hooks/useHaptics'

/* --------------------------------------------------------------------------
   Közös mezőkeret: LÁTHATÓ címke (soha nem csak placeholder), opcionális
   segédszöveg, és a hibaüzenet közvetlenül a mező alatt.
   -------------------------------------------------------------------------- */
export function Field({
  label, hint, error, children, htmlFor,
}: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="px-0.5 text-[13px] font-medium text-ink-soft">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="px-0.5 text-[12.5px] text-[var(--color-bad)]">{error}</p>
      ) : hint ? (
        <p className="px-0.5 text-[12.5px] text-ink-faint">{hint}</p>
      ) : null}
    </div>
  )
}

const INPUT_CLASS =
  'h-12 w-full rounded-[var(--radius-pill)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 ' +
  'text-[16px] text-ink placeholder:text-ink-faint outline-none transition-colors focus:border-[rgba(var(--accent-rgb),0.5)]'

export function TextField({
  label, hint, value, onChange, placeholder,
}: { label: string; hint?: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const id = useId()
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <input
        id={id}
        type="text"
        className={INPUT_CLASS}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  )
}

/** Számbevitel — mobilon numerikus billentyűzetet nyit, léptető gombokkal. */
export function NumberField({
  label, hint, error, value, onCommit, unit, autoFocus, min, max,
}: {
  label: string
  hint?: string
  /** Ha ki van töltve, a hint helyén jelenik meg, pirossal. */
  error?: string
  value: number | null
  onCommit: (v: number | null) => void
  unit?: string | null
  /** Megnyitáskor fókuszálja és kijelöli a mezőt — így azonnal írható. */
  autoFocus?: boolean
  min?: number
  max?: number
}) {
  const id = useId()
  const [draft, setDraft] = useState(value === null ? '' : String(value))

  useEffect(() => {
    // Csak akkor írjuk felül a gépelt szöveget, ha a szülő tényleg mást tárol —
    // különben a félkész beírás ("6," vagy "-") visszaugrana gépelés közben.
    const parsed = parseNumber(draft)
    if (parsed !== value) setDraft(value === null ? '' : String(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      {/*
        Nincsenek léptető gombok. A lépésszámot, alvást, kalóriát nem adagolni
        akarod, hanem beírni: 13 740 lépéshez tizennégy koppintás kellene.
        A mező nagy és középre igazított, a mértékegység a jobb szélen ül.
      */}
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          autoFocus={autoFocus}
          min={min}
          max={max}
          placeholder="—"
          aria-invalid={error ? true : undefined}
          className="num h-14 w-full rounded-[var(--radius-pill)] border bg-[var(--color-surface-2)] px-14 text-center text-[24px] font-semibold text-ink outline-none transition-colors placeholder:text-ink-faint [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          style={{
            borderColor: error ? 'var(--color-bad)' : 'var(--color-line)',
            color: error ? 'var(--color-bad)' : undefined,
          }}
          value={draft}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            // Minden leütésre mentünk, nem csak fókuszvesztéskor: különben az
            // utolsó beírt szám elveszne, ha rögtön a mentésre koppintasz.
            setDraft(e.target.value)
            onCommit(parseNumber(e.target.value))
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
        />
        {unit ? (
          <span className="pointer-events-none absolute inset-y-0 right-5 flex items-center text-[14px] text-ink-faint">
            {unit}
          </span>
        ) : null}
      </div>
    </Field>
  )
}

/** '' → null, '6,5' → 6.5, szemét → null. */
function parseNumber(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.')
  if (trimmed === '') return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

export function TimeField({
  label, hint, value, onCommit,
}: { label: string; hint?: string; value: string | null; onCommit: (v: string | null) => void }) {
  const id = useId()
  const short = value ? value.slice(0, 5) : ''
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <input
        id={id}
        type="time"
        className={INPUT_CLASS + ' num'}
        value={short}
        onChange={(e) => onCommit(e.target.value || null)}
      />
    </Field>
  )
}

export function SelectField({
  label, hint, value, onChange, options,
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  const id = useId()
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <select
        id={id}
        className={INPUT_CLASS + ' appearance-none pr-9'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-[#131318]">
            {o}
          </option>
        ))}
      </select>
    </Field>
  )
}

export function TextArea({
  label, hint, value, onChange, placeholder, rows = 3,
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  const id = useId()
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <textarea
        id={id}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-none rounded-[20px] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3 text-[16px] text-ink placeholder:text-ink-faint outline-none transition-colors focus:border-[rgba(var(--accent-rgb),0.5)]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  )
}

/** 1–5 csillagos értékelés. A szám és az aria-label is ott van, nem csak a szín. */
export function StarRating({
  label, value, onChange,
}: { label: string; value: number | null; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between px-0.5">
        <span className="text-[13px] font-medium text-ink-soft">{label}</span>
        <span className="num text-[13px] text-ink-faint">{value ?? '—'}/5</span>
      </div>
      <div role="radiogroup" aria-label={label} className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = (value ?? 0) >= n
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`${label}: ${n} az 5-ből`}
              onClick={() => {
                haptic('tick')
                onChange(n)
              }}
              className="press h-11 flex-1 rounded-xl border text-[15px] font-semibold transition-colors"
              style={{
                borderColor: active ? 'rgba(var(--accent-rgb),0.5)' : 'var(--color-line)',
                background: active ? 'rgba(var(--accent-rgb),0.16)' : 'rgba(255,255,255,0.035)',
                color: active ? 'var(--accent)' : 'var(--color-ink-faint)',
              }}
            >
              {n}
            </button>
          )
        })}
      </div>
    </div>
  )
}
