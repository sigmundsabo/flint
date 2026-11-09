-- EZ A MIGRÁCIÓ MÉG NEM FUTOTT LE ÉLESBEN.
-- A biztonsági szűrő blokkolta, amíg a tulajdonos nem volt gépnél. Futtatás:
-- Supabase → SQL Editor, vagy a management API-n keresztül.
--
-- Három dolgot javít, és egyik sem nyúl meglévő felhasználói adathoz.

-- 1. A kapu trigger-függvénye ne legyen hívható a nyilvános REST API-n.
--    (A gyakorlatban nem kihasználható — a PostgREST nem teszi közzé a
--    `returns trigger` függvényeket, le is ellenőriztük —, de a Supabase
--    auditja jogosan jelzi, és a jog fölösleges.)
revoke all on function public.enforce_allowed_email() from public, anon, authenticated;

-- 2. Rögzített search_path a két régi függvényen. Mindkettő már eleve sémával
--    együtt hivatkozik mindenre, tehát a rögzítés nem töri el őket.
alter function public.touch_updated_at() set search_path = '';

-- 3. Az ÚJ felhasználó ne a tulajdonos edzés-alapvonalát kapja.
--    A '{"sessions":0,"volumeKg":0}' a tulajdonos korábbi, papíralapú
--    naplójából származik. Egyfelhasználós appban helyes alapérték volt; több
--    felhasználónál viszont minden új fiók 34 edzéssel és 465 tonnával
--    indulna, ami nem az ő teljesítménye.
--
--    A `workout_plan` is kikerül: az edzésterv a kódban él
--    (src/data/workoutPlan.json), és az app verziószám alapján frissíti. Ha
--    itt is szerepelne, két forrása lenne ugyanannak, és a kettő elcsúszna —
--    ez a sor még a RÉGI, ötnapos tervet tartalmazta.
create or replace function public.seed_defaults()
returns void
language plpgsql
set search_path = ''
as $function$
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
    (uid, 'workout_baseline',    '{"sessions":0,"volumeKg":0}'::jsonb)
  on conflict (user_id, key) do nothing;
end $function$;
