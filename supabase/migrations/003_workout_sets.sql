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
