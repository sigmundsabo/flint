import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, SectionTitle } from '@/components/Card'
import { CountUp, Reveal } from '@/components/Reveal'
import { Icon } from '@/components/Icon'
import { EmptyState, PageShell } from '@/components/PageShell'
import { TabHero } from '@/components/TabHero'
import { MuscleRadar } from '@/components/MuscleRadarLazy'
import { Timer } from '@/components/Timer'
import { useToast } from '@/components/Toast'
import { useSelectedDate } from '@/hooks/useSelectedDate'
import { useAppData } from '@/hooks/useAppData'
import { haptic } from '@/hooks/useHaptics'
import { formatDuration } from '@/domain/workout'
import {
  MUSCLE_GROUPS, WEEKLY_SET_TARGET, buildMuscleIndex, hasMuscleData, muscleTotals,
} from '@/domain/muscles'
import { addDaysKey, formatDateShortHu } from '@/lib/date'
import { DEFAULT_PLAN_ID, MUSCLE_SOURCE_DAYS, PLANS, PLAN_IDS, findPlanDay, planDays } from '@/data/plans'
import type { Workout } from '@/lib/types'

export function EdzesPage() {
  return (
    <PageShell
      title="Edzés"
      subtitle="Terv, napló, izomcsoportok"
      backdrop={<TabHero src="/hero-edzes.webp" />}
    >
      <Reveal><TrainingStats /></Reveal>
      <Reveal delay={60}><MuscleModule /></Reveal>
      <Reveal delay={120}><WorkoutPlan /></Reveal>
      <Reveal delay={180}><WorkoutLog /></Reveal>
      <Reveal delay={240}><NeckModule /></Reveal>
    </PageShell>
  )
}

/* ==========================================================================
   Összesítés. Az edzsterv.netlify.app-ban felhalmozott előzmény (edzésszám
   és összsúly) kiindulási alapként számít bele — az ottani tételes napló nem
   jött át, csak a két összesítő szám, hogy a statisztika ne nulláról induljon.
   ========================================================================== */
function TrainingStats() {
  const { workouts, settings } = useAppData()
  const base = settings.workout_baseline

  const totalSessions = base.sessions + workouts.length
  const loggedVolume = workouts.reduce((sum, w) => sum + (w.total_volume ?? 0), 0)
  const totalVolume = Math.round(base.volumeKg + loggedVolume)

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatTile
        icon="dumbbell"
        chip="összesen"
        value={<CountUp value={totalSessions} />}
        suffix="edzés"
        label={`ebből ${base.sessions} a korábbi naplóból`}
        highlight
      />
      <StatTile
        icon="trending-up"
        chip="megmozgatva"
        value={<CountUp value={totalVolume} format={(n) => new Intl.NumberFormat('hu-HU').format(n)} />}
        suffix="kg"
        label={
          loggedVolume > 0
            ? `ebből ${new Intl.NumberFormat('hu-HU').format(Math.round(loggedVolume))} kg itt`
            : `ebből ${new Intl.NumberFormat('hu-HU').format(base.volumeKg)} kg a korábbi naplóból`
        }
      />
    </div>
  )
}

function StatTile({
  icon, chip, value, suffix, label, highlight,
}: {
  icon: string
  chip: string
  value: React.ReactNode
  suffix: string
  label: string
  highlight?: boolean
}) {
  return (
    <div
      className="card flex flex-col gap-3 p-4"
      style={
        highlight
          ? {
              borderColor: 'rgba(var(--accent-rgb), 0.24)',
              background:
                'linear-gradient(150deg, rgba(var(--accent-rgb), 0.09), transparent 58%), var(--color-surface)',
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="grid size-9 place-items-center rounded-[11px]"
          style={{
            background: highlight ? 'rgba(var(--accent-rgb), 0.14)' : 'rgba(255,255,255,0.07)',
            color: highlight ? 'var(--accent)' : 'var(--color-ink-soft)',
          }}
        >
          <Icon name={icon} size={18} />
        </span>
        <span className="chip">{chip}</span>
      </div>
      <div>
        <p className="num display text-[26px] leading-none">
          {value}
          <span className="ml-1 text-[13px] font-medium text-ink-soft">{suffix}</span>
        </p>
        <p className="mt-1.5 text-[12px] text-ink-faint">{label}</p>
      </div>
    </div>
  )
}

/* ==========================================================================
   Edzésterv — a terv a settings-ből jön, nem kódba égetve, tehát
   ugyanúgy szerkeszthető, mint a többi cél.
   ========================================================================== */
const PHASE_LABEL: Record<string, string> = {
  hyper: 'Hipertrófia',
  strength: 'Erő',
}

function WorkoutPlan() {
  const navigate = useNavigate()
  const { settings, saveSetting } = useAppData()
  // A régi, ötnapos terv is megmaradt: a naplód nagy része még az alatt
  // készült, és váltani is lehet rá. A napok azonosítói nem ütköznek, tehát a
  // két terv edzései egymás mellett megférnek az előzményben.
  const planId = settings.active_plan ?? DEFAULT_PLAN_ID
  const plan = planDays(planId)

  const lastDone = useLastDoneByType()

  return (
    <section>
      <SectionTitle
        action={
          <div className="flex shrink-0 gap-1 rounded-full bg-white/5 p-1">
            {PLAN_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  haptic('tick')
                  void saveSetting('active_plan', id)
                }}
                aria-pressed={planId === id}
                className="press num h-8 whitespace-nowrap rounded-full px-3 text-[12.5px] font-semibold transition-colors"
                style={{
                  background: planId === id ? 'rgba(var(--accent-rgb),0.16)' : 'transparent',
                  color: planId === id ? 'var(--accent)' : 'var(--color-ink-faint)',
                }}
              >
                {PLANS[id].name}
              </button>
            ))}
          </div>
        }
      >
        Edzésterv
      </SectionTitle>
      {/* A betűszó feloldása: fejből senki nem tudja, mi az ULAP. */}
      <p className="mb-2.5 px-0.5 text-[12px] text-ink-faint">{PLANS[planId].subtitle}</p>
      <div className="grid grid-cols-2 gap-3">
        {plan.map((day, i) => {
          const done = lastDone.get(day.name)
          // páratlan darabszámnál az utolsó kártya kitölti a sort
          const wide = i === plan.length - 1 && plan.length % 2 === 1
          return (
            <Reveal key={`${planId}-${day.id}`} delay={i * 55} className={wide ? 'col-span-2' : undefined}>
              <button
                type="button"
                onClick={() => navigate(`/edzes/${day.id}`)}
                className="press card flex h-full w-full flex-col gap-2.5 p-3.5 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="grid size-9 place-items-center rounded-[11px]"
                    style={{ background: 'rgba(var(--accent-rgb),0.13)', color: 'var(--accent)' }}
                  >
                    <Icon name={day.phase === 'strength' ? 'flame' : 'dumbbell'} size={17} />
                  </span>
                  <span className="chip">{PHASE_LABEL[day.phase] ?? day.phase}</span>
                </div>
                <div>
                  <p className="text-[14.5px] leading-snug font-semibold">{day.name}</p>
                  <p className="mt-1 text-[12px] text-ink-faint">
                    {day.exercises.length} gyakorlat ·{' '}
                    {day.exercises.reduce((sum, ex) => sum + ex.sets, 0)} sorozat
                  </p>
                  <p className="text-[12px] text-ink-faint">
                    {done ? formatDateShortHu(done) : 'még nem volt'}
                  </p>
                </div>
              </button>
            </Reveal>
          )
        })}
      </div>

    </section>
  )
}


/* ==========================================================================
   Izomcsoport-követés.

   A kérdés, amire válaszol: egyenletesen terheled-e a testet, vagy van
   csoport, ami hetek óta kimarad. A számolás alapja az „effektív sorozat" —
   minden gyakorlat súlyozva adja át magát az izomcsoportoknak (1 =
   elsődleges, 0,5 = másodlagos), és csak a KIPIPÁLT sorozat számít.
   ========================================================================== */
function MuscleModule() {
  const { workouts, today } = useAppData()
  const [days, setDays] = useState(7)

  // Mindig az ULAP a forrás, az aktív tervtől függetlenül — csak azon vannak
  // kitöltve az izomcsoport-részesedések (lásd `data/plans/index.ts`).
  const index = useMemo(() => buildMuscleIndex(MUSCLE_SOURCE_DAYS), [])

  const totals = useMemo(() => {
    const from = addDaysKey(today, -(days - 1))
    return muscleTotals(
      workouts.filter((w) => w.date >= from && w.date <= today),
      index,
    )
  }, [workouts, index, today, days])

  // A heti ajánlás az ablak hosszára vetítve — 30 napra nem 10, hanem ~43.
  const target = Math.round((WEEKLY_SET_TARGET * days) / 7)
  const empty = !hasMuscleData(totals)

  return (
    <section>
      <SectionTitle>Izomcsoportok</SectionTitle>
      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12.5px] text-ink-soft">
            Effektív sorozat izomcsoportonként
          </p>
          {/* `shrink-0` + `whitespace-nowrap`: e kettő nélkül keskeny kijelzőn a
              cím elszívta a helyet a kapcsoló elől, a „7 nap" pedig KÉT SORBA
              tört a gombon belül — a szám fölül, a „nap" alatta. A gomb fix
              magassága (h-8) miatt ez ki is lógott. A címnek van hova törnie,
              a kapcsolónak nincs: ezért a kapcsoló tartja a méretét, és a cím
              enged. */}
          <div className="flex shrink-0 gap-1 rounded-full bg-white/5 p-1">
            {[7, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  haptic('tick')
                  setDays(d)
                }}
                aria-pressed={days === d}
                className="press num h-8 whitespace-nowrap rounded-full px-3 text-[12.5px] font-semibold transition-colors"
                style={{
                  background: days === d ? 'rgba(var(--accent-rgb),0.16)' : 'transparent',
                  color: days === d ? 'var(--accent)' : 'var(--color-ink-faint)',
                }}
              >
                {d} nap
              </button>
            ))}
          </div>
        </div>

        {empty ? (
          <EmptyState
            title={`Az elmúlt ${days} napban nincs sorozat`}
            body={
              days === 7
                ? 'Válts 30 napra, vagy pipáld ki a sorozatokat edzés közben — azokból áll össze az izomcsoportonkénti terhelés.'
                : 'Pipáld ki a sorozatokat edzés közben — azokból áll össze az izomcsoportonkénti terhelés.'
            }
          />
        ) : (
          <>
            <MuscleRadar totals={totals} />

            <ul className="flex flex-col gap-1.5">
              {MUSCLE_GROUPS.map((g) => {
                const sets = totals[g.id].sets
                const ratio = Math.min(1, sets / target)
                const color =
                  sets >= target
                    ? 'var(--accent)'
                    : sets >= target * 0.5
                      ? 'var(--color-warn)'
                      : 'var(--color-bad)'
                return (
                  <li key={g.id} className="flex items-center gap-3">
                    <span className="w-[108px] shrink-0 truncate text-[13px]">{g.label}</span>
                    <span className="h-[5px] flex-1 overflow-hidden rounded-full bg-white/8">
                      <span
                        className="block size-full rounded-full"
                        style={{
                          background: color,
                          clipPath: `inset(0 ${100 - ratio * 100}% 0 0)`,
                          transition: 'clip-path 420ms var(--ease-out)',
                        }}
                      />
                    </span>
                    <span className="num w-[52px] shrink-0 text-right text-[12.5px]" style={{ color }}>
                      {formatSets(sets)}
                    </span>
                  </li>
                )
              })}
            </ul>

            <p className="text-[12px] leading-snug text-ink-faint">
              A sáv a gyakran idézett heti 10–20 sorozatos sávhoz viszonyít
              {days === 7 ? '' : `, ${days} napra vetítve (${target} sorozat)`} — ez tájékozódási
              pont, nem előírás. Egy nyomás 1 mell + 0,5 tricepsz sorozatot ad, ezért lehet
              törtszám.
            </p>
          </>
        )}
      </Card>
    </section>
  )
}

const setsFormat = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 1 })
const formatSets = (n: number) => setsFormat.format(n)

/** Melyik tervnapot mikor rögzítetted utoljára. */
function useLastDoneByType(): Map<string, string> {
  const { workouts } = useAppData()
  return useMemo(() => {
    const map = new Map<string, string>()
    for (const w of workouts) {
      const prev = map.get(w.type)
      if (!prev || w.date > prev) map.set(w.type, w.date)
    }
    return map
  }, [workouts])
}

/* ==========================================================================
   Edzésnapló — a rögzített munkamenetek, súllyal és pulzussal együtt.
   ========================================================================== */
/** Ennyi edzés látszik alapból; a többi egy koppintásra nyílik. */
const LOG_PREVIEW = 5

function WorkoutLog() {
  const { workouts, deleteWorkout } = useAppData()
  const toast = useToast()
  const [open, setOpen] = useState<string | null>(null)
  // A napló alatt van a nyakerősítés és a kiegészítők — azokhoz eddig a
  // teljes edzésnaplón kellett végiggörgetni. Öt edzés a legutóbbi két hét,
  // ami a tervezéshez kell; a többi előzmény, nem napi olvasmány.
  const [mindet, setMindet] = useState(false)

  if (workouts.length === 0) {
    return (
      <section>
        <SectionTitle>Edzésnapló</SectionTitle>
        <EmptyState
          title="Még nincs rögzített edzés"
          body="Válassz egy napot a tervből, és indítsd el — a sorozatokat menet közben tudod beírni."
        />
      </section>
    )
  }

  return (
    <section>
      <SectionTitle>Edzésnapló</SectionTitle>
      <Card padded={false} className="overflow-hidden">
        {(mindet ? workouts : workouts.slice(0, LOG_PREVIEW)).map((w) => {
          const expanded = open === w.id
          return (
            <div key={w.id} className="border-b border-[var(--color-line)] last:border-b-0">
              <div className="flex items-center gap-3 px-3.5 py-3">
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : w.id)}
                  aria-expanded={expanded}
                  className="flex min-h-[44px] flex-1 items-center gap-3 text-left"
                >
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-xl"
                    style={{ background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)' }}
                  >
                    <Icon name="dumbbell" size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{w.type}</span>
                    <span className="num block truncate text-[12.5px] text-ink-faint">
                      {formatDateShortHu(w.date)}
                      {w.duration_sec ? ` · ${formatDuration(w.duration_sec)}` : ''}
                      {w.calories ? ` · ${w.calories} kcal` : ''}
                    </span>
                  </span>
                  {w.total_volume ? (
                    <span className="num shrink-0 text-[14px] font-semibold" style={{ color: 'var(--accent)' }}>
                      {new Intl.NumberFormat('hu-HU').format(w.total_volume)} kg
                    </span>
                  ) : null}
                  <Icon
                    name="chevron-right"
                    size={16}
                    className="shrink-0 text-ink-faint"
                    style={{
                      transform: expanded ? 'rotate(90deg)' : 'none',
                      transition: 'transform 240ms var(--ease-out)',
                    }}
                  />
                </button>
                <button
                  type="button"
                  aria-label={`${w.type} törlése`}
                  onClick={async () => {
                    await deleteWorkout(w.id)
                    toast.show('Edzés törölve.', 'info')
                  }}
                  className="press grid size-11 shrink-0 place-items-center rounded-full text-ink-faint"
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>

              {expanded ? <SessionDetail workout={w} /> : null}
            </div>
          )
        })}

        {workouts.length > LOG_PREVIEW ? (
          <button
            type="button"
            onClick={() => {
              haptic('tick')
              // Becsukáskor a kinyitott részletet is zárjuk: különben egy
              // eltűnt sor maradna nyitva, és visszanyitáskor ott ugrana fel.
              if (mindet) setOpen(null)
              setMindet((v) => !v)
            }}
            aria-expanded={mindet}
            className="press flex min-h-[48px] w-full items-center justify-center gap-2 text-[13.5px] font-medium text-ink-soft"
          >
            <Icon
              name="chevron-right"
              size={16}
              style={{
                transform: mindet ? 'rotate(-90deg)' : 'rotate(90deg)',
                transition: 'transform 240ms var(--ease-out)',
              }}
            />
            {mindet
              ? 'Kevesebb'
              : `További ${workouts.length - LOG_PREVIEW} edzés`}
          </button>
        ) : null}
      </Card>
    </section>
  )
}

/** Egy elmentett edzés sorozatai gyakorlatonként. */
function SessionDetail({ workout }: { workout: Workout }) {
  const day = findPlanDay(workout.day_id)

  if (!workout.sets || !day) {
    return (
      <p className="px-3.5 pb-3.5 text-[12.5px] text-ink-faint">
        Ehhez az edzéshez nincs sorozat-szintű adat.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-3.5 pb-4">
      {day.exercises.map((ex) => {
        const rows = workout.sets?.[ex.id]?.sets.filter((s) => s.done || s.w !== null || s.r !== null)
        if (!rows || rows.length === 0) return null
        return (
          <div key={ex.id}>
            <p className="eyebrow mb-1.5">{ex.name}</p>
            <ul className="flex flex-col gap-1">
              {rows.map((s, i) => (
                <li key={i} className="num flex items-center gap-2.5 text-[13px] text-ink-soft">
                  <span className="w-4 text-ink-faint">{i + 1}.</span>
                  <span className="flex-1">
                    <b className="text-ink">{s.w !== null ? `${s.w} kg` : '–'}</b>
                    {' × '}
                    {s.r !== null ? `${s.r} ism` : '–'}
                  </span>
                  {s.done ? <Icon name="check" size={14} style={{ color: 'var(--color-good)' }} /> : null}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

/* ==========================================================================
   Nyakerősítés — almodul: gyakorlatlista + időzítő.
   A napi pontszámba a 'neck' rendszerkulcsú habiton keresztül számít bele,
   nem külön logikán. A gyakorlatlista a settings-ből jön, nem kódba égetve.
   ========================================================================== */
function NeckModule() {
  const { settings, habitBySystemKey, logsByDate, writeHabitValue } = useAppData()
  const { dateKey } = useSelectedDate()
  const toast = useToast()
  const [index, setIndex] = useState(0)
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set())

  const exercises = settings.neck_exercises
  const habit = habitBySystemKey('neck')
  const logged = habit ? logsByDate.get(dateKey)?.get(habit.id)?.done === true : false
  const current = exercises[index]
  const allDone = doneSteps.size === exercises.length && exercises.length > 0

  const finishStep = () => {
    setDoneSteps((prev) => new Set(prev).add(index))
    if (index < exercises.length - 1) setIndex(index + 1)
  }

  const markHabit = async () => {
    if (!habit) return
    haptic('success')
    await writeHabitValue(habit, dateKey, { done: true })
    toast.show('Nyakerősítés bejelölve a mai napra.', 'success')
  }

  if (!current) {
    return (
      <section>
        <SectionTitle>Nyakerősítés</SectionTitle>
        <EmptyState
          title="Nincs gyakorlat a listán"
          body="A Beállításokban add hozzá a gyakorlatokat és az időtartamukat."
        />
      </section>
    )
  }

  return (
    <section>
      <SectionTitle>Nyakerősítés</SectionTitle>
      <Card className="flex flex-col gap-5">
        <Timer
          key={`${index}-${current.seconds}`}
          seconds={current.seconds}
          label={current.name}
          onComplete={finishStep}
          size={196}
        />

        <ol className="flex flex-col gap-1">
          {exercises.map((ex, i) => {
            const isDone = doneSteps.has(i)
            const isCurrent = i === index
            return (
              <li key={ex.name}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  className="press flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2 text-left"
                  style={{
                    background: isCurrent ? 'rgba(var(--accent-rgb),0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isCurrent ? 'rgba(var(--accent-rgb),0.24)' : 'transparent'}`,
                  }}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <span
                    className="num grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold"
                    style={{
                      background: isDone ? 'rgba(127,224,174,0.18)' : 'rgba(255,255,255,0.06)',
                      color: isDone ? 'var(--color-good)' : 'var(--color-ink-faint)',
                    }}
                  >
                    {isDone ? <Icon name="check" size={14} /> : i + 1}
                  </span>
                  <span className="flex-1 truncate text-[14.5px]">{ex.name}</span>
                  <span className="num text-[13px] text-ink-faint">{ex.seconds} mp</span>
                </button>
              </li>
            )
          })}
        </ol>

        <button
          type="button"
          onClick={() => void markHabit()}
          disabled={logged}
          className="press h-12 rounded-2xl text-[15px] font-semibold disabled:opacity-50"
          style={{
            background: logged
              ? 'rgba(127,224,174,0.14)'
              : allDone
                ? 'linear-gradient(135deg, var(--accent), var(--accent-2))'
                : 'rgba(255,255,255,0.06)',
            color: logged ? 'var(--color-good)' : allDone ? '#04251b' : 'var(--color-ink)',
            border: logged ? '1px solid rgba(127,224,174,0.3)' : '1px solid var(--color-line)',
          }}
        >
          {logged ? 'Ma már megvolt' : 'Mai nyakerősítés kész'}
        </button>
      </Card>
    </section>
  )
}
