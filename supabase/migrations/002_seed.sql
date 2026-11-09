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
