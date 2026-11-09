// 07-auth-rls-export.md + 15-beallitasok-export-ui.md
// CSV export backup céljára. Kliensoldali: a már betöltött Supabase-adatból dolgozik.

import type { Habit, HabitLog, HealthMetrics, WeightLog } from '@/lib/types'
import { repo } from './index'
import { toDateKey } from '@/lib/date'

/** RFC 4180 szerinti mezőkódolás — vessző, idézőjel és sortörés is belefér. */
function cell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(cell).join(','), ...rows.map((r) => r.map(cell).join(','))]
  // BOM, hogy az Excel felismerje az UTF-8-at (ékezetes habit-nevek)
  return '﻿' + lines.join('\r\n') + '\r\n'
}

export function habitLogsCsv(logs: HabitLog[], habits: Habit[]): string {
  const byId = new Map(habits.map((h) => [h.id, h]))
  const rows = logs
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((l) => {
      const h = byId.get(l.habit_id)
      return [l.date, h?.name ?? l.habit_id, h?.type ?? '', l.done, l.value, l.time_value, h?.unit ?? '']
    })
  return toCsv(['datum', 'szokas', 'tipus', 'teljesitve', 'ertek', 'idopont', 'egyseg'], rows)
}

export function healthMetricsCsv(rows: HealthMetrics[]): string {
  return toCsv(
    ['datum', 'lepes', 'kaloria', 'alvas_ora', 'viz_liter', 'kepernyoido_perc', 'lefekves'],
    rows
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((m) => [m.date, m.steps, m.calories, m.sleep_hours, m.water, m.screen_time, m.bedtime]),
  )
}

export function weightLogsCsv(rows: WeightLog[]): string {
  return toCsv(
    ['datum', 'idopont', 'sulykg', 'megjegyzes'],
    rows
      .slice()
      .sort((a, b) => a.measured_at.localeCompare(b.measured_at))
      .map((w) => [w.date, w.measured_at, w.weight, w.note]),
  )
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export interface ExportResult {
  files: { name: string; rows: number }[]
}

/** A teljes előzményt exportálja három CSV-be. */
export async function exportAll(fromDate = '2000-01-01', toDate = toDateKey()): Promise<ExportResult> {
  const [habits, logs, health, weights] = await Promise.all([
    repo.listHabits(),
    repo.listHabitLogs(fromDate, toDate),
    repo.listHealthMetrics(fromDate, toDate),
    repo.listWeightLogs(fromDate, toDate),
  ])

  const stamp = toDateKey()
  const files = [
    { name: `habit-logs-${stamp}.csv`, content: habitLogsCsv(logs, habits), rows: logs.length },
    { name: `health-metrics-${stamp}.csv`, content: healthMetricsCsv(health), rows: health.length },
    { name: `weight-logs-${stamp}.csv`, content: weightLogsCsv(weights), rows: weights.length },
  ]

  for (const f of files) downloadCsv(f.name, f.content)
  return { files: files.map(({ name, rows }) => ({ name, rows })) }
}
