# Flint — képek

| Fájl | Méret | Mi ez |
|---|---|---|
| `splash.webp` | 768 × 1152, 13 KB | A barlang — az indítóképernyő ÉS a Ma fül háttere, egy fájlból |
| `stones/stone-0…9.webp` | 327 × 440, alfa, 10–18 KB | A kő tíz fokozata (`scripts/make-stones.mjs`) |
| `mark.webp` | 400 × 400, alfa, 31 KB | A Flint-jel (pattintott kő) — indítóképernyő, belépés |
| `pwa-192.png` · `pwa-512.png` · `apple-touch-icon.png` | — | A kezdőképernyő-ikonok |
| `favicon.svg` | — | Böngészőfül; kézzel rajzolt, nem generált |

Ha bármelyik hiányzik, az app CSS/SVG-ből rajzolt tartalékra vált — de **csak
akkor**, ha a letöltés tényleg elbukik. Töltés közben nincs helyettesítő
látvány: a rajzolt barlang és a rajzolt kő korábban minden egyes indításnál
felvillant, mert a komponensek előbb „megnézték", betölthető-e a kép. Ezt lásd
a `CaveBackdrop` és a `GlowStone` kommentjeiben.

## Tömörítés

```bash
node scripts/optimize-images.mjs [--dry]
```

A szkript **mesterképekből** dolgozik (`_assetek-bejovo/*-nyers.webp`), nem a
saját előző eredményéből — tehát akárhányszor futtatható, és mindig ugyanazt
adja. A színkorrekciót (sötétítés, telítettség) BEÉGETI a fájlba ahelyett, hogy
a CSS `filter`-rel csinálná: egy teljes képernyős szűrő a lap legnagyobb képén
külön GPU-réteget és külön festési menetet kér, a fájlba sütve pedig ingyen
van, ráadásul a sötétebb kép kisebbre is tömörödik.

**Ha új barlang- vagy logóképet teszel be**, előbb a mesterképet cseréld
(`_assetek-bejovo/splash-nyers.webp`, `mark-nyers.webp`), utána futtasd a
szkriptet. A `public/`-ba kézzel bemásolt kép a következő futtatáskor
felülíródik.

## Vízjel eltávolítása

A generátor egy ✦ jelet tesz a jobb alsó sarokba. Két út van, és **a kettő nem
cserélhető fel**:

**Egyenletes háttéren** (pl. a logó fekete sarka) — egyszínű folt:

```bash
node scripts/remove-watermark.mjs ~/be.png ki.png --at=904,902 --size=120 --fill='#000000'
```

**Textúrán** (barlang, szikla, víz) — ott a fekete folt jobban látszana, mint a
vízjel. Ha a jel a kép szélén van, a legtisztább megoldás a **levágás**:

```bash
node -e "require('sharp')('~/be.png').extract({left:0,top:0,width:768,height:1152}).toFile('public/splash.webp')"
```

A szomszédos folt átmásolása (`--from`, `--blur`) elméletben szebb, de a
gyakorlatban könnyen behúzza a tárgy egy darabját a képbe, vagy tónuseltérés
miatt látható foltot hagy. Csak akkor érdemes, ha a levágás nem járható.

## Új ikon

```bash
node scripts/make-icons.mjs ~/flint-ikon.png   # pwa-192 / pwa-512 / apple-touch-icon
node scripts/make-alpha.mjs ~/flint-ikon.png public/mark.webp --max=512 --floor=10
```

Az ikonok szándékosan **nem** kapnak alfacsatornát: a sarkokat a rendszer vágja
le, és egy átlátszó hátterű ikon iOS-en feketére, Androidon fehérre esne ki.
