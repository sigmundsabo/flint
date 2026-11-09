import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, SectionTitle } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { PageShell } from '@/components/PageShell'
import { NumberField } from '@/components/fields'
import { useAppData } from '@/hooks/useAppData'
import type { Habit } from '@/lib/types'
import { AccountSection } from './beallitasok/AccountSection'
import { ExportSection } from './beallitasok/ExportSection'
import { HabitEditSheet, describeTarget } from './beallitasok/HabitEditSheet'
import { ListSetting } from './beallitasok/ListSetting'
import { NeckSettings } from './beallitasok/NeckSettings'
import { SupplementSettings } from './beallitasok/SupplementSettings'

export function BeallitasokPage() {
  const navigate = useNavigate()
  const { habits, settings, saveSetting } = useAppData()
  const [editing, setEditing] = useState<Habit | null>(null)

  return (
    <PageShell
      title="Beállítások"
      subtitle="Minden cél kód nélkül szerkeszthető"
      action={
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Vissza"
          className="press btn-round text-ink-soft"
        >
          <Icon name="arrow-left" size={19} />
        </button>
      }
    >
      {/* --- globális célok ------------------------------------------------ */}
      <section>
        <SectionTitle>Globális célok</SectionTitle>
        <Card className="flex flex-col gap-4">
          <NumberField
            label="Napi sikerküszöb"
            unit="%"
            min={1}
            max={100}
            value={settings.daily_threshold_pct}
            onCommit={(v) => v !== null && void saveSetting('daily_threshold_pct', v)}
            hint="E fölött számít sikeresnek a nap, és ez tartja életben a sorozatot."
          />
          <NumberField
            label="Célsúly"
            unit="kg"
            value={settings.target_weight}
            onCommit={(v) => void saveSetting('target_weight', v)}
            hint="Referenciavonalként jelenik meg a testsúly-grafikonon."
          />
          <NumberField
            label="Fogmosás időzítő"
            unit="mp"
            min={30}
            value={settings.toothbrush_seconds}
            onCommit={(v) => v !== null && void saveSetting('toothbrush_seconds', v)}
          />
        </Card>
      </section>

      {/* --- habit célértékek --------------------------------------------- */}
      <section>
        <SectionTitle>Szokások és célértékek</SectionTitle>
        <Card padded={false} className="overflow-hidden">
          {habits.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => setEditing(h)}
              className="flex min-h-[56px] w-full items-center gap-3 border-b border-[var(--color-line)] px-3.5 py-3 text-left last:border-b-0"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/6 text-ink-soft">
                <Icon name={h.icon} size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">
                  {h.name}
                  {!h.active ? <span className="ml-2 text-[12px] text-ink-faint">(inaktív)</span> : null}
                </span>
                <span className="block truncate text-[12.5px] text-ink-faint">{describeTarget(h)}</span>
              </span>
              <Icon name="chevron-right" size={17} className="shrink-0 text-ink-faint" />
            </button>
          ))}
        </Card>
      </section>

      <SupplementSettings />
      <ListSetting
        title="Edzéstípusok"
        hint="Ez a lista jelenik meg az új edzés rögzítésénél."
        items={settings.workout_types}
        onChange={(items) => void saveSetting('workout_types', items)}
      />
      <NeckSettings />
      <ExportSection />
      <AccountSection />

      <HabitEditSheet habit={editing} onClose={() => setEditing(null)} />
    </PageShell>
  )
}
