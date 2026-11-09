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
