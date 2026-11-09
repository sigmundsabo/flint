-- Flint — teljes adatbázis-séma, egyben.
-- Illeszd be a Supabase SQL Editorába és futtasd le egyszerre.

-- ======================================================
-- supabase/migrations/001_schema.sql
-- ======================================================
-- ============================================================================
-- Habit Tracker — teljes séma
-- Forrás: 01-backend/04..07 dokumentumok
-- Futtatás: Supabase Dashboard → SQL Editor → Run
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enum: habit-típusok (08-habit-tipusok-kiertekeles.md)
-- ---------------------------------------------------------------------------
do $$ begin
  create type habit_type as enum ('binary', 'min', 'max', 'range', 'time');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type habit_frequency as enum ('daily', 'weekdays', 'weekends');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- habits — a generikus habit-motor definíciós táblája
-- A célértékek KIZÁRÓLAG innen jönnek, semmi nincs kódba égetve.
-- ---------------------------------------------------------------------------
create table if not exists public.habits (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name          text not null,
  icon          text not null default 'circle',
  type          habit_type not null,

  -- Cél-értékek. Jelentésük típusonként eltér:
  --   min   → target_value az alsó határ            (pl. lépés ≥ 10000)
  --   max   → target_value a felső limit            (pl. képernyőidő ≤ 180 perc)
  --   range → target_value a középérték,
  --           tolerance_pct a ± tűrés százalékban   (pl. kalória 2400 ±5%)
  --   time  → target_time a határidő                (pl. lefekvés 23:00 előtt)
  --   binary→ egyik sem használt
  target_value    numeric,
  tolerance_pct   numeric,
  target_time     time,

  unit          text,
  frequency     habit_frequency not null default 'daily',

  -- Napi %-pontszám súlya. Alapértelmezés: minden habit egyenlő (1).
  -- Beállításokból szerkeszthető, séma-migráció nélkül.
  weight        numeric not null default 1 check (weight >= 0),

  -- Kivétel-flag: a fogmosás nem streak-alapú habit, csak időzítő eszköz,
  -- ezért nem számít bele a napi pontszámba (11-quit-reset-fogmosas-kivetel.md).
  counts_toward_score boolean not null default true,

  -- Rendszerkulcs a különleges viselkedésű habitokhoz ('quit', 'toothbrush', …).
  -- NULL a hétköznapi habiteknél.
  system_key    text,

  -- Ha a habit egy nyers egészségmetrikát tükröz, ez a health_metrics oszlop
  -- neve ('steps', 'sleep_hours', 'calories', 'water', 'screen_time', 'bedtime').
  -- Az érték ilyenkor MINDKÉT táblába íródik, hogy ne tudjanak szétcsúszni:
  -- a habit_logs a pontszámhoz kell, a health_metrics a nyers adatnézethez.
  metric_key    text,

  active        boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

create unique index if not exists habits_user_system_key_uniq
  on public.habits (user_id, system_key) where system_key is not null;

-- ---------------------------------------------------------------------------
-- habit_logs — napi bejegyzések
-- ---------------------------------------------------------------------------
create table if not exists public.habit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  habit_id    uuid not null references public.habits(id) on delete cascade,
  date        date not null,

  -- A habit típusától függően az egyik mező hordozza az értéket:
  --   binary → done
  --   min/max/range → value
  --   time → time_value
  done        boolean,
  value       numeric,
  time_value  time,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (habit_id, date)
);

create index if not exists habit_logs_user_date_idx on public.habit_logs (user_id, date);

-- ---------------------------------------------------------------------------
-- health_metrics — nyers napi mérési adatok
-- ---------------------------------------------------------------------------
create table if not exists public.health_metrics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date        date not null,
  steps       integer,
  calories    numeric,
  sleep_hours numeric,
  water       numeric,       -- liter
  screen_time numeric,       -- perc
  bedtime     time,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, date)
);

-- ---------------------------------------------------------------------------
-- weight_logs — testsúly
-- FONTOS: NINCS unique constraint a dátumon. Egy napon belül több mérés is
-- rögzíthető (reggeli/esti) — ez egy korábbi próbálkozás hibája volt.
-- ---------------------------------------------------------------------------
create table if not exists public.weight_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date        date not null,
  measured_at timestamptz not null default now(),
  weight      numeric not null check (weight > 0),
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists weight_logs_user_date_idx on public.weight_logs (user_id, date);

-- ---------------------------------------------------------------------------
-- workouts — edzésnapló
-- ---------------------------------------------------------------------------
create table if not exists public.workouts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date        date not null,
  type        text not null,     -- előre definiált listából VAGY szabad szöveg
  duration    integer,           -- perc
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists workouts_user_date_idx on public.workouts (user_id, date);

-- ---------------------------------------------------------------------------
-- daily_reviews — napi hangulat / energia / stressz
-- ---------------------------------------------------------------------------
create table if not exists public.daily_reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date        date not null,
  mood        smallint check (mood between 1 and 5),
  energy      smallint check (energy between 1 and 5),
  stress      smallint check (stress between 1 and 5),
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, date)
);

-- ---------------------------------------------------------------------------
-- supplements — vitamin / kiegészítő lista (Beállításokból bővíthető)
-- ---------------------------------------------------------------------------
create table if not exists public.supplements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null,
  dosage      text,
  schedule    text,              -- pl. 'reggel', 'napközben', 'lefekvés előtt'
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- napi pipálás a kiegészítőkhöz
create table if not exists public.supplement_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  supplement_id uuid not null references public.supplements(id) on delete cascade,
  date          date not null,
  taken         boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (supplement_id, date)
);

create index if not exists supplement_logs_user_date_idx on public.supplement_logs (user_id, date);

-- ---------------------------------------------------------------------------
-- settings — globális, egyetlen habithez sem köthető értékek (kulcs–érték)
-- Új beállításhoz nem kell séma-migráció.
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key         text not null,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, key)
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['habit_logs','health_metrics','daily_reviews','settings'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format(
      'create trigger touch_%1$s before update on public.%1$s
       for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security — minden táblán, mindenki csak a saját sorait látja
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'habits','habit_logs','health_metrics','weight_logs',
    'workouts','daily_reviews','supplements','supplement_logs','settings'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows select" on public.%I', t);
    execute format('drop policy if exists "own rows insert" on public.%I', t);
    execute format('drop policy if exists "own rows update" on public.%I', t);
    execute format('drop policy if exists "own rows delete" on public.%I', t);

    execute format('create policy "own rows select" on public.%I
                    for select to authenticated using (auth.uid() = user_id)', t);
    execute format('create policy "own rows insert" on public.%I
                    for insert to authenticated with check (auth.uid() = user_id)', t);
    execute format('create policy "own rows update" on public.%I
                    for update to authenticated using (auth.uid() = user_id)
                    with check (auth.uid() = user_id)', t);
    execute format('create policy "own rows delete" on public.%I
                    for delete to authenticated using (auth.uid() = user_id)', t);
  end loop;
end $$;

-- ======================================================
-- supabase/migrations/002_seed.sql
-- ======================================================
-- ============================================================================
-- Kezdeti adatok — a bejelentkezett felhasználó számára
-- A kliens hívja meg egyszer, ha még nincs egyetlen habit sem: rpc('seed_defaults')
-- ============================================================================

create or replace function public.seed_defaults()
returns void
language plpgsql
security invoker
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'seed_defaults: nincs bejelentkezett felhasználó';
  end if;

  if exists (select 1 from public.habits where user_id = uid) then
    return; -- már van adat, nem írunk felül semmit
  end if;

  insert into public.habits
    (user_id, name, icon, type, target_value, tolerance_pct, target_time, unit,
     counts_toward_score, system_key, metric_key, sort_order)
  values
    (uid, 'Lépés',        'footprints', 'min',   10000, null, null,    'lépés', true,  null,          'steps',       10),
    (uid, 'Alvás',        'moon',       'min',   8,     null, null,    'óra',   true,  null,          'sleep_hours', 20),
    (uid, 'Kalória',      'flame',      'range', 2400,  5,    null,    'kcal',  true,  null,          'calories',    30),
    (uid, 'Víz',          'droplet',    'min',   2.5,   null, null,    'l',     true,  null,          'water',       40),
    (uid, 'Képernyőidő',  'smartphone', 'max',   180,   null, null,    'perc',  true,  null,          'screen_time', 50),
    (uid, 'Lefekvés',     'bed-double', 'time',  null,  null, '23:00', null,    true,  null,          'bedtime',     60),
    (uid, 'Edzés',        'dumbbell',   'binary',null,  null, null,    null,    true,  null,          null,          70),
    (uid, 'Nyakerősítés', 'activity',   'binary',null,  null, null,    null,    true,  'neck',        null,          80),
    (uid, 'Kiegészítők',  'pill',       'binary',null,  null, null,    null,    true,  'supplements', null,          90),
    (uid, 'Leszokás',          'shield',     'binary',null,  null, null,    null,    true,  'quit',         null,         100),
    (uid, 'Fogmosás',     'sparkles',   'binary',null,  null, null,    null,    false, 'toothbrush',  null,         110);

  insert into public.supplements (user_id, name, dosage, schedule, sort_order)
  values
    (uid, 'D-vitamin', '2000 NE', 'reggel',      10),
    (uid, 'Omega-3',  '1 g', 'étkezéssel', 20);

  insert into public.settings (user_id, key, value) values
    (uid, 'daily_threshold_pct', '80'::jsonb),
    (uid, 'target_weight',       'null'::jsonb),
    (uid, 'workout_types',       '["Konditerem","Futás","Kerékpár","Úszás","Nyakerősítés","Séta","Egyéb"]'::jsonb),
    (uid, 'neck_exercises',      '[{"name":"Izometrikus előre","seconds":30},{"name":"Izometrikus hátra","seconds":30},{"name":"Izometrikus oldalra (bal)","seconds":30},{"name":"Izometrikus oldalra (jobb)","seconds":30},{"name":"Áll behúzás","seconds":45},{"name":"Nyakforgatás","seconds":45}]'::jsonb),
    (uid, 'toothbrush_seconds',  '180'::jsonb),
    (uid, 'workout_baseline',    '{"sessions":0,"volumeKg":0}'::jsonb),
    (uid, 'workout_plan',        '[{"id": "mon", "name": "Hát / Váll / Tricepsz", "phase": "hyper", "exercises": [{"id": "mon_1", "name": "Lehúzás széles fogással", "sets": 4, "repMin": 8, "repMax": 10, "tip": "Lapockákat hátra-le, a mozgást a hátból indítsd, ne a karból."}, {"id": "mon_2", "name": "Vállból nyomás gépen", "sets": 3, "repMin": 8, "repMax": 10, "tip": "Csukló a kar felett, ne ívelj a hátaddal felfelé."}, {"id": "mon_3", "name": "Hashoz húzás széles fogással", "sets": 3, "repMin": 10, "repMax": 12, "tip": "Könnyebb súllyal, fókusz a lapocka tiszta mozgásán."}, {"id": "mon_7", "name": "Fordított repülés", "sets": 3, "repMin": 12, "repMax": 15, "tip": "Enyhén hajlított karral nyisd szét, hátsó deltát célozd."}, {"id": "mon_4", "name": "Tricepsznyújtás fej felett csigán", "sets": 2, "repMin": 12, "repMax": 15, "tip": "Felkar fixen a fej mellett, csak az alkar mozog."}, {"id": "mon_5", "name": "Oldalemelés csigán", "sets": 3, "repMin": 12, "repMax": 15, "tip": "Enyhén hajlított karral emelj, ne trapézból indíts."}, {"id": "mon_6", "name": "Háthajlítás", "sets": 3, "repMin": 12, "repMax": 15, "tip": "Kontrollált mozgás a csípőből, ne az alsó hátból, gerinc egyenes."}, {"id": "mon_8", "name": "Tricepsz letolás", "sets": 2, "repMin": 12, "repMax": 15, "tip": "Felkar a törzshöz közel, csak a könyök nyújtson."}]}, {"id": "tue", "name": "Mell / Bicepsz / Alkar", "phase": "hyper", "exercises": [{"id": "tue_1", "name": "Döntött pados nyomás kézisúlyzókkal", "sets": 4, "repMin": 8, "repMax": 10, "tip": "Döntött padon (30–45 fok), kézisúlyzókat a mellkas szélességébe engedd le, kontrolláltan told fel."}, {"id": "tue_2", "name": "Kábeles bicepsz curl (Bayesian)", "sets": 3, "repMin": 10, "repMax": 12, "tip": "Test mögé állva, enyhén előre dőlve hajlíts, felkar fixen."}, {"id": "tue_3", "name": "Gépi lapos mellnyomás", "sets": 3, "repMin": 10, "repMax": 12, "tip": "Csukló a könyök felett, ne lökd ki teljesen."}, {"id": "tue_4", "name": "Hammer curl", "sets": 3, "repMin": 10, "repMax": 12, "tip": "Hüvelykujj felfelé, a felkar nem mozdul."}, {"id": "tue_5", "name": "Pec deck", "sets": 3, "repMin": 12, "repMax": 15, "tip": "Kontrollált záró mozgás, mellkast nyomd össze."}, {"id": "tue_6", "name": "Reverse curl franciarúddal", "sets": 2, "repMin": 12, "repMax": 15, "tip": "Felülfogás, csukló semleges a mozgás közben."}, {"id": "tue_7", "name": "Cable fly High to Low", "sets": 3, "repMin": 10, "repMax": 12, "tip": "Felülröl lefelé húzd, az alsó mellizmot célozd."}]}, {"id": "wed", "name": "Láb / Has", "phase": "hyper", "exercises": [{"id": "wed_1", "name": "Lábnyújtó gép", "sets": 3, "repMin": 12, "repMax": 15, "tip": "Tetején 1 mp megszorítás, hát a támlán marad."}, {"id": "wed_2", "name": "Guggolás Smith kereten", "sets": 2, "repMin": 10, "repMax": 12, "tip": "Térd követi a lábujjat, hát neutrális."}, {"id": "wed_3", "name": "Abductor gép", "sets": 3, "repMin": 12, "repMax": 15, "tip": "Kontrollált tempóval nyisd szét, ne dobd ki."}, {"id": "wed_4", "name": "Fekvő lábhajlító gép", "sets": 3, "repMin": 10, "repMax": 12, "tip": "Csípő a padon, mozgást a combhajlítóból indítsd."}, {"id": "wed_5", "name": "Álló vádli gép", "sets": 4, "repMin": 12, "repMax": 15, "tip": "Teljes mozgástartomány: nyújtás felül, lassú engedés alul."}, {"id": "wed_6", "name": "Hiperextenziós felülés", "sets": 3, "repMin": 20, "repMax": 20, "tip": "Ne ívelj túl felül — mozgás a csípőből, gerinc egyenes."}, {"id": "wed_7", "name": "Russian twist", "sets": 3, "repMin": 15, "repMax": 15, "tip": "Lassú forgás a törzől, csípő stabil."}, {"id": "wed_8", "name": "Lógó térdfelhúzás", "sets": 3, "repMin": 12, "repMax": 15, "tip": "Alsó hasizommal indítsd, ne csípőhajlítóval rántsd."}]}, {"id": "fri", "name": "Felső test — Erő", "phase": "strength", "exercises": [{"id": "fri_1", "name": "Gépi lapos mellpress", "sets": 4, "repMin": 6, "repMax": 8, "tip": "Erő-fókusz: kontrollált tempó, stabil lapocka."}, {"id": "fri_2", "name": "Lehúzás széles fogással", "sets": 4, "repMin": 6, "repMax": 8, "tip": "Nehezebb súly, de a forma ugyanolyan tiszta marad."}, {"id": "fri_3", "name": "Vállból nyomás gépen", "sets": 3, "repMin": 8, "repMax": 10, "tip": "Csukló a kar felett, kontrollált leengedés."}, {"id": "fri_4", "name": "Pec deck", "sets": 3, "repMin": 8, "repMax": 10, "tip": "Lassú excentrikus fázis, mellkast nyomd össze."}, {"id": "fri_5", "name": "Kábeles tricepsz letolás", "sets": 3, "repMin": 10, "repMax": 12, "tip": "Felkar a törzshöz közel, csak a könyök nyújtson."}, {"id": "fri_6", "name": "Bayesian curl", "sets": 2, "repMin": 10, "repMax": 12, "tip": "Nyújtott pozícióból hajlíts, felkar fixen."}, {"id": "fri_7", "name": "Hashoz húzás V-fogóval", "sets": 2, "repMin": 10, "repMax": 12, "tip": "Csípő fixen, gerincet finoman gömbölyítsd be."}]}, {"id": "sat", "name": "Alsó test — Erő", "phase": "strength", "exercises": [{"id": "sat_1", "name": "Guggolás Smith kereten", "sets": 3, "repMin": 6, "repMax": 8, "tip": "Erő-fókusz: hosszabb pihenő szettek között."}, {"id": "sat_2", "name": "Csípőfeszítő gép", "sets": 3, "repMin": 10, "repMax": 12, "tip": "Tetején szorítsd össze a farizmot, ne háttal ívelj."}, {"id": "sat_3", "name": "Álló vádli gép", "sets": 4, "repMin": 10, "repMax": 12, "tip": "Teljes mozgástartomány, kontrollált tempó."}, {"id": "sat_4", "name": "Abductor gép", "sets": 3, "repMin": 12, "repMax": 15, "tip": "Kontrollált tempóval nyisd szét."}, {"id": "sat_5", "name": "Hiperextenziós felülés", "sets": 3, "repMin": 20, "repMax": 20, "tip": "Mozgás a csípőből, gerinc egyenes."}, {"id": "sat_6", "name": "Russian twist", "sets": 3, "repMin": 15, "repMax": 15, "tip": "Lassú forgás a törzsből, csípő stabil."}, {"id": "sat_7", "name": "Lógó térdfelhúzás", "sets": 3, "repMin": 12, "repMax": 15, "tip": "Alsó hasizommal indítsd."}]}]'::jsonb)
  on conflict (user_id, key) do nothing;
end $$;

-- ======================================================
-- supabase/migrations/003_workout_sets.sql
-- ======================================================
-- ============================================================================
-- Az edzsterv.netlify.app átköltöztetése: sorozat-szintű súlyrögzítés
-- ============================================================================

alter table public.workouts
  -- melyik tervnap (PPLUL: mon / tue / wed / fri / sat)
  add column if not exists day_id       text,
  -- a megmozgatott súly kg-ban, a sorozatokból számolva
  add column if not exists total_volume numeric,
  add column if not exists duration_sec integer,
  -- Apple Health, Shortcuts-on át kézzel beillesztve
  add column if not exists calories     integer,
  add column if not exists avg_hr       integer,
  add column if not exists max_hr       integer,
  -- { "<gyakorlat_id>": { "sets": [ { "w": 60, "r": 10, "done": true } ] } }
  --
  -- Miért jsonb és nem külön tábla: a sorozatok mindig az edzéssel együtt
  -- íródnak és olvasódnak, sosem külön. Külön táblával minden edzéslistázás
  -- N+1 lekérdezés lenne, cserébe semmit nem nyernénk — az egyetlen
  -- keresztmetszeti lekérdezés (mit nyomtam legutóbb ezen a gyakorlaton)
  -- a memóriában betöltött előzményből is elfut.
  add column if not exists sets         jsonb;

create index if not exists workouts_user_day_idx on public.workouts (user_id, day_id, date desc);

