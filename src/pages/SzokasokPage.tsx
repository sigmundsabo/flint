import { useMemo, useState } from 'react'
import { Card, SectionTitle } from '@/components/Card'
import { DateNav } from '@/components/DateNav'
import { CheckButton } from '@/components/HabitRow'
import { Icon } from '@/components/Icon'
import { EmptyState, PageShell } from '@/components/PageShell'
import { TabHero } from '@/components/TabHero'
import { RelapseSheet } from '@/components/RelapseSheet'
import { Reveal } from '@/components/Reveal'
import { Timer } from '@/components/Timer'
import { useToast } from '@/components/Toast'
import { useSelectedDate } from '@/hooks/useSelectedDate'
import { useAppData, useSupplementLogsFor } from '@/hooks/useAppData'
import { haptic } from '@/hooks/useHaptics'

export function SzokasokPage() {
  const { dateKey, setDateKey } = useSelectedDate()
  return (
    <PageShell
      title="Szokások"
      subtitle="Kiegészítők, Leszokás, fogmosás"
      backdrop={<TabHero src="/hero-szokasok.webp" />}
    >
      <Card raised className="flex justify-center py-3">
        <DateNav dateKey={dateKey} onChange={setDateKey} />
      </Card>
      <Reveal><SupplementChecklist /></Reveal>
      <Reveal delay={80}><QuitModule /></Reveal>
      <Reveal delay={160}><ToothbrushModule /></Reveal>
    </PageShell>
  )
}

/* ========================================================================== */
function SupplementChecklist() {
  const { dateKey } = useSelectedDate()
  const { supplements, habitBySystemKey, setSupplementTaken, writeHabitValue } = useAppData()
  const taken = useSupplementLogsFor(dateKey)

  const active = useMemo(() => supplements.filter((s) => s.active), [supplements])
  const habit = habitBySystemKey('supplements')
  const doneCount = active.filter((s) => taken.get(s.id)).length
  const allDone = active.length > 0 && doneCount === active.length

  /**
   * A "Kiegészítők" habit állapotát a checklist vezérli, de KIZÁRÓLAG akkor,
   * amikor tényleg pipálsz valamit. Nem effektként, mert az visszamenőleg
   * felülírná a régi napokat (ahol nincs tételes pipa, csak összesített habit-log).
   */
  const toggleSupplement = (supplementId: string, next: boolean) => {
    void setSupplementTaken(supplementId, dateKey, next)
    if (!habit) return
    const after = active.filter((s) =>
      s.id === supplementId ? next : taken.get(s.id) === true,
    ).length
    void writeHabitValue(habit, dateKey, { done: after === active.length })
  }

  if (active.length === 0) {
    return (
      <section>
        <SectionTitle>Kiegészítők</SectionTitle>
        <EmptyState
          title="Üres a lista"
          body="A Beállításokban vedd fel a kiegészítőket — például D-vitamin, omega-3, magnézium."
        />
      </section>
    )
  }

  return (
    <section>
      <SectionTitle>
        Kiegészítők
      </SectionTitle>
      <Card padded={false} className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--color-line)] px-3.5 py-2.5">
          <span className="text-[12.5px] text-ink-soft">Mai állás</span>
          <span className="num text-[13px] font-semibold" style={{ color: allDone ? 'var(--accent)' : 'var(--color-ink-soft)' }}>
            {doneCount}/{active.length}
          </span>
        </div>
        {active.map((s) => {
          const isTaken = taken.get(s.id) === true
          return (
            <div
              key={s.id}
              className="flex items-center gap-3 border-b border-[var(--color-line)] px-3.5 py-3 last:border-b-0"
            >
              <span
                className="grid size-9 shrink-0 place-items-center rounded-xl"
                style={{
                  background: isTaken ? 'rgba(var(--accent-rgb),0.16)' : 'rgba(255,255,255,0.055)',
                  color: isTaken ? 'var(--accent)' : 'var(--color-ink-soft)',
                }}
              >
                <Icon name="pill" size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium">{s.name}</p>
                <p className="truncate text-[12.5px] text-ink-faint">
                  {[s.dosage, s.schedule].filter(Boolean).join(' · ') || 'Nincs megadva adagolás'}
                </p>
              </div>
              <CheckButton
                checked={isTaken}
                label={s.name}
                onClick={() => {
                  haptic(isTaken ? 'tick' : 'success')
                  toggleSupplement(s.id, !isTaken)
                }}
              />
            </div>
          )
        })}
      </Card>
    </section>
  )
}

/* ========================================================================== */
function QuitModule() {
  const { dateKey } = useSelectedDate()
  const { habitBySystemKey, logsByDate, quitStreak, writeHabitValue } = useAppData()
  const [relapseOpen, setRelapseOpen] = useState(false)

  const habit = habitBySystemKey('quit')
  if (!habit) return null

  const log = logsByDate.get(dateKey)?.get(habit.id)
  const cleanToday = log?.done === true

  return (
    <section>
      <SectionTitle>Leszokás</SectionTitle>
      <Card raised className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <span
            className="grid size-14 shrink-0 place-items-center rounded-2xl"
            style={{ background: 'rgba(var(--accent-rgb),0.14)', color: 'var(--accent)' }}
          >
            <Icon name="shield" size={26} />
          </span>
          <div className="flex-1">
            <p className="num text-[34px] leading-none font-bold">
              {quitStreak.current}
              <span className="ml-1.5 text-[14px] font-medium text-ink-soft">
                {quitStreak.current === 1 ? 'nap' : 'nap'}
              </span>
            </p>
            <p className="mt-1 text-[12.5px] text-ink-faint">
              Jelenlegi sorozat · legjobb: {quitStreak.best} nap
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-white/4 px-4 py-3">
          <div>
            <p className="text-[14.5px] font-medium">Tiszta nap</p>
            <p className="text-[12.5px] text-ink-faint">Jelöld be, ha a mai nap rendben volt.</p>
          </div>
          <CheckButton
            checked={cleanToday}
            label="Tiszta nap"
            onClick={() => {
              if (cleanToday) {
                setRelapseOpen(true) // visszavonás = relapszus, külön megerősítéssel
                return
              }
              haptic('success')
              void writeHabitValue(habit, dateKey, { done: true })
            }}
          />
        </div>

        <button
          type="button"
          onClick={() => setRelapseOpen(true)}
          className="press flex h-12 items-center justify-center gap-2 rounded-2xl border text-[14.5px] font-semibold"
          style={{ borderColor: 'rgba(226,115,133,0.34)', color: 'var(--color-bad)' }}
        >
          <Icon name="ban" size={17} />
          Relapszus rögzítése
        </button>
        <p className="-mt-1 px-1 text-[12px] text-ink-faint">
          Figyelem: ez az adott nap összes szokását és mért értékét is törli.
        </p>
      </Card>

      <RelapseSheet open={relapseOpen} dateKey={dateKey} onClose={() => setRelapseOpen(false)} />
    </section>
  )
}

/* ==========================================================================
   Fogmosás — kizárólag időzítő. Nincs streak, nincs checklist-kötelezettség,
   és nem számít a napi pontszámba (11-quit-reset-fogmosas-kivetel.md).
   ========================================================================== */
function ToothbrushModule() {
  const { settings } = useAppData()
  const toast = useToast()

  return (
    <section>
      <SectionTitle>Fogmosás</SectionTitle>
      <Card className="flex flex-col items-center gap-3 py-6">
        <Timer
          seconds={settings.toothbrush_seconds}
          label="3 perc"
          size={196}
          onComplete={() => toast.show('Kész — 3 perc megvolt.', 'success')}
        />
        <p className="max-w-xs text-center text-[12.5px] text-ink-faint">
          Ez csak egy eszköz: nincs sorozat, nincs pipa, és nem befolyásolja a napi
          pontszámot.
        </p>
      </Card>
    </section>
  )
}
