# Képgenerálás — mit hova, és milyen prompttal

## Melyik eszközzel

**FLUX.1 [schnell]** — ez a legjobb ingyenes, valóban nyílt forrású választás.
Apache 2.0 licenc, tehát bármire használhatod, korlátozás nélkül.

| Hol | Link | Megjegyzés |
|---|---|---|
| **Hugging Face Space (ajánlott)** | <https://huggingface.co/spaces/black-forest-labs/FLUX.1-schnell> | Böngészőben fut, ingyenes, a `szabzsi` fiókoddal be vagy jelentkezve. Nincs telepítés. |
| Modell | <https://huggingface.co/black-forest-labs/FLUX.1-schnell> | Apache 2.0 |
| Helyben | ComfyUI + a schnell GGUF változat | Mac-en is elmegy, de ~8 GB letöltés |

Alternatívák, ha a FLUX nem tetszik:

- **Qwen-Image** (Apache 2.0) — <https://huggingface.co/spaces/Qwen/Qwen-Image> — szintén ingyenes, kifejezetten jó szöveges elemeknél
- **Stable Diffusion 3.5** — ingyenes, de a licence nem teljesen szabad kereskedelmi célra

A háttér-eltávolításhoz (a kőnél kelleni fog):
<https://huggingface.co/spaces/not-lain/background-removal>

---

## 1. `cave.jpg` — a barlang háttere

**Beállítás:** szélesség `832`, magasság `1216`, lépések `4`

```
Dark rocky cave interior seen from within, damp granite walls with fine mineral
texture framing the left and right edges, deep black shadows, a narrow vertical
opening in the distance at the centre, cool teal-green light spilling from that
opening, volumetric haze, tiny dust motes catching the glow, cinematic moody
lighting, empty centre with nothing in it, vertical composition, no people, no text
```

**Amire figyelj:** a közepe maradjon ÜRES — oda kerül a kő. Ha a generált képen
van valami a közepén, kérd újra más seeddel.

---

## 2. `stone.png` — a fénylő kő

**Beállítás:** szélesség `1024`, magasság `1024`, lépések `4`

```
A single smooth wet rock, egg shaped, glowing from within with opalescent mint
green and pale aqua light, iridescent internal fire visible through cracks in the
dark stone shell, rim lit, floating, isolated on a plain solid black background,
studio product photography, macro, centred, sharp detail, no text
```

**Utána kötelező lépés:** vidd át a
[background-removal Space-re](https://huggingface.co/spaces/not-lain/background-removal),
és mentsd `stone.png` néven. **Átlátszó háttér nélkül fekete négyzet lesz a kő
körül.**

---

## 3. Opcionális: szokás-ikonok

Ha az ikonokat is képként szeretnéd (most vektoros lucide-ikonok vannak, azok
végig élesek maradnak és a témával együtt színeződnek — szerintem hagyd őket):

**Beállítás:** `512 × 512`, lépések `4`. Cseréld a **[TÁRGY]** helyét:

```
A single [TÁRGY] rendered as a small glossy 3D icon, dark charcoal body with soft
mint green inner glow, subtle glass reflections, floating, isolated on plain solid
black background, product render, centred, no text, no shadow on the floor
```

| Szokás | `[TÁRGY]` |
|---|---|
| Lépés | `pair of footprints` |
| Alvás | `crescent moon` |
| Kalória | `flame` |
| Víz | `water droplet` |
| Képernyőidő | `smartphone` |
| Lefekvés | `bed` |
| Edzés | `dumbbell` |
| Nyakerősítés | `pulse wave line` |
| Kiegészítők | `capsule pill` |
| Leszokás | `shield` |

Ezeket is át kell vinni a háttér-eltávolítón.

---

## Hova tedd őket

```
Projektek/habit-tracker/public/cave.jpg
Projektek/habit-tracker/public/stone.png
```

Mentsd el, és a fejlesztői szerver azonnal átveszi — kódot nem kell módosítani.
Ha a fájl nincs ott, az app a rajzolt (CSS/SVG) változatot használja, ami
önmagában is teljes értékű.

---

# Szokás-ikonok — fagyottüveg irány (2026-09-01)

## Miért ez az irány

Pinteresten végignézve a „dark UI icon set" találatokat két csoport van: a
generikus vonalas ikonrácsok (pont amitől szabadulni akarunk), és a **fagyott
üveg** irány — áttetsző, tejes üvegből formált glifák sötét alapon, lágy
fénytöréssel a peremen és halvány belső derengéssel. Ez utóbbi (Iconora Studio
„Frosted 3D glass icons" a legjobb példa rá) azért illik ide, mert az app már
liquid glass felületeket használ: az ikon ugyanabból az anyagból lesz, mint a
kártya, amin ül. Nem odabiggyesztett díszítés, hanem ugyanaz a világ.

Nem 3D kőikonokat kérünk tehát, hanem üveget.

## A sablon

**Beállítás:** `512 × 512`, lépések `4`, FLUX.1-schnell.
Cseréld a **[TÁRGY]** és a **[SZÍN]** helyét a lenti táblázatból:

```
A single [TÁRGY] symbol sculpted from thick frosted translucent glass, soft
[SZÍN] tint refracting through the material, glowing edges where light catches
the bevel, faint inner glow, subtle caustics, floating, isolated on a plain solid
black background, studio product render, centred, soft shadows, no text, no floor
```

A **[SZÍN]** fülönként változik — az app is a kék→zöld sávban mozog, és így az
ikonok is a saját fülük hangulatába illenek.

| Szokás | `[TÁRGY]` | `[SZÍN]` |
|---|---|---|
| Lépés | `pair of footprints` | `pale aqua` |
| Alvás | `crescent moon` | `soft periwinkle blue` |
| Kalória | `flame` | `warm mint` |
| Víz | `water droplet` | `bright cyan` |
| Képernyőidő | `smartphone` | `steel blue` |
| Lefekvés | `bed` | `deep indigo blue` |
| Edzés | `dumbbell` | `sky blue` |
| Nyakerősítés | `pulse wave line` | `sky blue` |
| Kiegészítők | `capsule pill` | `yellow green` |
| Leszokás | `shield` | `lime green` |
| Fogmosás | `toothbrush` | `pale mint` |

## Amire figyelj

- **Egy szimbólum, ne jelenet.** Ha a kép tájat vagy környezetet is rajzol,
  kérd újra — a „isolated on a plain solid black background" a kulcs.
- **Azonos kameraállás.** Ha az egyik ikon szemből, a másik ferdén néz ki, a
  sor rendetlen lesz. Ugyanazzal a seeddel indítva egységesebb.
- A vastagság maradjon hasonló mind a tizenegyen — ez az, ami a készletet
  készletté teszi.

## Feldolgozás

Mindegyik át kell menjen az alfa-szkripten, különben fekete négyzet lesz körülöttük:

```bash
node scripts/make-alpha.mjs ~/lepes.png public/icons/lepes.webp --max=256 --floor=14
```

Utána szólj, és bekötöm őket: a `habits.icon` mezőbe kerül a fájlnév, és az
`Icon` komponens képet rajzol vektor helyett, ha talál hozzá fájlt.


---

# Fülenkénti hangulatsáv — elnapolva

A négy fül-hangulatkép helye megvan a kódban (`TabHero`), de egyelőre nem
generáljuk. Ha később mégis kell, a fülek `public/hero-egeszseg.webp`,
`hero-edzes.webp`, `hero-szokasok.webp`, `hero-trendek.webp` néven keresik a
képet; addig mindegyik egy halk, akcentusszínű derengést mutat helyette.

---

# Flint — logó, app-ikon, indítókép

Az app neve **Flint** (kovakő): az a kő, amiből a szikra pattan.

## Miért nincs szöveg az ikonon

Az app-ikon 192 képponton látszik a kezdőképernyőn — ott a betűk olvashatatlan
pacává esnek össze. A képgenerátorok ráadásul torzítva rajzolják a szöveget,
ami pont úgy néz ki, ahogy nem szeretnénk. Ezért:

- **a jelet generáljuk** (a pattintott kő),
- **a szót az app saját betűjével (Fraunces) szedjük** — éles marad minden
  méretben, és passzol a fülcímekhez.

A forma szándékosan **szögletes**, nem gömbölyű: a kagylós törésű, pattintott
kovakőnek éles élei vannak, és kis méretben a szögletes sziluett olvasható,
a gömb nem.

---

## 1. Logó / app-ikon

| | |
|---|---|
| **Méret** | `1024 × 1024` |
| **Képarány** | 1:1 (négyzet) |
| **Lépések** | 4 |
| **Mentsd** | `~/flint-ikon.png` |

```
A single asymmetric broken flint stone shard, irregular chipped edges from
conchoidal fracture, matte dark charcoal grey rock, one jagged edge glowing hot
with mint green and pale aqua light as if just struck, a few tiny sparks along
that edge only, floating in empty space, filling most of the frame, isolated on
pure solid black, no floor, no ground, no surface, no cast shadow, dramatic rim
lighting, studio product render, sharp macro detail, no text, no watermark
```

Három dolog van benne szándékosan, mert a próbáimon mindegyik elromlott:

- **`asymmetric broken` · `irregular chipped`** — kétszer is szabályos gyémántot
  kaptam. A kovakő letört darab, nem csiszolt kristály.
- **`no floor, no ground, no surface, no cast shadow`** — a „pure black
  background" önmagában kevés volt, betonpadlót rajzolt alá.
- **`that edge only`** — ha nem kötöd ki, az egész követ átvilágítja, és elveszik
  a jelentés: a szikra a pattintás éléről jön.

Feldolgozás:

```bash
node scripts/make-icons.mjs ~/flint-ikon.png
```

## 2. Indítókép

| | |
|---|---|
| **Méret** | `1024 × 1536` |
| **Képarány** | 2:3 (álló) |
| **Lépések** | 4 |
| **Mentsd** | `~/flint-splash.png`, majd `public/splash.webp` |

```
Dark cave interior seen from within, a narrow vertical opening in the distance
glowing with soft teal light, volumetric haze, damp rock walls framing the left
and right edges, deep black at the edges, completely empty centre, cinematic,
vertical composition, no people, no text, no objects
```

A **`completely empty centre`** nem díszítés: oda kerül a jel, alá pedig a
*Flint* felirat Fraunces-szel. Ha a generátor bepakol valamit középre, kérj újat.

---

# Szokás-ikonok — fagyottüveg irány (2026-09-01)

## Miért ez az irány

Pinteresten végignézve a „dark UI icon set" találatokat két csoport van: a
generikus vonalas ikonrácsok (pont amitől szabadulni akarunk), és a **fagyott
üveg** irány — áttetsző, tejes üvegből formált glifák sötét alapon, lágy
fénytöréssel a peremen és halvány belső derengéssel. Ez utóbbi (Iconora Studio
„Frosted 3D glass icons" a legjobb példa rá) azért illik ide, mert az app már
liquid glass felületeket használ: az ikon ugyanabból az anyagból lesz, mint a
kártya, amin ül. Nem odabiggyesztett díszítés, hanem ugyanaz a világ.

Nem 3D kőikonokat kérünk tehát, hanem üveget.

## A sablon

**Beállítás:** `512 × 512`, lépések `4`, FLUX.1-schnell.
Cseréld a **[TÁRGY]** és a **[SZÍN]** helyét a lenti táblázatból:

```
A single [TÁRGY] symbol sculpted from thick frosted translucent glass, soft
[SZÍN] tint refracting through the material, glowing edges where light catches
the bevel, faint inner glow, subtle caustics, floating, isolated on a plain solid
black background, studio product render, centred, soft shadows, no text, no floor
```

A **[SZÍN]** fülönként változik — az app is a kék→zöld sávban mozog, és így az
ikonok is a saját fülük hangulatába illenek.

| Szokás | `[TÁRGY]` | `[SZÍN]` |
|---|---|---|
| Lépés | `pair of footprints` | `pale aqua` |
| Alvás | `crescent moon` | `soft periwinkle blue` |
| Kalória | `flame` | `warm mint` |
| Víz | `water droplet` | `bright cyan` |
| Képernyőidő | `smartphone` | `steel blue` |
| Lefekvés | `bed` | `deep indigo blue` |
| Edzés | `dumbbell` | `sky blue` |
| Nyakerősítés | `pulse wave line` | `sky blue` |
| Kiegészítők | `capsule pill` | `yellow green` |
| Leszokás | `shield` | `lime green` |
| Fogmosás | `toothbrush` | `pale mint` |

## Amire figyelj

- **Egy szimbólum, ne jelenet.** Ha a kép tájat vagy környezetet is rajzol,
  kérd újra — a „isolated on a plain solid black background" a kulcs.
- **Azonos kameraállás.** Ha az egyik ikon szemből, a másik ferdén néz ki, a
  sor rendetlen lesz. Ugyanazzal a seeddel indítva egységesebb.
- A vastagság maradjon hasonló mind a tizenegyen — ez az, ami a készletet
  készletté teszi.

## Feldolgozás

Mindegyik át kell menjen az alfa-szkripten, különben fekete négyzet lesz körülöttük:

```bash
node scripts/make-alpha.mjs ~/lepes.png public/icons/lepes.webp --max=256 --floor=14
```

Utána szólj, és bekötöm őket: a `habits.icon` mezőbe kerül a fájlnév, és az
`Icon` komponens képet rajzol vektor helyett, ha talál hozzá fájlt.


---

# Fülenkénti hangulatsáv — elnapolva

A négy fül-hangulatkép helye megvan a kódban (`TabHero`), de egyelőre nem
generáljuk. Ha később mégis kell, a fülek `public/hero-egeszseg.webp`,
`hero-edzes.webp`, `hero-szokasok.webp`, `hero-trendek.webp` néven keresik a
képet; addig mindegyik egy halk, akcentusszínű derengést mutat helyette.

---

# Flint — logó, app-ikon, indítókép

Az app neve **Flint** (kovakő): az a kő, amiből a szikra pattan.

## Miért nincs szöveg az ikonon

Az app-ikon 192 képponton látszik a kezdőképernyőn — ott a betűk olvashatatlan
pacává esnek össze. A képgenerátorok ráadásul torzítva rajzolják a szöveget,
ami pont úgy néz ki, ahogy nem szeretnénk. Ezért:

- **a jelet generáljuk** (a pattintott kő),
- **a szót az app saját betűjével (Fraunces) szedjük** — éles marad minden
  méretben, és passzol a fülcímekhez.

A forma szándékosan **szögletes**, nem gömbölyű: a kagylós törésű, pattintott
kovakőnek éles élei vannak, és kis méretben a szögletes sziluett olvasható,
a gömb nem.

---

## 1. Logó / app-ikon — `~/flint-ikon.png`

**Beállítás:** `1024 × 1024`, lépések `4`, FLUX.1-schnell.

```
A single knapped flint stone shard, angular faceted surface from conchoidal
fracture, dark charcoal grey rock, one sharp edge glowing hot with mint green
and pale aqua light as if just struck, tiny sparks near the edge, floating and
centred, filling most of the frame, plain solid black background, dramatic rim
lighting, product render, sharp macro detail, no text, no border
```

**A kő töltse ki a képkocka nagy részét** — ha sok a fekete körülötte, 192
képponton már csak egy pötty lesz belőle.

Feldolgozás:

```bash
node scripts/make-icons.mjs ~/flint-ikon.png
```

Ez legyártja a `pwa-192.png`, `pwa-512.png` és `apple-touch-icon.png` fájlokat.
Alfacsatornát szándékosan NEM kap: a sarkokat a rendszer vágja le, és egy
átlátszó hátterű ikon iOS-en feketére, Androidon fehérre esne ki.

## 2. Indítókép — `~/flint-splash.png`

**Beállítás:** `1024 × 1536` (álló), lépések `4`.

```
Dark cave interior seen from within, a narrow vertical opening in the distance
glowing with soft teal light, volumetric haze, empty centre, deep black edges,
cinematic, vertical composition, no people, no text
```

A barlang-háttér nyugodtabb változata — indításkor egy pillanatra ez látszik,
a közepére kerül a jel és alá a **Flint** felirat, ezért maradjon üres a közepe.
Mentsd `public/splash.webp` néven.

---

