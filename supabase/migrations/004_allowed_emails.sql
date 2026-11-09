-- Zárt kör: csak előre engedélyezett e-mail cím tud fiókot nyitni.
--
-- MIÉRT ADATBÁZISBAN, ÉS NEM A FELÜLETEN:
-- A Supabase auth végpontja a nyilvános kulccsal közvetlenül is hívható —
-- az a kulcs ott van minden látogató böngészőjében, a kliens-kötegben. Egy
-- felületi ellenőrzés ezért semmit nem véd: aki tud curl-özni, megkerüli.
-- A kaput tehát az adatbázisnak kell őriznie.
--
-- MIÉRT `after insert`, ÉS NEM `before`:
-- A `claimed_by` idegen kulccsal mutat a felhasználóra, aki `before insert`-ben
-- még nem létezik. Az `after insert` triggerben dobott kivétel ugyanúgy
-- visszagörgeti a teljes regisztrációt, tehát a védelem azonos — csak a
-- hivatkozás lesz érvényes.

create table if not exists public.allowed_emails (
  email      text primary key,
  -- Kinek szól: „Marci", „edzőpartner" — hogy fél év múlva is tudd.
  note       text,
  added_at   timestamptz not null default now(),
  -- Ki váltotta be, és mikor. A `set null` azért kell, mert ha egy fiókot
  -- törlünk, a meghívó maga érvényes marad, csak újra szabaddá válik.
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,

  -- Az e-mail nem kis-nagybetű érzékeny. Ha vegyesen tárolnánk, a
  -- „Marci@..." nem találna rá a „marci@..." sorra, és a kapu véletlenszerűen
  -- zárna be olyanok előtt, akiket beengedtünk.
  constraint allowed_emails_lowercase check (email = lower(email))
);

comment on table public.allowed_emails is
  'Zárt kör: aki itt nincs benne, nem tud regisztrálni. Csak a service_role írja.';

-- --- A tábla legyen elérhetetlen a kliensből -------------------------------
-- Két réteg, mert egy is elég lenne, de a kettő egymás hibáját is fedi:
--   1. jogosultság: az anon és az authenticated szerep SEMMIT nem kap rá;
--   2. RLS egyetlen policy nélkül: ha egy jövőbeli `grant` mégis átengedné
--      őket, akkor sem látnának egyetlen sort sem.
--
-- `force row level security` SZÁNDÉKOSAN NINCS: az a tábla tulajdonosára is
-- kiterjedne, a lenti `security definer` függvény pedig épp tulajdonosként
-- fut. Azzal a kapu MINDENKIT kizárna, magadat is.
alter table public.allowed_emails enable row level security;
revoke all on public.allowed_emails from anon, authenticated;

-- --- A kapu ----------------------------------------------------------------
create or replace function public.enforce_allowed_email()
returns trigger
language plpgsql
security definer
-- Üres `search_path`: a `security definer` függvény emelt joggal fut, ezért
-- nem dőlhet be egy azonos nevű, útvonalra csempészett táblának. Minden
-- hivatkozás sémával együtt áll lent.
set search_path = ''
as $$
begin
  if new.email is null
     or not exists (
       select 1 from public.allowed_emails
       where email = lower(new.email)
     )
  then
    -- A null e-mail is elbukik: az alapértelmezés a TILTÁS, nem az átengedés.
    raise exception 'Ez az e-mail cím nincs engedélyezve.'
      using errcode = '42501';
  end if;

  update public.allowed_emails
     set claimed_by = new.id,
         claimed_at = now()
   where email = lower(new.email);

  return new;
end;
$$;

drop trigger if exists enforce_allowed_email on auth.users;
create trigger enforce_allowed_email
  after insert on auth.users
  for each row execute function public.enforce_allowed_email();

-- --- A tulajdonos saját címe ------------------------------------------------
-- A trigger csak ÚJ sorokra fut, tehát a meglévő fiókot nem érinti. Ez a sor
-- mégis kell: enélkül a tulajdonos nem tudna újra regisztrálni, ha valaha
-- törölni kell és újra létrehozni a fiókját.
insert into public.allowed_emails (email, note)
values ('te@pelda.hu', 'A tulajdonos — írd át a saját címedre')
on conflict (email) do nothing;
