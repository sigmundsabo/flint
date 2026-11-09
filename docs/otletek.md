# Ötletek és nyitott szálak

Nem kívánságlista: minden pont olyasmi, ami a kód vagy az adat átnézése közben
tényleg felmerült. Sorrend: ami a legtöbbet adja a legkevesebb munkáért.

Utolsó frissítés: 2026-11-07.

---

## Amit meg KELL csinálni, mielőtt bárkit meghívsz

### 1. A `seed_defaults` a te edzés-alapvonaladat adná minden új fióknak

A függvény minden új felhasználónak beírja a
`workout_baseline = {"sessions":0,"volumeKg":0}` értéket. Ez a TE korábbi,
papíralapú naplód. Egyfelhasználós appban helyes alapérték volt; most viszont
minden barátod 34 edzéssel és 465 tonnával indulna, ami nem az ő teljesítménye.

Ugyanez a függvény a RÉGI, ötnapos edzéstervet is beírja. Az app ezt felülírja
(a terv a `src/data/workoutPlan.json`-ban él, és verziószám alapján frissül),
de így két forrása van ugyanannak, ami előbb-utóbb elcsúszik.

A javítás meg van írva, de **nem futott le** — a biztonsági szűrő blokkolta az
éles migrációt, amíg nem voltál gépnél. Egy paranccsal felmegy.

### 2. Két függvényen nincs rögzített `search_path`

A `touch_updated_at` és a `seed_defaults` „role mutable search_path"
figyelmeztetést kap a Supabase auditjától. Mindkettő már eleve sémával együtt
hivatkozik mindenre, tehát a rögzítés nem töri el őket — ugyanabban a blokkolt
migrációban van.

### 3. Kapcsold be a kiszivárgott jelszavak ellenőrzését

Supabase → Authentication → Policies. A HaveIBeenPwned-adatbázisból szűri a
már kiszivárgott jelszavakat. Egyfelhasználós appnál mindegy volt; ha mások is
jelszót választanak, nem az.

---

## Amivel a legtöbbet nyernéd

### 4. A sikerküszöböd 10% — a sorozat gyakorlatilag megszakíthatatlan

Kilenc szokásból egy kipipálása már sikeressé tesz egy napot. A 45 napos
sorozatod ezért olyan szívós: nem azért, mert minden nap jól ment, hanem mert a
mérce alacsony. Ez a szám nem méri azt, amit mérni szeretnél.

Két út:
- **Egy küszöb, feljebb** (60–70%). Őszintébb, de a mostani sorozat szétesik.
- **Két szint:** „megvolt a nap" (alacsony küszöb, a sorozatot tartja) és
  „erős nap" (magas küszöb, külön számláló). Így a szokás-lánc nem szakad meg
  egy rossz napon, de látod, hány napod volt tényleg jó.

### 5. Offline írás — most csak olvasni tudsz offline

A service worker kiszolgálja az app vázát, tehát repülőmódban elindul. De
amikor bepipálsz valamit, a kérés a Supabase-hez megy, és **elveszik**, ha nincs
hálózat. Egy írási sor (IndexedDB-ben), ami a kapcsolat visszatértekor leküldi a
várakozó műveleteket, valódi offline appot csinálna belőle. A helyi másolat
(`mirrorToLocal.ts`) már megvan hozzá — ez a másik irány.

### 6. Értesítés

iOS 16.4 óta a kezdőképernyőre tett webapp kaphat push értesítést. Egy esti
emlékeztető („három szokás maradt ma") a szokáskövetés leghatásosabb eleme, és
az appnak már minden adata megvan hozzá. Supabase Edge Function + egy napi cron
elég lenne.

### 7. A négy fül hangulatsávja üresen áll

A `TabHero` komponens kész, támogatja a képet — csak soha nem készült el egyik
sem. Jelenleg csak egy akcentus-derengés van ott. Négy kivágás ugyanabból a
barlangképből (más-más részlet, fülenként más színre hangolva) kb. 40 KB lenne,
és minden fül *hellyé* válna, nem listává. Ez a legolcsóbb látványbeli nyereség.

### 8. Heti összefoglaló

Van napi nézeted és van 30/364 napos trended, de nincs semmi a kettő között.
Egy heti kártya — mi ment jól, mi csúszott, melyik izomcsoport maradt ki —
pont az a léptéknél van, ahol még lehet korrigálni.

---

## Kisebbek

### 9. Elütés-gyanú, nem csak tiltás

A fizikai korlátok (`domain/limits.ts`) a lehetetlen értéket tiltják. A
víz-adatodban viszont három olyan nap volt, ami *lehetséges* lett volna egy
másik mértékegységben (4250 „liter" = 4,25 l). Egy halk visszakérdezés, ha az
érték a szokásos sávod sokszorosa, ezt is elkapná.

### 10. A kő csak a Ma fülön van

A tíz fokozat a nap legjobb vizuális visszajelzése, de csak egy helyen látszik.
Egy apró változata a fejlécben vagy a fülsávon végig emlékeztetne rá.

### 11. Az izomcsoport-cél arányosítva van, de nem naptár szerint

A heti 10 sorozatos cél 30 napra 43-ra szorzódik. Ez matematikailag helyes, de
a „mi maradt ki EZEN A HÉTEN" kérdésre nem válaszol — pedig az edzéstervezéshez
az kell.

### 12. A `public/flint-seed.json` nyilvánosan elérhető

Ebben a repóban már nincs benne, de a kiszolgált oldalon igen: bárki letöltheti
a címről, és benne van két hónap napló-, testsúly- és egészségadatod. Amint a
Supabase-re visszaálltunk és a helyi másolat egyszer lefutott, ez a fájl
törölhető — addig viszont ott van.

### 13. Nincs CI

A repó most már megvan. Egy GitHub Action, ami minden pusholásnál lefuttatja a
`tsc`, `oxlint`, `vitest` hármast, elkapná azt, amit a kézi futtatás kihagy.
Kb. 20 sor.
