import { Link } from 'react-router-dom'
import { Icon } from './Icon'
import type { GroupScore } from '@/domain/score'
import type { HabitGroup } from '@/domain/evaluate'

const META: Record<HabitGroup, { label: string; icon: string; to: string }> = {
  egeszseg: { label: 'Egészség', icon: 'heart', to: '/egeszseg' },
  edzes: { label: 'Edzés', icon: 'dumbbell', to: '/edzes' },
  szokasok: { label: 'Szokások', icon: 'list-checks', to: '/szokasok' },
}

/**
 * Három területi alpontszám a napi pontszám alatt: a fő szám bontása
 * Egészség / Edzés / Szokások szerint.
 *
 * Korábban egy vékony zárójel kötötte őket a pontszámhoz — Zsigi kérésére
 * kikerült, a hármas így is egyértelműen a fölötte lévő számhoz tartozik.
 */
export function MetricPills({ groups }: { groups: GroupScore[] }) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-3 gap-2">
        {groups.map((g) => {
          const meta = META[g.group]
          const empty = g.applicableCount === 0
          const strong = g.pct >= 80
          return (
            <Link
              key={g.group}
              to={meta.to}
              aria-label={`${meta.label}: ${g.pct} százalék, ${g.completedCount} a ${g.applicableCount}-ből`}
              className="press flex flex-col items-center gap-1.5"
            >
              <span
                className="num flex h-9 min-w-[74px] items-center justify-center gap-1.5 rounded-full px-3 text-[14px] font-semibold transition-colors"
                style={
                  empty
                    ? { border: '1px solid var(--color-line)', color: 'var(--color-ink-faint)' }
                    : {
                        border: `1px solid ${strong ? 'rgba(var(--accent-rgb),0.42)' : 'rgba(255,255,255,0.16)'}`,
                        color: strong ? 'var(--accent)' : 'var(--color-ink)',
                        boxShadow: strong
                          ? '0 0 16px -6px rgba(var(--accent-rgb),0.6), inset 0 0 12px -8px rgba(var(--accent-rgb),0.7)'
                          : 'none',
                      }
                }
              >
                <Icon name={meta.icon} size={13} />
                {empty ? '—' : g.pct}
              </span>
              <span className="text-[11.5px] text-ink-soft">{meta.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
