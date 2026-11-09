import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { Card } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { Reveal } from '@/components/Reveal'
import { MuscleRadar } from '@/components/MuscleRadarLazy'
import { Sheet } from '@/components/Sheet'
import { NumberField } from '@/components/fields'
import { useToast } from '@/components/Toast'
import {
  calcVolume, completedExercises, formatDuration, isExerciseDone,
  previousReference, reconcileSets, targetLabel,
} from '@/domain/workout'
import {
  addWorkoutSets, buildMuscleIndex, countSets, emptyTotals, hasMuscleData,
  plannedTotals, type MuscleTotals,
} from '@/domain/muscles'
import { MUSCLE_SOURCE_DAYS, findPlanDay } from '@/data/plans'
import { useAppData } from '@/hooks/useAppData'
import { haptic } from '@/hooks/useHaptics'
import { toDateKey } from '@/lib/date'
import type { WorkoutSets } from '@/lib/types'

const PHASE_NOTE: Record<string, string> = {
  hyper: 'Magasabb ismétlésszám (8–15), maximális pumpa.',
  strength: 'Alacsonyabb ismétlésszám (6–10), nagyobb intenzitás.',
}

const draftKey = (dayId: string) => `habit-tracker:workout-draft:${dayId}`

/**
 * Edzés-munkamenet: sorozatonként súly és ismétlés, időzítővel.
 *
 * A piszkozat localStorage-ban él, nem a Supabase-ben. Egy félbehagyott edzés
 * eszközhöz kötött állapot — nincs értelme szinkronizálni, viszont fontos, hogy
 * túlélje a lap újratöltését, ha edzés közben becsukódik a böngésző.
 */
export function EdzesSessionPage() {
  const { dayId = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { workouts, addWorkout } = useAppData()

  const day = useMemo(
    () => findPlanDay(dayId),
    [dayId],
  )

  const [sets, setSets] = useState<WorkoutSets>({})
  const [started, setStarted] = useState(false)
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const startedAt = useRef<number | null>(null)
  const accumulated = useRef(0)

  // --- piszkozat betöltése / mentése ------------------------------------
  useEffect(() => {
    if (!day) return
    let stored: WorkoutSets | null = null
    try {
      const raw = localStorage.getItem(draftKey(day.id))
      if (raw) {
        const parsed = JSON.parse(raw) as { date: string; sets: WorkoutSets }
        if (parsed.date === toDateKey()) stored = parsed.sets
      }
    } catch {
      /* sérült piszkozat — inkább üresen kezdünk */
    }
    setSets(reconcileSets(stored, day))
  }, [day])

  useEffect(() => {
    if (!day || Object.keys(sets).length === 0) return
    try {
      localStorage.setItem(draftKey(day.id), JSON.stringify({ date: toDateKey(), sets }))
    } catch {
      /* tele a tároló — a munkamenet ettől még folytatható */
    }
  }, [day, sets])

  // --- időzítő ------------------------------------------------------------
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      const base = accumulated.current
      const since = startedAt.current ? Math.floor((Date.now() - startedAt.current) / 1000) : 0
      setElapsed(base + since)
    }, 500)
    return () => window.clearInterval(id)
  }, [running])

  const start = () => {
    startedAt.current = Date.now()
    setStarted(true)
    setRunning(true)
    haptic('success')
  }
  const pause = useCallback(() => {
    if (startedAt.current) accumulated.current += Math.floor((Date.now() - startedAt.current) / 1000)
    startedAt.current = null
    setRunning(false)
  }, [])

  const volume = calcVolume(sets)
  const today = toDateKey()

  // Izomcsoport-bontás élőben: a terv a halvány kontúr, a kipipált sorozatok a
  // kitöltött alakzat. Edzés közben ebből látszik, mi maradt ki.
  const muscleIndex = useMemo(
    () => buildMuscleIndex(MUSCLE_SOURCE_DAYS),
    [],
  )
  const planned = useMemo(() => plannedTotals(day, muscleIndex), [day, muscleIndex])
  const done: MuscleTotals = useMemo(
    () => addWorkoutSets(emptyTotals(), sets, muscleIndex),
    [sets, muscleIndex],
  )
  const setCount = countSets(sets)

  const setField = (exId: string, index: number, field: 'w' | 'r', value: number | null) => {
    setSets((prev) => {
      const rec = prev[exId]
      if (!rec) return prev
      const next = rec.sets.slice()
      next[index] = { ...next[index], [field]: value }
      return { ...prev, [exId]: { sets: next } }
    })
  }

  const toggleDone = (exId: string, index: number) => {
    setSets((prev) => {
      const rec = prev[exId]
      if (!rec) return prev
      const next = rec.sets.slice()
      const wasDone = next[index].done
      next[index] = { ...next[index], done: !wasDone }
      haptic(wasDone ? 'tick' : 'success')
      return { ...prev, [exId]: { sets: next } }
    })
  }

  const addSet = (exId: string) => {
    setSets((prev) => {
      const rec = prev[exId]
      if (!rec) return prev
      haptic('tick')
      return { ...prev, [exId]: { sets: [...rec.sets, { w: null, r: null, done: false }] } }
    })
  }

  if (!day) {
    return (
      <div className="mx-auto grid min-h-dvh max-w-lg place-items-center px-4">
        <Card className="text-center">
          <p className="font-semibold">Nincs ilyen edzésnap</p>
          <button type="button" onClick={() => navigate('/edzes')} className="press btn-quiet mt-3 h-11 px-5">
            Vissza az Edzés fülre
          </button>
        </Card>
      </div>
    )
  }

  return (
    <div data-accent="sky" className="relative mx-auto w-full max-w-lg px-4 pt-safe">
      <header className="flex items-center gap-3 pt-3 pb-4">
        <button
          type="button"
          onClick={() => navigate('/edzes')}
          aria-label="Vissza"
          className="press btn-round text-ink-soft"
        >
          <Icon name="arrow-left" size={19} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="display truncate text-[21px]">{day.name}</h1>
          <p className="truncate text-[12.5px] text-ink-soft">{PHASE_NOTE[day.phase] ?? ''}</p>
        </div>
      </header>

      <div className="flex flex-col gap-3 pb-[calc(env(safe-area-inset-bottom)+150px)]">
        {day.exercises.map((ex, i) => {
          const rec = sets[ex.id]
          const allDone = isExerciseDone(rec?.sets)
          return (
            <Reveal key={ex.id} delay={Math.min(i * 40, 260)}>
              <Card
                className="flex flex-col gap-3"
                style={allDone ? { borderColor: 'rgba(var(--accent-rgb),0.3)' } : undefined}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="num grid size-8 shrink-0 place-items-center rounded-full text-[13px] font-semibold"
                    style={{
                      background: allDone ? 'rgba(var(--accent-rgb),0.16)' : 'rgba(255,255,255,0.07)',
                      color: allDone ? 'var(--accent)' : 'var(--color-ink-soft)',
                    }}
                  >
                    {allDone ? <Icon name="check" size={15} /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] leading-snug font-semibold">{ex.name}</p>
                    <p className="num mt-0.5 text-[12.5px] text-ink-soft">Cél: {targetLabel(ex)}</p>
                  </div>
                </div>

                <p className="rounded-xl bg-white/4 px-3 py-2 text-[12.5px] leading-snug text-ink-soft">
                  {ex.tip}
                </p>

                <div className="flex flex-col gap-1.5">
                  <div className="eyebrow grid grid-cols-[26px_60px_1fr_1fr_44px] items-center gap-2 px-0.5">
                    <span />
                    <span>Előző</span>
                    <span>Kg</span>
                    <span>Ism</span>
                    <span />
                  </div>

                  {rec?.sets.map((s, si) => {
                    const prev = previousReference(workouts, ex.id, si, today)
                    return (
                      <div key={si} className="grid grid-cols-[26px_60px_1fr_1fr_44px] items-center gap-2">
                        <span className="num text-center text-[12px] text-ink-faint">{si + 1}</span>
                        <span className="num text-[11.5px] text-ink-faint" title={prev ? `${prev.label} · ${prev.date}` : undefined}>
                          {prev ? `${prev.weight ?? '–'}×${prev.reps ?? '–'}` : '–'}
                        </span>
                        <SetInput
                          label={`${ex.name} ${si + 1}. sorozat súly`}
                          value={s.w}
                          placeholder="kg"
                          onChange={(v) => setField(ex.id, si, 'w', v)}
                        />
                        <SetInput
                          label={`${ex.name} ${si + 1}. sorozat ismétlés`}
                          value={s.r}
                          placeholder="ism"
                          onChange={(v) => setField(ex.id, si, 'r', v)}
                        />
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={s.done}
                          aria-label={`${ex.name} ${si + 1}. sorozat kész`}
                          onClick={() => toggleDone(ex.id, si)}
                          className="press grid size-11 place-items-center justify-self-end rounded-full border transition-colors"
                          style={{
                            borderColor: s.done ? 'transparent' : 'var(--color-line-strong)',
                            background: s.done
                              ? 'linear-gradient(135deg, var(--accent), var(--accent-2))'
                              : 'rgba(255,255,255,0.04)',
                            color: s.done ? '#04251b' : 'var(--color-ink-faint)',
                          }}
                        >
                          <Icon name="check" size={18} strokeWidth={s.done ? 2.6 : 1.75} />
                        </button>
                      </div>
                    )
                  })}

                  <button
                    type="button"
                    onClick={() => addSet(ex.id)}
                    className="press mt-1 h-10 rounded-full border border-dashed border-[var(--color-line-strong)] text-[13px] text-ink-soft"
                  >
                    + sorozat hozzáadása
                  </button>
                </div>
              </Card>
            </Reveal>
          )
        })}
      </div>

      {/* --- alsó vezérlősáv ------------------------------------------------
          A `document.body`-ba portálozva. A `position: fixed` a legközelebbi
          TRANSZFORMÁLT őshöz igazodik, nem a viewporthoz — a lapváltás
          animációja pedig pont ilyen transformot tesz a route köré. Enélkül a
          sáv a tartalom aljára ragadna, és le kellene görgetni hozzá: az idő és
          a megmozgatott súly épp edzés közben tűnne el.

          A `data-accent` azért kell ide is, mert a portál kikerül a lap
          DOM-fájából, és ott már nem érvényes a lapra tett akcentus. */}
      {createPortal(
        <div
          data-accent="sky"
          className="fixed inset-x-0 bottom-0 z-40 flex justify-center pb-safe"
        >
          <div className="floating mx-4 mb-2 w-full max-w-[440px] rounded-[26px] p-3.5">
          {!started ? (
            <button type="button" onClick={start} className="press btn-primary h-14 w-full text-[15px]">
              <Icon name="play" size={19} />
              Edzés indítása
            </button>
          ) : (
            <>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <span className="num text-[13px] text-ink-soft">
                  <span className="font-semibold text-ink">{setCount.done}</span>
                  {' / '}
                  {setCount.total} sorozat
                </span>
                <span className="num text-[20px] font-semibold" style={{ color: 'var(--accent)' }}>
                  {new Intl.NumberFormat('hu-HU').format(volume)}
                  <span className="ml-1 text-[12px] font-normal text-ink-soft">kg</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => (running ? pause() : (startedAt.current = Date.now(), setRunning(true)))}
                  aria-label={running ? 'Időzítő szüneteltetése' : 'Időzítő folytatása'}
                  className="press num flex h-12 min-w-[104px] items-center justify-center gap-2 rounded-full border border-[var(--color-line)] text-[18px] font-semibold"
                >
                  <Icon name={running ? 'pause' : 'play'} size={16} />
                  {formatDuration(elapsed)}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    pause()
                    setSummaryOpen(true)
                  }}
                  className="press btn-primary h-12 flex-1 text-[15px]"
                >
                  <Icon name="check" size={18} />
                  Befejezés
                </button>
              </div>
            </>
          )}
          </div>
        </div>,
        document.body,
      )}

      <SummarySheet
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        dayName={day.name}
        exerciseCount={day.exercises.length}
        doneCount={completedExercises(sets)}
        volume={volume}
        seconds={elapsed}
        setCount={setCount}
        muscles={done}
        plannedMuscles={planned}
        onDiscard={() => {
          localStorage.removeItem(draftKey(day.id))
          setSummaryOpen(false)
          navigate('/edzes')
          toast.show('Edzés elvetve.', 'info')
        }}
        onSave={async (health) => {
          await addWorkout({
            date: toDateKey(),
            type: day.name,
            day_id: day.id,
            sets,
            total_volume: volume,
            duration_sec: elapsed,
            duration: Math.round(elapsed / 60),
            calories: health.calories,
            avg_hr: health.avgHr,
            max_hr: health.maxHr,
            note: null,
          })
          localStorage.removeItem(draftKey(day.id))
          haptic('success')
          toast.show(
            `${day.name} mentve — ${new Intl.NumberFormat('hu-HU').format(volume)} kg.`,
            'success',
          )
          setSummaryOpen(false)
          navigate('/edzes')
        }}
      />
    </div>
  )
}

/**
 * Kompakt számbevitel egy sorozathoz.
 *
 * Minden leütésre ment, nem csak fókuszvesztéskor: edzés közben teljesen
 * életszerű, hogy beírod az utolsó ismétlést és rögtön a Befejezésre nyúlsz —
 * a blur-alapú mentés ilyenkor elvesztette volna az értéket.
 *
 * A nyers szöveget külön tartjuk, hogy a félkész beírás ("6." vagy "-") ne
 * ugorjon vissza a szülő már elmentett értékére gépelés közben.
 */
function SetInput({
  label, value, placeholder, onChange,
}: { label: string; value: number | null; placeholder: string; onChange: (v: number | null) => void }) {
  const [draft, setDraft] = useState(value === null ? '' : String(value))

  useEffect(() => {
    // csak akkor írjuk felül a gépelt szöveget, ha a szülő tényleg mást tárol
    const parsed = parseNumber(draft)
    if (parsed !== value) setDraft(value === null ? '' : String(value))
    // szándékosan csak `value`-ra futunk: gépelés közben nem szólunk bele
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <input
      type="number"
      inputMode="decimal"
      aria-label={label}
      placeholder={placeholder}
      value={draft}
      onChange={(e) => {
        const raw = e.target.value
        setDraft(raw)
        onChange(parseNumber(raw))
      }}
      className="num h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] text-center text-[15px] outline-none [appearance:textfield] focus:border-[rgba(var(--accent-rgb),0.5)] [&::-webkit-inner-spin-button]:appearance-none"
    />
  )
}

/** '' → null, '6,5' → 6.5, szemét → null. */
function parseNumber(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.')
  if (trimmed === '') return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

function SummarySheet({
  open, onClose, dayName, exerciseCount, doneCount, volume, seconds,
  setCount, muscles, plannedMuscles, onSave, onDiscard,
}: {
  open: boolean
  onClose: () => void
  dayName: string
  exerciseCount: number
  doneCount: number
  volume: number
  seconds: number
  setCount: { done: number; total: number }
  muscles: MuscleTotals
  plannedMuscles: MuscleTotals
  onSave: (health: { calories: number | null; avgHr: number | null; maxHr: number | null }) => Promise<void>
  onDiscard: () => void
}) {
  const [calories, setCalories] = useState<number | null>(null)
  const [avgHr, setAvgHr] = useState<number | null>(null)
  const [maxHr, setMaxHr] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  return (
    <Sheet open={open} onClose={onClose} title={dayName}>
      <div className="flex flex-col gap-4">
        <div className="card-2 px-4 py-5 text-center">
          <p className="num display text-[38px] leading-none" style={{ color: 'var(--accent)' }}>
            {new Intl.NumberFormat('hu-HU').format(volume)}
            <span className="ml-1.5 text-[15px] font-normal text-ink-soft">kg</span>
          </p>
          <p className="eyebrow mt-2">Megmozgatott súly</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="card-2 px-3 py-3 text-center">
            <p className="num text-[18px] font-semibold">{formatDuration(seconds)}</p>
            <p className="eyebrow mt-1">Idő</p>
          </div>
          <div className="card-2 px-3 py-3 text-center">
            <p className="num text-[18px] font-semibold">{doneCount}/{exerciseCount}</p>
            <p className="eyebrow mt-1">Gyakorlat</p>
          </div>
          <div className="card-2 px-3 py-3 text-center">
            <p className="num text-[18px] font-semibold">{setCount.done}/{setCount.total}</p>
            <p className="eyebrow mt-1">Sorozat</p>
          </div>
        </div>

        {hasMuscleData(plannedMuscles) ? (
          <div className="card-2 px-2 pt-3 pb-1">
            <p className="eyebrow px-2">Mit terheltél</p>
            {/* A szaggatott kontúr a tervnap, a kitöltött alakzat a mai
                teljesítés — így a hiány is látszik, nem csak az eredmény. */}
            <MuscleRadar totals={muscles} planned={plannedMuscles} height={230} />
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-ink-soft">
            Apple Health — másold be a Shortcutsból, ha van. Üresen is menthető.
          </p>
          <NumberField label="Elégetett kalória" unit="kcal" value={calories} onCommit={setCalories} />
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Átlagpulzus" unit="bpm" value={avgHr} onCommit={setAvgHr} />
            <NumberField label="Maxpulzus" unit="bpm" value={maxHr} onCommit={setMaxHr} />
          </div>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              await onSave({ calories, avgHr, maxHr })
            } finally {
              setBusy(false)
            }
          }}
          className="press btn-primary h-12 w-full text-[15px]"
        >
          {busy ? 'Mentés…' : 'Mentés'}
        </button>
        <button type="button" onClick={onDiscard} className="press btn-quiet h-11 w-full text-[14px] text-ink-soft">
          Elvetés
        </button>
      </div>
    </Sheet>
  )
}
