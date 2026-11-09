# Flint

*A kovakő az, amiből a szikra pattan.*

Szokás- és egészségkövető **zárt körnek**: napi szokások, egészségmetrikák,
testsúly, edzésnapló és izomcsoport-terhelés egy helyen. iPhone-ra optimalizált
telepíthető webapp (PWA), de gépen böngészőben is fut.

Regisztrálni csak előre engedélyezett e-mail címmel lehet — lásd
[Zárt kör: ki tud belépni](#zart-kor-ki-tud-belepni).

> A tervdokumentáció (16 dokumentum) a repón KÍVÜL él, a
> `../habit tracker prompt/` mappában. Klónozás után nincs vele.

## Tartalom

- [Stack](#stack)
- [Indítás](#inditas)
- [Mappastruktúra](#mappastruktura)
- [Amit tudni érdemes](#amit-tudni-erdemes)
- [Vizuális irány — honnan jön](#vizualis-irany-honnan-jon)
- [A Ma fül hőse: barlang + fénylő kő](#a-ma-ful-hose-barlang-fenylo-ko)
- [A kő tíz fokozata](#a-ko-tiz-fokozata)
- [Folyékony üveg — és ami belőle a telefonodon látszik](#folyekony-uveg-es-ami-belole-a-telefonodon-latszik)
- [Edzés — a napló és a terv](#edzes-a-naplo-es-a-terv)
- [Betűk: három szerep](#betuk-harom-szerep)
- [Mozgás](#mozgas)
- [Szín: a kék és a zöld között](#szin-a-kek-es-a-zold-kozott)
- [Sebesség — mire megy el, és mire nem](#sebesseg-mire-megy-el-es-mire-nem)
- [Ha elesik a szerver — a helyi másolat](#ha-elesik-a-szerver-a-helyi-masolat)
- [Zárt kör: ki tud belépni](#zart-kor-ki-tud-belepni)
- [PWA — telepítés iPhone-ra](#pwa-telepites-iphone-ra)

## Stack

| Réteg | Választás | Miért |
|---|---|---|
| Frontend | Vite 8 + React 19 + TypeScript | Igazi single-page app, a legkisebb bundle és a leggyorsabb dev-ciklus |
| Stílus | Tailwind CSS 4 (CSS-first tokenek) | A design tokenek egy helyen, a `src/index.css` `@theme` blokkjában |
| Backend | Supabase (Postgres + Auth + RLS) | Telefon és gép között szinkron, sorszintű jogosultsággal |
| Animáció | `motion` + CSS-átmenetek | 60fps.design-ról vett időzítés, `prefers-reduced-motion`-nel |
| Diagram | Recharts | Testsúlytrend és napi pontszám; a heatmap saját |
| Ikonok | lucide-react | Egyetlen ikoncsalád, SVG — soha nem emoji |
| Teszt | Vitest | A habit-motor üzleti logikája egységtesztelt |

## Indítás

```bash
npm install
npm run dev
```

Az app `.env` nélkül is elindul: ilyenkor **helyi módban** fut, és az adatokat a
böngésző `localStorage`-ában tartja. Így azonnal kipróbálható, mielőtt a
Supabase projekt elkészül.

### Supabase bekötése

1. Hozz létre egy új projektet a [supabase.com](https://supabase.com)-on.
2. A Dashboard → **SQL Editor**-ban futtasd le sorban, mind a hármat:
   - `supabase/migrations/001_schema.sql` — táblák, enumok, RLS
   - `supabase/migrations/002_seed.sql` — a `seed_defaults()` függvény
   - `supabase/migrations/003_workout_sets.sql` — sorozat-szintű edzésrögzítés
3. Másold a `.env.example`-t `.env`-be, és töltsd ki:

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://<projekt>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable / anon key>
```

> A Supabase Connect-ablaka újabban **publishable key** néven adja azt a
> kulcsot, amit korábban anon key-nek hívott — ugyanaz.

4. Indítsd újra a dev szervert. Belépés e-mailes linkkel (magic link), jelszó
   nincs. Az első belépéskor a kliens meghívja a `seed_defaults()` függvényt,
   ami feltölti a kezdő szokásokat, kiegészítőket és beállításokat.

### Parancsok

```bash
npm run dev        # fejlesztői szerver
npm test           # a habit-motor egységtesztjei
npm run typecheck  # típusellenőrzés
npm run build      # éles build
```

## Mappastruktúra

```
src/
  domain/     A habit-motor ÜZLETI LOGIKÁJA — UI-mentes, egységtesztelt
    evaluate.ts   az 5 típus kiértékelése (binary / min / max / range / time)
    time.ts       éjfél-biztos határidő-összevetés
    score.ts      napi %-pontszám, sikerküszöb, streakek
    relapse.ts    a Leszokás destruktív reset művelete
    limits.ts     fizikai korlátok (nincs 1500 órás alvás)
    muscles.ts    gyakorlat → izomcsoport súlyozás, effektív sorozatszám
    stone.ts      pontszám → a kő tíz fokozata
  data/       ADAT-HOZZÁFÉRÉSI RÉTEG — a UI sosem hív közvetlenül Supabase-t
    repo.ts            a közös interfész
    supabaseRepo.ts    éles implementáció (lusta kliens, külön köteg)
    localRepo.ts       localStorage tartalék
    localSnapshot.ts   seed + kézi mentés
    mirrorToLocal.ts   belépés után automatikus teljes helyi másolat
    exportCsv.ts       CSV mentés
  hooks/      React-állapot: useAppData (adatok + műveletek), useSelectedDate
  components/ Újrahasznosított UI-elemek
  pages/      Az 5 fül + Beállítások
    beallitasok/  a Beállítások hét önálló szekciója
  fonts/      Saját kiszolgálású woff2 (Fraunces, IBM Plex Mono)
supabase/migrations/  SQL séma — a 004 a zárt kör kapuja
scripts/    Képgenerálás és -tömörítés (sharp), üveg-elmozdulástérkép
```

A számítási logika **egy helyen** él (`domain/`), nem oldalanként duplikálva.

A számítási logika **egy helyen** él (`domain/`), nem oldalanként duplikálva.

## Amit tudni érdemes

- **Célértékek sehol nincsenek kódba égetve.** Minden a `habits` és a `settings`
  táblából jön, és a Beállításokból szerkeszthető.
- **A `time` típus éjfél-biztos.** A `compareTimeToDeadline` délhez képest mér
  percben; a 00:01 helyesen későbbnek számít, mint a 23:00-as határidő.
- **A napi pontszám arányos, súlyozott %.** Minden szokás súlya alapból 1
  (egyenlő), de a `habits.weight` oszlopban egyenként átállítható.
- **A streak a napi %-ra épül**, nem szokásonként. A folyamatban lévő mai nap
  türelmi napot kap: amíg nincs meg a küszöb, nem töri meg a sorozatot.
- **A Leszokás relapszus destruktív:** az adott nap összes szokás-logját és mért
  értékét törli. Ezért nyomva tartós megerősítés kell hozzá — egy elgépelt
  koppintás nem elég.
- **A fogmosás nem szokás, csak eszköz.** Nincs streakje, nem szerepel a Ma fül
  checklistjében, és nem számít a napi pontszámba.
- **Metrika-tükrözés:** a `metric_key`-vel rendelkező szokások értéke egyszerre
  íródik a `habit_logs` és a `health_metrics` táblába, hogy a napi pontszám és a
  nyers adatnézet ne csúszhasson szét.

## Vizuális irány — honnan jön

A stílus az **Opal iOS** appból van visszafejtve (Mobbin, 211 képernyő). A
színek nem becslések: a referencia-képernyők képpontjait kimintáztuk.

| | Érték | Honnan |
|---|---|---|
| Háttér | `#040404` | az opalapp.com `--color--surface--background` változója |
| Felületek | `#101011` → `#1F1F22` | tömör, nagyon sötét lapok hajszálvékony peremmel |
| Bekezdésszöveg | `rgba(255,255,255,0.8)` | az ő `--color--text--paragraph` értékük (`#fffc`) |
| Akcentus (világos) | `#B8FFF0` | az ív és a pillek fénylő vége (mintázott: `#B4FEFA`) |
| Akcentus (mély) | `#6FBF98` | a színátmenet alsó vége |
| Hibaállapot | `#E27385` | lágy rózsa, nem harsány piros |
| Display-tipográfia | 700 súly, `-0.01em`, 1.1 sormagasság | az opalapp.com `h1` számított értékei |
| Betűcsalád | rendszerbetű a szövegnek | ugyanaz a `system-ui` stack, amit ők használnak |

Amit szerkezetileg átvettünk:

- **Nyitott ív, nem teljes gyűrű.** ~240 fokos pálya alul réssel — mérőműszernek
  olvasódik, nem befejezendő körnek.
- **Zárójel-konnektor + három pill.** Az Opal Sleep / Focus / Rest hármasának a
  megfelelője: Egészség / Edzés / Szokások alpontszám. A vékony zárójel azt
  mondja, hogy a három érték a fölötte lévő pontszámot bontja.
- **Lebegő kapszula-navigáció**, nem teljes szélességű sáv.
- **Szegmentált állapotsorok** az Egészség fülön: érték balra, egyszavas
  minősítés jobbra szemantikus színnel, alatta ötszegmenses sáv. A szín sosem
  egyedüli hordozó — a minősítés ki van írva szóval is.
- **Rendszerbetű** (SF Pro iPhone-on), tabuláris számokkal.
- **Nyomva tartós megerősítés** a destruktív műveletnél — az Opal
  „Hold to Leave" gombjának a mintája.
- **Kapszula-léptető**: `−  érték  +` egyetlen sötét pillben, kör alakú
  gombokkal a két végén — nem három külön doboz (Opal Timer képernyő).
- **Elsődleges gomb = sötét kapszula**, halvány menta színátmenettel és menta
  felirattal — nem telített színfolt (Opal „▶ Start").
- **Bento-kártyák** a Trendek fülön: ikoncsempe balra fent, metaadat-chip
  jobbra fent, nagy szám, halkabb címke (Opal „Rules" rács).
- **Kör alakú fejlécgombok** (vissza, beállítások), nagy félkövér cím mellett.

A forrás nem csak a Mobbin volt: az **opalapp.com** élő CSS-éből olvastuk ki a
tényleges tokeneket (háttérszín, bekezdésszín, betűstack, display-tipográfia),
és a weboldalon lévő nagy felbontású app-mockupokból a Rules és a Timer
képernyő szerkezetét.

Amit **nem** vettünk át: az Opal logója, szóképe és a védjegyes opál-gem
képanyag. Az a márkájuk, nem a design-nyelvük.

A `04-design/16-vizualis-design.md` „meleg borostyán/korall" iránya csak
helyjelölő volt, amíg a referencia meg nem érkezett. A tényleges Opal-paletta
mintazöld/jáde, ezért a végleges stílus ezt követi.

## A Ma fül hőse: barlang + fénylő kő

Az Opal kezdőképernyőjének a felépítése — barlangháttér, középen egy belülről
világító kő, alatta a pontszám, zárójel, három terület-pill.

**A kő nem dísz:** a körülötte futó vékony gyűrű a napi pontszám, és a kő
fényereje is ahhoz igazodik. Minél teljesebb a nap, annál élénkebben ég.

**A gyűrű intenzitása fut a pontszámmal** — halvány derengéstől a teljes izzásig.
Kúpos maszkkal nem vágjuk ketté: a fotó lágy, szálas pereme mellett a vágás
mindig egyenes szabásvonalnak látszott, a pontos érték pedig úgyis ott van
alatta számmal.

A képek a `public/` mappában vannak (`splash.webp`, `stones/stone-0…9.webp`) —
a részletek és az új kép beillesztésének a menete a `public/ASSETS.md`-ben. Ha a
fájlok hiányoznak, minden CSS/SVG-ből rajzolt tartalékra vált, és az app
ugyanúgy működik.

**A tartalék viszont CSAK hibára lép be, nem töltés közben.** Ez nem apróság:
eredetileg mindkét komponens `new Image()`-dzsel előbb megnézte, betölthető-e a
fotó, és amíg a válasz meg nem jött, a rajzolt változatot mutatta. Így a rajz
MINDEN indításnál felvillant — telefonon jól láthatóan, mert ott a kép lassabban
érkezik, a `feTurbulence`-szűrő kirajzolása pedig épp a legszűkebb pillanatban
terheli a GPU-t. Most a valódi `<img>` megy ki azonnal, a rajz pedig az
`onError`-ra vár.

## A kő tíz fokozata

A napi pontszámot a barlangban lebegő kő mutatja: 0 = kialudt, 9 = teljes.

A tíz kép **egyetlen mesterképből** készül (`scripts/make-stones.mjs`), nem tíz
külön generálásból. Tíz generálás tíz különböző követ adna — a körvonal és a
kameraállás képenként elcsúszik, és a fokozatváltás ugrásnak látszana. Egy
mesterképből a sziluett pixelre azonos, és csak az változik, aminek kell:

1. a **telítettség** hal el leghamarabb (a 0. fokozat szürke kavics),
2. a **fényerő** csökken, de 0,5 alá nem — különben eltűnne a sötét barlangban,
3. a **belső izzás** külön, meredekebb görbén hűl ki, hogy a tűz előbb aludjon
   ki, mint ahogy a kő elsötétül.

Új kő beállítása: generálj egy képet (`scripts/gemini-image.mjs`), vedd le róla
a hátteret (`scripts/make-alpha.mjs`), majd `node scripts/make-stones.mjs
<mesterkép> --out=public/stones`.

**Az eredményt mindig a valódi háttéren nézd meg, ne fekete kontaktlapon.** Az
első sorozatnál a `screen` keverés az alfát is összeadta, és a kő köré került a
kép fekete téglalapja — a fekete lapon ez láthatatlan volt, az appban azonnal
kiderült.

## Folyékony üveg — és ami belőle a telefonodon látszik

A lebegő felületek (`.glass`, `.floating`: alsó navigáció, edzés közbeni sáv,
kártyák) üveghatást kapnak: erős blur és túltelítés, ferde él-fény (bal-felül
csillan, jobb-alul sötétül), átlós csillanás a felső harmadon, belső árnyék.
Ez mind tiszta CSS, és **mindenhol működik**.

A peremi **fénytörés** ezen felül jön: egy SVG `feDisplacementMap`, ami a
széleken összenyomja a mögötte lévő képet (`#liquid-glass` a `SvgDefs`-ben, a
térkép a `scripts/make-glass-map.mjs` terméke).

Két dolog, amit mérés után tudunk róla:

- **Safariban nem működik.** A `backdrop-filter: url(#szűrő)` WebKit-hibajegye
  2022 óta nyitott, és a gyorsított szűrők nem tudnak SVG-szűrőt használni.
  Mivel a Flint iPhone-on PWA-ként fut, ott a CSS-réteg marad — ezért kellett
  annak önmagában is késznek lennie. A kapcsolót a `main.tsx` teszi ki
  (`data-glass="refract"`), motor szerint; `@supports` NEM jó rá, mert az csak
  az érték értelmezhetőségét nézi, és a Safari elfogadja, majd elejti — vele
  együtt a blurt is.
- **A térkép beágyazva megy** (`glassMap.ts`), mert a Chromium a szűrőn belüli
  `feImage`-et nem tölti be külső URL-ről. Lemérve: a `/glass-map.png`-re
  hivatkozó változat semmit nem csinált, ugyanaz a szűrő turbulenciával
  viszont működött.

## Edzés — a napló és a terv

Az `edzsterv.netlify.app` teljes funkcionalitása ide került:

- **Két terv, választóval** — **ULAP** (Lower, Upper, Anterior, Posterior — 4
  nap, 29 gyakorlat) és **PPLUL** (Hát, Mell, Láb, Felső erő, Alsó erő — 5 nap,
  37 gyakorlat). Mindkettő a KÓDBAN él (`src/data/plans/`), a beállításokban
  csak az van, melyik az aktív (`active_plan`).

  Korábban a teljes tervet a `settings.workout_plan` mezőbe mentettük,
  verziószámmal és egyszeri frissítéssel. Az a megoldás abból indult, hogy EGY
  terv van, ami időnként cserélődik; két terv mellett ugyanannak az adatnak két
  forrása lett volna, és a kettő elcsúszik — el is csúszott, a `seed_defaults`
  még a régi tervet adta az új felhasználóknak.

  A két terv nap-azonosítói nem ütköznek (`lower/upper/anterior/posterior` és
  `mon/tue/wed/fri/sat`), ezért a napló bármelyik terv szerinti régi edzést meg
  tud nevezni akkor is, ha épp a másik az aktív. A `findPlanDay()` ezért
  MINDKETTŐBEN keres.
- **Izomcsoportok** — minden gyakorlat súlyozva adja át magát az izomcsoportoknak
  (1 = elsődleges, 0,5 = másodlagos), és a kipipált sorozatokból pókhálódiagram
  lesz 7 vagy 30 napra. A gyakorlat-azonosító a MOZGÁSÉ, nem a napé, tehát a két
  napon is szereplő chest press egy előzményt és egy sort kap. A régi terv
  azonosítói a `legacyIds`-ben élnek tovább, így a korábbi 31 edzés is beszámít.
  Az index forrása MINDIG az ULAP (`MUSCLE_SOURCE_DAYS`), az aktív tervtől
  függetlenül: csak azon vannak kitöltve a részesedések, tehát a PPLUL szerint
  építve a pókháló kiürülne.
- **Munkamenet** (`/edzes/:dayId`) — sorozatonként súly és ismétlés, időzítővel.
  A megmozgatott kg élőben számolódik az alsó sávban.
- **Előző referencia** — minden sorozat mellett ott van, mit nyomtál legutóbb
  ugyanazon a MOZGÁSON, ugyanazon a sorszámon („legutóbb" / „előző hét").
  Ez a progresszív túlterhelés támpontja: nem emlékezetből kell dolgozni.
- **Apple Health** — kalória, átlag- és maxpulzus a befejezéskor beírható
  (Shortcutsból másolva), de üresen is menthető.
- **Előzmény** — alapból az **utolsó öt** edzés látszik, a többi egy
  koppintásra nyílik. A napló alatt van a nyakerősítés és a kiegészítők, és a
  teljes listán végiggörgetni hosszú volt. Minden sor külön is kibontható:
  gyakorlatonként mutatja a sorozatokat.

Az `edzsterv.netlify.app`-ban felhalmozott **34 edzés / 465 947 kg** kiindulási
alapként számít bele az összesítőbe; az itt rögzített edzések hozzáadódnak. Ez
a tulajdonos saját alapvonala — ÚJ felhasználó nullával indul
(`seed_defaults`).

**A piszkozat localStorage-ban él, nem a Supabase-ben.** Egy félbehagyott edzés
eszközhöz kötött állapot — nincs értelme szinkronizálni, viszont fontos, hogy
túlélje a lap újratöltését, ha edzés közben becsukódik a böngésző.

## Betűk: három szerep

Nem díszítésből három betű, hanem hogy a szöveg, a cím és az adat **más
anyagból** legyen — ettől törik meg az egyhangúság:

| Szerep | Betű | Hol |
|---|---|---|
| Szöveg | rendszerbetű (SF Pro / Inter) | minden prózai tartalom |
| Cím | **Fraunces** | fülcímek és szekciócímek |
| Adat | **IBM Plex Mono** | számok, időzítők, kiskapitális címkék |

A Fraunces lágy, kissé geológiai karakterű antikva — illik a barlang–opál
világhoz, és teljes latin-ext, tehát az ő és ű is rendben renderel. Az IBM Plex
Mono a mérőműszer-jelleget adja, és visszautal a régi edzésnaplóra, ahol szintén
ez vitte a számokat.

**A betűk saját kiszolgálásból jönnek** (`src/fonts/`, a @font-face a
`src/index.css` tetején), nem a Google Fontsról. Három oka van:

1. A `<link rel="stylesheet">` a fonts.googleapis.com-ra **festést blokkolt**,
   és három kört kért a mobilhálózaton, mire egy betű megjelent: DNS + TLS a
   googleapis.com-hoz, a CSS letöltése, majd DNS + TLS a gstatic.com-hoz a
   woff2-ért. `preconnect`-tel is több száz milliszekundum.
2. Így a service worker **előtöltheti** őket. Korábban repülőmódban a címek
   Georgiára, a számok Menlóra estek vissza — egy telepíthető appnál ez hiba.
3. Ugyanannyi bájt, mert a `unicode-range` itt is darabokra bontja: a böngésző
   csak a `latin`-t tölti le, és a `latin-ext`-et csak akkor, amikor tényleg
   kiír egy ő-t vagy ű-t.

Az **Inter nem töltődik le**: a `-apple-system` / `BlinkMacSystemFont` /
`system-ui` lánc iPhone-on, Androidon és Windowson is a rendszerbetűt adja,
tehát az Inter sosem kerülne sorra. Csak névként maradt a listában, arra az
esetre, ha valakinél helyben telepítve van.

A Fraunces **egyetlen variábilis fájl**: mind a három vastagság abból jön, és a
`.display` `SOFT`/`WONK` tengelyei is csak így élnek — statikus példányra
cserélve a címek elvesztenék a karakterüket.

## Mozgás

A görbék és időzítések Emil Kowalski `animate` skilljének a tábláiból valók,
nem becsült értékek:

```css
--ease-out:    cubic-bezier(0.23, 1, 0.32, 1);   /* be- és kilépés */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);  /* képernyőn belüli mozgás */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);   /* alsó lap (Vaul) */
```

Néhány szabály, ami a kódban is látszik:

- **Csak `transform`, `opacity` és `clip-path` animálódik.** A haladássávok
  (napi metrikák, szokásonkénti arány, nyomva tartás) `clip-path: inset()`-tel
  töltődnek, nem `width`-tel — a szélesség animálása minden képkockán
  újratördelést kér, a `clip-path` csak kompozitálást. Ráadásul a lekerekített
  vég nem torzul, ahogy `scaleX`-nél tenné.
- **A csoportos belépés tiszta CSS-animáció**, nem JS-állapot. A
  `requestAnimationFrame` nem fut, amíg a lap nem látható — egy rAF-re váró
  láthatóvá tétel véglegesen átlátszón hagyná a tartalmat, ha az app háttérben
  töltődik be.
- **Nincs görgetésre belépő tartalom.** Az kizárólag marketingfelületre való:
  napi használatú fülön az interfész folyton újrajátssza magát, miközben az
  olvasó csak le akar görgetni.
- **A nyomva tartás időzítése aszimmetrikus**: a lenyomás lassú és lineáris (a
  haladásjelző ne gyorsuljon), az elengedés rövid és ease-out.
- A Motion-komponensek **teljes transform-stringet** kapnak, nem `x`/`y`/`scale`
  shorthandet — azok nem hardveresen gyorsítottak.

## Szín: a kék és a zöld között

Nem egyetlen akcentus megy végig az appon. Minden fül a sáv más pontját kapja —
Ma menta, Egészség türkiz, Edzés kék, Szokások limezöld, Trendek azúr —, és
ebből él minden gomb, pill, ikoncsempe, diagram és a navigáció is. A
`[data-accent]` szabályok az `index.css`-ben vannak, a fülhöz rendelés a
`BottomNav.tsx`-ben.

A szemantikus színek (hiba, figyelmeztetés, siker) szándékosan **nem** változnak
fülenként: azoknak mindenhol ugyanazt kell jelenteniük.

## Sebesség — mire megy el, és mire nem

A számok egy üres gyorsítótárú telefonos első betöltésre vonatkoznak,
vezetéken mért (tömörített) mérettel.

| | Előtte | Utána |
|---|---|---|
| Első betöltés | 474 KB | **359 KB** (−24%) |
| Fő JS-köteg | 670 KB / 202 KB gzip | **424 KB / 136 KB gzip** (−33%) |
| Kérések | 19 | **13** |
| Idegen kiszolgáló | 2 (googleapis, gstatic) | **0** |
| Service worker előtöltése | 1432 KB | **1213 KB** |

Ami a legtöbbet hozta, sorrendben:

**A Supabase-kliens lusta kötegbe került** (`src/lib/supabase.ts`). A
`@supabase/supabase-js` egységben hozza az autentikációt, a postgrestet, a
storage-ot, a realtime-ot, a functionst és az iceberget — a fára-rázás nem
tudja kidobni a nem használt részeit, mert a belépője mindet felsorolja. Ez
volt a köteg legnagyobb összetevője, nagyobb, mint a React. Az app viszont
ebből csak az autentikációt és a postgrestet használja, **helyi módban pedig
semennyit**. Most csak akkor töltődik le, ha a `.env` ki van töltve — és akkor
is azonnal, a főköteggel párhuzamosan, tehát a belépés nem lett lassabb.

**A barlang képe `rel="preload"`-ot kapott.** Enélkül a letöltése csak akkor
indult, amikor a JS-köteg már lefutott és a React elért az `<img>`-ig —
telefonon több másodperccel később. Ez a lap legnagyobb képe, tehát ez dönti
el, mikor látszik késznek az app.

**A képekre égetett színkorrekció.** A barlang a CSS-ben kapott egy teljes
képernyős `filter: saturate() brightness() contrast()` sort; ez külön
GPU-réteget és külön festési menetet kért a legnagyobb képen. A fájlba sütve
ingyen van, és mivel a kép sötétebb lett, kisebbre is tömörödött: 29,8 → 13,4
KB. A logónál a bájtok az **alfacsatornában** voltak, nem a színekben — a
színminőség csökkentése 4%-ot hozott, az `alphaQuality` 100 → 70 viszont 53%-ot
(65,3 → 30,9 KB). A kövek 520-ról 440 pixel magasra mentek: a hérosz 143 CSS-
pixelen mutatja őket, ami 3× kijelzősűrűségen 429 valódi pixel.

**Négy fül négy nem létező képet kért** minden megnyitáskor. A `TabHero` egy
`name` prop alapján mindig megpróbálta letölteni a `/{name}.webp`-et, csak
éppen egyetlen ilyen fájl sem készült el soha. És mivel a Netlify az
egyoldalas átírás miatt minden ismeretlen útvonalra 200-as `index.html`-t ad,
nem is 404 jött vissza, hanem a teljes HTML-lap, képnek álcázva. Most csak
akkor kér képet, ha kap egy `src`-t.

**A `stone.webp` bájtra ugyanaz volt, mint a `stones/stone-9.webp`** — 26 KB
tiszta ismétlés, amit a service worker is letöltött minden telepítéskor.

Ami **szándékosan maradt**: a `pwa-512.png` 117 KB-ja (az operációs rendszer
olvassa telepítéskor, a futó app soha — ezért viszont kikerült az előtöltésből),
és a recharts két kötege (346 KB). Utóbbi lusta, tehát a Ma fül nem fizet érte,
de előtöltve marad, hogy a Trendek offline is megnyíljon.

## Ha elesik a szerver — a helyi másolat

Az app belépés után **magától eltesz egy teljes másolatot** az adatodról arra
az eszközre, amin használod (`src/data/mirrorToLocal.ts`). Nem egy ablakot,
hanem mindent: nyitott dátumhatárral kér, míg a felület a legutóbbi 400 napot
mutatja.

Azért kell, mert 2026 novemberében a Supabase-szervezet egress-kerete kimerült,
és a Flint minden kérése 402-t adott. Az app ilyenkor helyi módba kapcsolható
(`VITE_FORCE_LOCAL=1`, lásd lent) — csak épp üresen indult volna. A történetet
egy kézzel kimentett `public/flint-seed.json`-ból kellett visszatölteni, ami
egyszer készült, tehát azonnal elavult, és mivel a `public/`-ban van, bárki
letölthette. A másolat ezt a kézi lépést szünteti meg.

Három szabály őrzi, hogy a tartalék tartalék is maradjon (mindhárom tesztelve,
`mirrorToLocal.test.ts`):

1. **Üres válaszra nem ír.** Egy lejárt munkamenet, egy félbeszakadt kérés vagy
   épp egy 402 üres listát is adhat — akkor a meglévő, használható másolatot
   cserélnénk le a semmire. Szokás nélkül nincs mit menteni.
2. **Hibára sem ír.** A kivétel megáll a modulban; a korábbi másolat marad.
3. **Legfeljebb 12 óránként fut magától.** A betöltés minden ablakbővítésnél
   újraindul, abból nem lehet napi tíz másolat. A Beállításokban van gomb, ami
   ezt megkerüli, és ott látszik az is, mikor készült a legutóbbi.

A másolat ugyanabba a `localStorage`-kulcsba megy, amiből a `localRepo`
dolgozik — tehát helyi módra váltva az app **magától a friss másolatot
találja** ott, nem egy régi mentést. Amint a Supabase visszatér és a másolat
egyszer lefutott, a `public/flint-seed.json` törölhető.

## Zárt kör: ki tud belépni

Csak az, akinek a címe benne van a `public.allowed_emails` táblában. A kaput
**adatbázis-trigger** őrzi (`supabase/migrations/004_allowed_emails.sql`), nem
a felület — a Supabase auth végpontja a nyilvános kulccsal közvetlenül is
hívható, és az a kulcs ott van minden látogató böngészőjében, a kliens-kötegben.
Felületi ellenőrzés tehát semmit nem védene.

A tábla a kliensből elérhetetlen: az `anon` és az `authenticated` szerep
semmilyen jogot nem kap rá, és RLS alatt egyetlen policy sem tartozik hozzá.
Olvasni és írni csak a `service_role` tud — vagyis te, a Supabase felületéről.

**Új ember beengedése** (Supabase → SQL Editor):

```sql
insert into public.allowed_emails (email, note)
values (lower('barat@pelda.hu'), 'Marci');
```

**Ki van a listán, és ki váltotta be:**

```sql
select email, note, claimed_at from public.allowed_emails order by added_at;
```

**Visszavonás** (a már létrehozott fiókot nem törli, csak új regisztrációt tilt):

```sql
delete from public.allowed_emails where email = lower('barat@pelda.hu');
```

Az alapértelmezés a TILTÁS: e-mail nélküli regisztráció is elbukik. Aki nincs
a listán, ezt látja: *„Ez a cím nincs a meghívottak között."*

Minden felhasználó adata **teljesen elkülönül** — minden táblán RLS van, a
policy `auth.uid() = user_id`. Senki nem látja a másikét.

## PWA — telepítés iPhone-ra

Nyisd meg Safariban → Megosztás → **Hozzáadás a Kezdőképernyőhöz**. Onnantól
teljes képernyőn indul, saját ikonnal, és offline is betölt.
