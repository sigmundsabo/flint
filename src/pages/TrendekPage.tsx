import { useMemo } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts'
import { Card, SectionTitle } from '@/components/Card'
import { Heatmap } from '@/components/Heatmap'
import { Reveal } from '@/components/Reveal'
import { Icon } from '@/components/Icon'
import { EmptyState, PageShell } from '@/components/PageShell'
import { TabHero } from '@/components/TabHero'
import { completionRates } from '@/domain/score'
import { useAppData } from '@/hooks/useAppData'
import { addDaysKey, formatDateShortHu, toDateKey } from '@/lib/date'

export function TrendekPage() {
  const { habits, logsByDate, scores, scoreByDate, settings, streaks } = useAppData()
  const reduced = useReducedMotion()
  const threshold = settings.daily_threshold_pct
  const today = toDateKey()

  const recorded = useMemo(
    () => scores.filter((s) => s.date <= today && logsByDate.has(s.date)),
    [scores, logsByDate, today],
  )

  const successfulDays = recorded.filter((s) => s.pct >= threshold).length
  const avgScore = recorded.length
    ? Math.round(recorded.reduce((sum, s) => sum + s.pct, 0) / recorded.length)
    : 0

  const last30 = useMemo(() => {
    const from = addDaysKey(today, -29)
    return scores
      .filter((s) => s.date >= from && s.date <= today)
      .map((s) => ({ date: s.date, label: formatDateShortHu(s.date), pct: s.pct }))
  }, [scores, today])

  const rates = useMemo(() => {
    const from = addDaysKey(today, -29)
    const dates: string[] = []
    for (let d = from; d <= today; d = addDaysKey(d, 1)) dates.push(d)
    return completionRates(habits, logsByDate, dates)
  }, [habits, logsByDate, today])

  return (
    <PageShell
      title="Trendek"
      subtitle="Statisztikák és minták"
      backdrop={<TabHero src="/hero-trendek.webp" />}
      action={
        <Link
          to="/beallitasok"
          aria-label="Beállítások"
          className="press btn-round text-ink-soft"
        >
          <Icon name="settings" size={19} />
        </Link>
      }
    >
      {/* --- összegzés ---------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: 'flame', value: streaks.current, suffix: 'nap', label: 'Jelenlegi sorozat', chip: 'most', highlight: true },
          { icon: 'trophy', value: streaks.best, suffix: 'nap', label: 'Leghosszabb sorozat', chip: 'rekord' },
          { icon: 'check', value: successfulDays, suffix: 'nap', label: 'Sikeres nap', chip: `≥${threshold}%` },
          { icon: 'trending-up', value: avgScore, suffix: '%', label: 'Átlagos napi pontszám', chip: 'összes' },
        ].map((c, i) => (
          <Reveal key={c.label} delay={i * 60}>
            <StatCard {...c} />
          </Reveal>
        ))}
      </div>

      {/* --- 30 napos oszlopdiagram --------------------------------------- */}
      <Reveal delay={40}>
      <section>
        <SectionTitle>Utolsó 30 nap</SectionTitle>
        <Card>
          <div className="-mx-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last30} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.055)" vertical={false} />
                <XAxis
                  dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={26}
                  tick={{ fill: 'var(--color-ink-faint)', fontSize: 10.5 }}
                />
                <YAxis
                  domain={[0, 100]} ticks={[0, 50, 100]} tickLine={false} axisLine={false} width={40}
                  tick={{ fill: 'var(--color-ink-faint)', fontSize: 10.5 }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<ScoreTooltip />} />
                <ReferenceLine
                  y={threshold} stroke="rgba(127,224,174,0.55)" strokeDasharray="4 4"
                  label={{ value: `${threshold}%`, fill: 'var(--color-good)', fontSize: 10.5, position: 'right' }}
                />
                <Bar
                  dataKey="pct" fill="url(#bar-mint)" radius={[4, 4, 2, 2]} maxBarSize={14}
                  isAnimationActive={!reduced}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 px-1 text-[12px] text-ink-faint">
            A szaggatott vonal a napi sikerküszöb — e fölött számít sikeresnek a nap.
          </p>
        </Card>
      </section>
      </Reveal>

      {/* --- szokásonkénti arány ------------------------------------------ */}
      <Reveal delay={40}>
      <section>
        <SectionTitle>Szokásonkénti teljesítés · 30 nap</SectionTitle>
        {rates.length === 0 ? (
          <EmptyState title="Nincs elég adat" body="Néhány nap naplózása után itt látszik, melyik szokás a leggyengébb láncszem." />
        ) : (
          <Card padded={false} className="overflow-hidden">
            {rates.map((r, i) => (
              <Reveal
                key={r.habit.id}
                delay={i * 45}
                className="flex items-center gap-3 border-b border-[var(--color-line)] px-3.5 py-2.5 last:border-b-0"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/6 text-ink-soft">
                  <Icon name={r.habit.icon} size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[14.5px]">{r.habit.name}</span>
                    <span className="num shrink-0 text-[13px] font-semibold text-ink-soft">
                      {r.pct}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/7">
                    <div
                      className="size-full rounded-full"
                      style={{
                        background:
                          i === 0 && r.pct < 50
                            ? 'linear-gradient(90deg, rgba(226,115,133,0.7), var(--color-bad))'
                            : 'linear-gradient(90deg, var(--accent), var(--accent-2))',
                        clipPath: `inset(0 ${100 - r.pct}% 0 0)`,
                        transition: 'clip-path 520ms var(--ease-out)',
                      }}
                    />
                  </div>
                </div>
                <span className="num w-14 shrink-0 text-right text-[12px] text-ink-faint">
                  {r.done}/{r.applicable}
                </span>
              </Reveal>
            ))}
          </Card>
        )}
      </section>
      </Reveal>

      {/* --- éves heatmap -------------------------------------------------- */}
      <Reveal delay={40}>
      <section>
        <SectionTitle>Éves áttekintés</SectionTitle>
        <Card>
          <Heatmap scores={scoreByDate} thresholdPct={threshold} />
        </Card>
      </section>
      </Reveal>
    </PageShell>
  )
}

/**
 * Bento-kártya az Opal "Rules" rácsának a szerkezetével: bal felül ikoncsempe,
 * jobb felül metaadat-chip, alatta a nagy szám, legalul a halkabb címke.
 */
function StatCard({
  icon, value, suffix, label, chip, highlight,
}: {
  icon: string
  value: number
  suffix: string
  label: string
  chip?: string
  highlight?: boolean
}) {
  return (
    <div
      className="card flex flex-col gap-3 p-4"
      style={
        highlight
          ? {
              borderColor: 'rgba(var(--accent-rgb),0.24)',
              background:
                'linear-gradient(150deg, rgba(var(--accent-rgb),0.09), transparent 58%), var(--color-surface)',
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="grid size-9 place-items-center rounded-[11px]"
          style={{
            background: highlight ? 'rgba(var(--accent-rgb),0.14)' : 'rgba(255,255,255,0.07)',
            color: highlight ? 'var(--accent)' : 'var(--color-ink-soft)',
          }}
        >
          <Icon name={icon} size={18} />
        </span>
        {chip ? <span className="chip">{chip}</span> : null}
      </div>

      <div>
        {/* Nincs felszámolás: ezek történeti számok, nem változnak, amíg nézed.
            Egy naponta többször megnyitott fülön a dekoratív mozgás fárasztó. */}
        <p className="num display text-[28px]">
          {value}
          <span className="ml-1 text-[13px] font-medium text-ink-soft">{suffix}</span>
        </p>
        <p className="mt-1 text-[12.5px] text-ink-faint">{label}</p>
      </div>
    </div>
  )
}

function ScoreTooltip({ active, payload }: {
  active?: boolean
  payload?: { payload: { label: string; pct: number } }[]
}) {
  if (!active || !payload?.length) return null
  const { label, pct } = payload[0].payload
  return (
    <div className="card-2 px-3 py-2 text-[12.5px]">
      <p className="font-medium">{label}</p>
      <p className="num" style={{ color: 'var(--accent)' }}>{pct}%</p>
    </div>
  )
}
