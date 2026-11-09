import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Card, SectionTitle } from '@/components/Card'
import { CaveBackdrop } from '@/components/CaveBackdrop'
import { DateNav } from '@/components/DateNav'
import { GlowStone } from '@/components/GlowStone'
import { HabitDetailSheet } from '@/components/HabitDetailSheet'
import { HabitRow } from '@/components/HabitRow'
import { Icon } from '@/components/Icon'
import { MetricPills } from '@/components/MetricPills'
import { PageShell } from '@/components/PageShell'
import { RelapseSheet } from '@/components/RelapseSheet'
import { StarRating, TextArea } from '@/components/fields'
import { useSelectedDate } from '@/hooks/useSelectedDate'
import { isHabitApplicableOn } from '@/domain/evaluate'
import { groupScores } from '@/domain/score'
import { useAppData } from '@/hooks/useAppData'
import { haptic } from '@/hooks/useHaptics'
import { addDaysKey } from '@/lib/date'
import type { Habit } from '@/lib/types'

export function MaPage() {
  const navigate = useNavigate()
  const { dateKey, setDateKey } = useSelectedDate()
  const {
    habits, logsByDate, settings, streaks, scoreFor, reviewFor,
    writeHabitValue, toggleHabitDone, saveReview,
  } = useAppData()

  const [detail, setDetail] = useState<Habit | null>(null)
  const [relapseOpen, setRelapseOpen] = useState(false)

  const score = scoreFor(dateKey)
  const logs = logsByDate.get(dateKey)
  const review = reviewFor(dateKey)

  const yesterday = scoreFor(addDaysKey(dateKey, -1))
  const delta = yesterday.applicableCount === 0 ? null : score.pct - yesterday.pct

  const groups = useMemo(
    () => groupScores(habits, logs ?? new Map(), dateKey),
    [habits, logs, dateKey],
  )

  // A fogmosás szándékosan kimarad a checklistből: nem elmulasztható
  // kötelezettség, csak egy eszköz — a Szokások fülön él (lásd 11. dokumentum).
  const checklist = habits.filter(
    (h) => h.active && h.counts_toward_score && isHabitApplicableOn(h.frequency, dateKey),
  )

  /** Csak az idő típusnál van egy koppintásos rögzítés — lásd HabitRow. */
  const stampNow = (habit: Habit) => {
    const now = new Date()
    void writeHabitValue(habit, dateKey, {
      time_value: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    })
  }

  const toggle = (habit: Habit) => {
    // A Leszokás visszavonása nem sima kipipálás — külön, nyomva tartós megerősítés.
    if (habit.system_key === 'quit' && logs?.get(habit.id)?.done === true) {
      setRelapseOpen(true)
      return
    }
    // A "Kiegészítők" állapotát a tételes checklist adja, nem lehet itt felülütni.
    if (habit.system_key === 'supplements') {
      navigate('/szokasok')
      return
    }
    void toggleHabitDone(habit, dateKey)
  }

  return (
    <PageShell
      title="Ma"
      backdrop={<CaveBackdrop height={640} />}
      header={
        <header className="pt-2 pb-1">
          {/* Opal-fejléc: sorozat balra, fiók/beállítás jobbra */}
          <div className="flex items-center justify-between">
            <span
              className="num flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[14px] font-semibold"
              style={{
                color: streaks.current > 0 ? 'var(--color-mint)' : 'var(--color-ink-faint)',
              }}
              aria-label={`Jelenlegi sorozat: ${streaks.current} nap`}
            >
              <Icon name="flame" size={16} />
              {streaks.current}
            </span>
            <Link
              to="/beallitasok"
              aria-label="Beállítások"
              className="press btn-round text-ink-soft"
            >
              <Icon name="settings" size={17} />
            </Link>
          </div>
          <div className="mt-1">
            <DateNav dateKey={dateKey} onChange={setDateKey} prominent />
          </div>
        </header>
      }
    >
      {/* --- fénylő kő + pontszám + területi bontás -----------------------
          A hérosz kitölti az első képernyőt: a barlang, a kő, a pontszám és a
          három terület egyben látszik, más nem lóg be alulról. A checklist és
          a napi értékelés a hajtás alatt marad — ott van, egy görgetésre, de
          nem osztozik a figyelemmel a kővel.

          A magasság a látható területből (`100dvh`) indul, és levonja a
          fejlécet meg a lebegő navigációt. `min-height`, nem `height`: kis
          kijelzőn inkább nőjön a szakasz, mint hogy levágja a pontszámot. */}
      <section
        className="flex flex-col items-center justify-center pt-1"
        style={{
          minHeight: 'calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 236px)',
        }}
      >
        <GlowStone pct={score.pct} thresholdPct={settings.daily_threshold_pct} />

        <p className="eyebrow mt-5">Napi pontszám</p>
        <div className="mt-1 flex items-start gap-1.5">
          <span
            className="num display text-[54px] leading-none"
            style={{ color: score.pct >= settings.daily_threshold_pct ? 'var(--color-mint)' : 'var(--color-ink)' }}
          >
            {score.pct}
          </span>
          {delta !== null && delta !== 0 ? (
            <span
              className="num mt-2.5 flex items-center gap-0.5 text-[13px] font-semibold"
              style={{ color: delta > 0 ? 'var(--color-good)' : 'var(--color-bad)' }}
              aria-label={`${delta > 0 ? 'Növekedés' : 'Csökkenés'} ${Math.abs(delta)} százalékpont a tegnapihoz képest`}
            >
              <svg width="9" height="8" viewBox="0 0 9 8" aria-hidden>
                <path d={delta > 0 ? 'M4.5 0 9 8H0z' : 'M4.5 8 0 0h9z'} fill="currentColor" />
              </svg>
              {Math.abs(delta)}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-[13px] text-ink-soft">
          {score.completedCount}/{score.applicableCount} szokás
        </p>

        <div className="mt-5 w-full">
          <MetricPills groups={groups} />
        </div>
      </section>

      {/* --- checklist ---------------------------------------------------- */}
      <section>
        <SectionTitle>Napi szokások</SectionTitle>
        <Card padded={false} className="overflow-hidden">
          {checklist.map((habit, i) => (
            <motion.div
              key={habit.id}
              initial={{ opacity: 0, transform: 'translateY(10px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              transition={{ delay: Math.min(i * 0.035, 0.3), duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            >
              <HabitRow
                habit={habit}
                log={logs?.get(habit.id)}
                onToggle={() => toggle(habit)}
                onQuickAdd={() => {
                  haptic('tick')
                  stampNow(habit)
                }}
                onOpenDetail={() => setDetail(habit)}
              />
            </motion.div>
          ))}
        </Card>
        <p className="mt-2 px-1 text-[12.5px] text-ink-faint">
          Koppints a sorra a pontos értékhez, vagy a jobb oldali gombra a gyors rögzítéshez.
        </p>
      </section>

      {/* --- napi értékelés ----------------------------------------------- */}
      <section>
        <SectionTitle>Napi értékelés</SectionTitle>
        <Card className="flex flex-col gap-4">
          <StarRating
            label="Hangulat"
            value={review?.mood ?? null}
            onChange={(v) => void saveReview(dateKey, { mood: v })}
          />
          <StarRating
            label="Energia"
            value={review?.energy ?? null}
            onChange={(v) => void saveReview(dateKey, { energy: v })}
          />
          <StarRating
            label="Stressz"
            value={review?.stress ?? null}
            onChange={(v) => void saveReview(dateKey, { stress: v })}
          />
          <NoteField
            key={dateKey}
            value={review?.note ?? ''}
            onSave={(note) => void saveReview(dateKey, { note })}
          />
        </Card>
      </section>

      <HabitDetailSheet habit={detail} dateKey={dateKey} onClose={() => setDetail(null)} />
      <RelapseSheet open={relapseOpen} dateKey={dateKey} onClose={() => setRelapseOpen(false)} />
    </PageShell>
  )
}

/** A jegyzet nem minden leütésre ment — kilépéskor (blur) írja ki. */
function NoteField({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [draft, setDraft] = useState(value)
  return (
    <div onBlur={() => draft !== value && onSave(draft)}>
      <TextArea
        label="Jegyzet"
        placeholder="Bármi, ami emlékezetes volt a napból…"
        value={draft}
        onChange={setDraft}
      />
    </div>
  )
}
