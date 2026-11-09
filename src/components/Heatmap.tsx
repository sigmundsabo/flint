import { useEffect, useRef, useMemo } from 'react'
import { addDaysKey, fromDateKey, toDateKey } from '@/lib/date'
import type { DailyScore } from '@/domain/score'

const HU_MONTHS_SHORT = ['jan', 'feb', 'már', 'ápr', 'máj', 'jún', 'júl', 'aug', 'sze', 'okt', 'nov', 'dec']
const DAY_LABELS = ['H', '', 'Sze', '', 'P', '', 'V']

interface HeatmapProps {
  scores: Map<string, DailyScore>
  /** Hány napra visszamenőleg. */
  days?: number
  thresholdPct: number
}

/**
 * Éves heatmap, GitHub-stílusban, hónap-feliratokkal.
 * A szín önmagában nem hordoz információt: minden cellának van szöveges
 * címkéje (title + aria-label), és a küszöböt elérő napok külön peremet kapnak.
 */
export function Heatmap({ scores, days = 364, thresholdPct }: HeatmapProps) {
  const { weeks, monthLabels } = useMemo(() => {
    const today = toDateKey()
    // az utolsó oszlop vasárnappal záruljon, hogy a hetek egyenesek legyenek
    const endDow = (fromDateKey(today).getDay() + 6) % 7 // 0 = hétfő
    const end = addDaysKey(today, 6 - endDow)
    const start = addDaysKey(end, -(days - 1))

    const cells: string[] = []
    for (let d = start; d <= end; d = addDaysKey(d, 1)) cells.push(d)

    const weekCols: string[][] = []
    for (let i = 0; i < cells.length; i += 7) weekCols.push(cells.slice(i, i + 7))

    const labels: { col: number; text: string }[] = []
    let lastMonth = -1
    weekCols.forEach((week, col) => {
      const month = fromDateKey(week[0]).getMonth()
      if (month !== lastMonth) {
        labels.push({ col, text: HU_MONTHS_SHORT[month] })
        lastMonth = month
      }
    })

    return { weeks: weekCols, monthLabels: labels }
  }, [days])

  const today = toDateKey()
  const scrollerRef = useRef<HTMLDivElement>(null)

  // Mobilon a rács jóval szélesebb a képernyőnél. A friss napok érdekesek,
  // ezért a jobb szélén nyitunk — nem egy évvel ezelőtti üres cellákon.
  useEffect(() => {
    const el = scrollerRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [weeks.length])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5">
        {/* A napfeliratok a vízszintes görgetésen KÍVÜL maradnak, különben
            elúsznak a rács mellől. A felső margó a hónapfeliratok sorát hagyja ki. */}
        <div className="mt-[14px] flex w-[24px] shrink-0 flex-col gap-[3px]">
          {DAY_LABELS.map((d, i) => (
            <span key={i} className="h-[11px] text-[9.5px] leading-[11px] text-ink-faint">
              {d}
            </span>
          ))}
        </div>

        <div ref={scrollerRef} className="no-scrollbar flex-1 overflow-x-auto pb-1">
          <div className="inline-block">
            <div className="mb-[3px] flex gap-[3px]">
              {weeks.map((_, col) => {
                const label = monthLabels.find((m) => m.col === col)
                return (
                  <span key={col} className="h-[11px] w-[11px] shrink-0 text-[9.5px] leading-[11px] text-ink-faint">
                    {label?.text ?? ''}
                  </span>
                )
              })}
            </div>

            <div className="flex gap-[3px]">
              {weeks.map((week, col) => (
                <div key={col} className="flex shrink-0 flex-col gap-[3px]">
                  {week.map((dateKey) => {
                    const score = scores.get(dateKey)
                    const future = dateKey > today
                    const pct = score?.pct ?? 0
                    const hit = !future && score !== undefined && pct >= thresholdPct
                    return (
                      <span
                        key={dateKey}
                        title={future ? '' : `${dateKey} — ${pct}%${hit ? ' (sikeres nap)' : ''}`}
                        aria-label={future ? undefined : `${dateKey}: ${pct} százalék`}
                        className="block size-[11px] rounded-[3px]"
                        style={{
                          background: future ? 'transparent' : cellColor(pct),
                          boxShadow: hit ? 'inset 0 0 0 1px rgba(var(--accent-rgb),0.85)' : 'none',
                          opacity: future ? 0.25 : 1,
                        }}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* jelmagyarázat — a görgetőn kívül, hogy mindig látszódjon */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[10.5px] text-ink-faint">
        <span>kevesebb</span>
        {[0, 45, 65, 80, 95].map((p) => (
          <span key={p} className="size-[11px] rounded-[3px]" style={{ background: cellColor(p) }} />
        ))}
        <span>több</span>
        <span className="ml-1 flex items-center gap-1">
          <span
            className="size-[11px] rounded-[3px]"
            style={{ background: cellColor(90), boxShadow: 'inset 0 0 0 1px rgba(var(--accent-rgb),0.85)' }}
          />
          sikeres nap (≥{thresholdPct}%)
        </span>
      </div>
    </div>
  )
}

/**
 * Öt diszkrét fokozat, nem folytonos átmenet: 11 képpontos cellákon a
 * kvantált skála sokkal olvashatóbb — így egy 65%-os és egy 95%-os nap
 * ránézésre is elkülönül.
 */
const LEVELS = [
  'rgba(255,255,255,0.075)', // nincs adat / 0%
  '#26355C', // mély kék
  '#2F6383',
  '#38909B',
  '#5CC2A6',
  '#B4FFDC', // menta
]

function cellLevel(pct: number): number {
  if (pct <= 0) return 0
  if (pct < 40) return 1
  if (pct < 60) return 2
  if (pct < 75) return 3
  if (pct < 90) return 4
  return 5
}

function cellColor(pct: number): string {
  return LEVELS[cellLevel(pct)]
}
