import { useMemo, useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Card, SectionTitle } from '@/components/Card'
import { DateNav } from '@/components/DateNav'
import { HabitDetailSheet } from '@/components/HabitDetailSheet'
import { Icon } from '@/components/Icon'
import { Reveal } from '@/components/Reveal'
import { StatusRow } from '@/components/StatusRow'
import { EmptyState, PageShell } from '@/components/PageShell'
import { TabHero } from '@/components/TabHero'
import { Sheet } from '@/components/Sheet'
import { NumberField, TextField } from '@/components/fields'
import { useToast } from '@/components/Toast'
import { useSelectedDate } from '@/hooks/useSelectedDate'
import { habitVerdict } from '@/domain/evaluate'
import { formatTimeShort } from '@/domain/time'
import { useAppData } from '@/hooks/useAppData'
import { addDaysKey, formatDateShortHu, toDateKey } from '@/lib/date'
import type { Habit, MetricKey } from '@/lib/types'

const METRIC_ORDER: MetricKey[] = ['steps', 'sleep_hours', 'calories', 'water', 'screen_time', 'bedtime']

export function EgeszsegPage() {
  const { dateKey, setDateKey } = useSelectedDate()
  const { habits, logsByDate } = useAppData()
  const [detail, setDetail] = useState<Habit | null>(null)

  const logs = logsByDate.get(dateKey)
  const metricHabits = useMemo(
    () =>
      METRIC_ORDER
        .map((key) => habits.find((h) => h.metric_key === key && h.active))
        .filter((h): h is Habit => Boolean(h)),
    [habits],
  )

  return (
    <PageShell
      title="Egészség"
      subtitle="Napi mérések és testsúly"
      backdrop={<TabHero src="/hero-egeszseg.webp" />}
    >
      <Card raised className="flex justify-center py-2">
        <DateNav dateKey={dateKey} onChange={setDateKey} />
      </Card>

      <Reveal>
      <section>
        <SectionTitle>Napi metrikák</SectionTitle>
        <Card className="divide-y divide-[var(--color-line)] py-0">
          {metricHabits.map((habit) => {
            const log = logs?.get(habit.id)
            const verdict = habitVerdict(habit, log)
            return (
              <StatusRow
                key={habit.id}
                label={habit.name}
                value={formatMetricValue(habit, log?.value ?? null, log?.time_value ?? null)}
                statusLabel={verdict.label}
                status={verdict.status}
                progress={verdict.progress}
                onClick={() => setDetail(habit)}
              />
            )
          })}
        </Card>
        <p className="mt-2 px-1 text-[12.5px] text-ink-faint">
          Koppints egy sorra az érték rögzítéséhez vagy módosításához.
        </p>
      </section>
      </Reveal>

      <Reveal delay={80}><WeightModule /></Reveal>

      <HabitDetailSheet habit={detail} dateKey={dateKey} onClose={() => setDetail(null)} />
    </PageShell>
  )
}

const numberFormat = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 2 })

function formatMetricValue(habit: Habit, value: number | null, time: string | null): string {
  if (habit.type === 'time') return time ? formatTimeShort(time) : '—'
  if (value === null) return '—'
  return `${numberFormat.format(value)}${habit.unit ? ' ' + habit.unit : ''}`
}

/* ==========================================================================
   Testsúly almodul — nem külön fül, itt él (13-egeszseg-edzes-ui.md).
   Egy napon belül több mérés is rögzíthető.
   ========================================================================== */
function WeightModule() {
  const { weights, settings, addWeight, deleteWeight } = useAppData()
  const reduced = useReducedMotion()
  const toast = useToast()
  const [open, setOpen] = useState(false)

  const chartData = useMemo(() => buildWeightSeries(weights), [weights])
  const latest = weights.length ? weights[weights.length - 1] : null
  const target = settings.target_weight

  // A célsúly-vonal beleférjen a tengelybe — különben a domain kivágja, és a
  // referenciavonal némán eltűnik.
  const yDomain = useMemo<[number | string, number | string]>(() => {
    const values = chartData.flatMap((p) => [p.weight, p.avg7]).filter((v): v is number => v !== null)
    if (values.length === 0) return ['dataMin - 1', 'dataMax + 1']
    const lo = Math.min(...values, target ?? Infinity) - 0.8
    const hi = Math.max(...values, target ?? -Infinity) + 0.8
    return [Math.floor(lo), Math.ceil(hi)]
  }, [chartData, target])

  return (
    <section>
      <SectionTitle
        action={
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="press flex items-center gap-1.5 rounded-full bg-white/6 px-3 py-1.5 text-[12.5px] font-medium"
          >
            <Icon name="plus" size={14} />
            Mérés
          </button>
        }
      >
        Testsúly
      </SectionTitle>

      <Card className="flex flex-col gap-4">
        <div className="flex items-end gap-4">
          <div>
            <p className="num text-[32px] leading-none font-bold">
              {latest ? latest.weight.toFixed(1) : '—'}
              <span className="ml-1 text-[14px] font-medium text-ink-soft">kg</span>
            </p>
            <p className="mt-1 text-[12px] text-ink-faint">
              {latest ? `Utolsó mérés: ${formatDateShortHu(latest.date)}` : 'Még nincs mérés'}
            </p>
          </div>
          {target ? (
            <div className="ml-auto text-right">
              <p className="num text-[17px] font-semibold text-ink-soft">{target.toFixed(1)} kg</p>
              <p className="text-[12px] text-ink-faint">Célsúly</p>
            </div>
          ) : null}
        </div>

        {chartData.length >= 2 ? (
          <div className="-mx-2 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="label" tickLine={false} axisLine={false} minTickGap={28}
                  tick={{ fill: 'var(--color-ink-faint)', fontSize: 11 }}
                />
                <YAxis
                  tickLine={false} axisLine={false} width={40} domain={yDomain}
                  tick={{ fill: 'var(--color-ink-faint)', fontSize: 11 }}
                  tickFormatter={(v: number) => v.toFixed(0)}
                />
                <Tooltip content={<WeightTooltip />} />
                {target ? (
                  <ReferenceLine
                    y={target} stroke="var(--color-good)" strokeDasharray="4 4"
                    label={{ value: 'cél', fill: 'var(--color-good)', fontSize: 11, position: 'insideTopRight' }}
                  />
                ) : null}
                <Line
                  type="monotone" dataKey="weight" name="Mérés"
                  stroke="rgba(255,255,255,0.28)" strokeWidth={1.5} dot={false} connectNulls
                  isAnimationActive={!reduced}
                />
                <Line
                  type="monotone" dataKey="avg7" name="7 napos átlag"
                  stroke="var(--accent)" strokeWidth={2.5} dot={false} connectNulls
                  isAnimationActive={!reduced}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            title="Kevés az adat a grafikonhoz"
            body="Legalább két mérés kell, hogy trendet lehessen rajzolni. A 7 napos mozgóátlag simítja a napi ingadozást."
          />
        )}

        {weights.length ? (
          <ul className="flex flex-col gap-1">
            {weights.slice(-5).reverse().map((w) => (
              <li key={w.id} className="flex items-center gap-3 rounded-xl bg-white/4 px-3 py-2">
                <span className="num text-[15px] font-semibold">{w.weight.toFixed(1)} kg</span>
                <span className="text-[12.5px] text-ink-faint">
                  {formatDateShortHu(w.date)} · {new Date(w.measured_at).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {w.note ? <span className="truncate text-[12.5px] text-ink-soft">{w.note}</span> : null}
                <button
                  type="button"
                  onClick={async () => {
                    await deleteWeight(w.id)
                    toast.show('Mérés törölve.', 'info')
                  }}
                  aria-label="Mérés törlése"
                  className="press ml-auto grid size-9 place-items-center rounded-full text-ink-faint"
                >
                  <Icon name="trash" size={15} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <AddWeightSheet open={open} onClose={() => setOpen(false)} onAdd={addWeight} />
    </section>
  )
}

function AddWeightSheet({
  open, onClose, onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (input: { date: string; measured_at: string; weight: number; note?: string | null }) => Promise<void>
}) {
  const toast = useToast()
  const [weight, setWeight] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    // Reális korlát: egy elütött 850 kg nemcsak hibás adat, hanem évekre
    // szétlövi a testsúly-grafikon skáláját és a mozgóátlagot is.
    if (weight === null || weight < WEIGHT_MIN || weight > WEIGHT_MAX) {
      setError(`A testsúly ${WEIGHT_MIN} és ${WEIGHT_MAX} kg között lehet.`)
      return
    }
    await onAdd({ date: toDateKey(), measured_at: new Date().toISOString(), weight, note: note || null })
    toast.show('Mérés rögzítve.', 'success')
    setWeight(null)
    setNote('')
    setError(null)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Új testsúlymérés">
      <div className="flex flex-col gap-4">
        <NumberField
          label="Testsúly" unit="kg" value={weight} onCommit={setWeight}
          min={WEIGHT_MIN} max={WEIGHT_MAX}
          hint="Egy napon belül több mérés is rögzíthető — reggel és este külön."
        />
        {error ? <p role="alert" className="text-[13px] text-[var(--color-bad)]">{error}</p> : null}
        <TextField label="Megjegyzés (nem kötelező)" value={note} onChange={setNote} placeholder="pl. reggel, éhgyomorra" />
        <button
          type="button" onClick={() => void submit()}
          className="press btn-primary h-12 w-full text-[15px]"
        >
          Rögzítés
        </button>
      </div>
    </Sheet>
  )
}

const WEIGHT_MIN = 20
const WEIGHT_MAX = 400

function WeightTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="card-2 px-3 py-2 text-[12.5px]">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="num" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : '—'} kg
        </p>
      ))}
    </div>
  )
}

interface WeightPoint {
  date: string
  label: string
  weight: number | null
  avg7: number | null
}

/** Napi átlag a több mérésből, plusz 7 napos mozgóátlag. */
export function buildWeightSeries(
  weights: { date: string; weight: number }[],
): WeightPoint[] {
  if (weights.length === 0) return []

  const byDate = new Map<string, number[]>()
  for (const w of weights) {
    const list = byDate.get(w.date) ?? []
    list.push(w.weight)
    byDate.set(w.date, list)
  }

  const dates = [...byDate.keys()].sort()
  const first = dates[0]
  const last = dates[dates.length - 1]

  const points: WeightPoint[] = []
  for (let cursor = first; cursor <= last; cursor = addDaysKey(cursor, 1)) {
    const values = byDate.get(cursor)
    points.push({
      date: cursor,
      label: formatDateShortHu(cursor),
      weight: values ? values.reduce((a, b) => a + b, 0) / values.length : null,
      avg7: null,
    })
  }

  for (let i = 0; i < points.length; i++) {
    const window = points.slice(Math.max(0, i - 6), i + 1).map((p) => p.weight).filter((v): v is number => v !== null)
    points[i].avg7 = window.length ? Number((window.reduce((a, b) => a + b, 0) / window.length).toFixed(2)) : null
  }

  return points
}
