import { useMemo } from 'react'
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts'
import { MUSCLE_GROUPS, type MuscleTotals } from '@/domain/muscles'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export interface MuscleRadarProps {
  /** Amit tényleg megcsináltál (kipipált sorozatokból). */
  totals: MuscleTotals
  /** Amit a terv előír — halvány külső kontúrként. Elhagyható. */
  planned?: MuscleTotals
  /**
   * A skála külső széle. Megadva rögzített (így két diagram összevethető),
   * elhagyva a legnagyobb értékhez igazodik.
   */
  max?: number
  height?: number
}

/**
 * Izomcsoport-pókháló.
 *
 * Miért pókháló és nem oszlopdiagram: itt nem az egyes értékek nagysága a
 * kérdés, hanem az ALAKZAT — hogy egyenletes-e a terhelés, vagy behorpad
 * valahol. Egy behorpadt sarok egy pillantással látszik, tíz oszlop
 * összehasonlítása viszont fejszámolás.
 *
 * A tengely mindig mind a tíz csoportot kirajzolja, a nullásokat is: a hiányzó
 * izomcsoport épp a lényeg, azt nem szabad elhagyni a diagramról.
 */
export function MuscleRadar({ totals, planned, max, height = 260 }: MuscleRadarProps) {
  const reduced = useReducedMotion()

  const data = useMemo(
    () =>
      MUSCLE_GROUPS.map((g) => ({
        muscle: g.short,
        done: totals[g.id].sets,
        planned: planned ? planned[g.id].sets : undefined,
      })),
    [totals, planned],
  )

  const domainMax = useMemo(() => {
    if (max) return max
    const peak = Math.max(...data.map((d) => Math.max(d.done, d.planned ?? 0)), 1)
    return Math.ceil(peak)
  }, [data, max])

  return (
    <div style={{ height }} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%" margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
          <PolarGrid stroke="rgba(255,255,255,0.09)" />
          <PolarAngleAxis
            dataKey="muscle"
            tick={{ fill: 'var(--color-ink-faint)', fontSize: 10.5 }}
          />
          <PolarRadiusAxis domain={[0, domainMax]} tick={false} axisLine={false} />
          {planned ? (
            <Radar
              name="Terv"
              dataKey="planned"
              stroke="rgba(255,255,255,0.3)"
              strokeDasharray="3 3"
              fill="none"
              isAnimationActive={!reduced}
            />
          ) : null}
          <Radar
            name="Teljesítve"
            dataKey="done"
            stroke="var(--accent)"
            fill="var(--accent)"
            fillOpacity={0.24}
            isAnimationActive={!reduced}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
