/**
 * Képtömörítés a `public/` mappában.
 *
 * A szkript MESTERKÉPEKBŐL dolgozik, nem a saját korábbi eredményéből. Ez nem
 * stílus kérdése: a színkorrekció és a kicsinyítés veszteséges, tehát ha a
 * bemenet a legutóbbi kimenet lenne, minden futtatás tovább rontaná a képet —
 * kétszer lefuttatva a barlang feleannyira lenne világos. Így viszont
 * akárhányszor futtatható, és mindig ugyanazt adja.
 *
 * Négy dolgot tesz:
 *
 * 1. SZÍNKORREKCIÓ BESÜTÉSE. A barlang képe a CSS-ben kapott egy
 *    `filter: saturate(0.72) brightness(0.66) contrast(1.05)` sort. Egy teljes
 *    képernyős CSS-szűrő viszont külön GPU-réteget és minden festésnél egy
 *    külön menetet jelent, méghozzá pont a lap legnagyobb képén — azon, ami
 *    eldönti, mikor látszik késznek az app. Ugyanaz a korrekció a fájlba
 *    beégetve ingyen van, és mivel a kép ettől sötétebb és kevésbé telített
 *    lesz, kisebbre is tömöríthető. A számítás a CSS-szűrők képletét követi
 *    (sRGB-ben, a `saturate` luminancia-mátrixával), nem a sharp `modulate`
 *    LCh-s értelmezését — így a látvány ugyanaz marad.
 *
 * 2. KICSINYÍTÉS A MEGJELENÍTÉSI MÉRETRE. A kő-fokozatok 520 pixel magasak
 *    voltak, de a hérosz 143 CSS-pixelen mutatja őket: a legsűrűbb (3×)
 *    kijelzőn is 429 pixel a valódi igény. A fölötte lévő rész letöltött,
 *    dekódolt és memóriában tartott adat, amit soha senki nem lát.
 *
 * 3. PNG — PALETTÁS ÚJRAKÓDOLÁS, MÉRT HIBAHATÁRRAL. A PNG veszteségmentes, és
 *    a fájljaink már jól vannak zlib-elve: tiszta újrakódolás egyetlen bájtot
 *    sem nyer. Az igazi nyereség a színpaletta, ez viszont KVANTÁL, tehát
 *    veszteséges. A szkript ezért nem hisz a beállításnak, hanem megméri:
 *    kiszámolja az eredeti és az új kép pixelenkénti eltérését, és csak akkor
 *    tartja meg az eredményt, ha az átlagos hiba 1,5/255 alatt, a legnagyobb
 *    egyedi eltérés pedig 40/255 alatt marad. Az ikonoknak PNG-nek kell
 *    maradniuk: a webmanifest és az iOS `apple-touch-icon` ezt várja.
 *
 * 4. WEBP ÚJRAKÓDOLÁS. A korábbi q=80 a sötét, elmosott barlangon és a
 *    kövön nem látszó részletekre költött; q=70–78 ugyanúgy néz ki.
 *
 * Futtatás:  node scripts/optimize-images.mjs [--dry]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const dry = process.argv.includes('--dry')

/** Meddig mehet el a palettázás hibája, 0–255-ös skálán. */
const MAX_MEAN_ERROR = 1.5
const MAX_PIXEL_ERROR = 40

/**
 * A kő-fokozatok magassága pixelben.
 *
 * A `GlowStone` 168-as alapmérettel hívja a követ, abból a kő magassága
 * `round(168 × 0.85) = 143` CSS-pixel. 3× kijelzősűrűségen ez 429 valódi
 * pixel; a 440 ennek a felkerekítése, tehát a kő a legsűrűbb telefonon is
 * natív felbontáson, nagyítás nélkül jelenik meg.
 */
const STONE_HEIGHT = 440

const kb = (n) => `${(n / 1024).toFixed(1)} KB`
let before = 0
let after = 0

/* ------------------------------------------------------------------ 1. barlang */
await graded({
  master: '_assetek-bejovo/splash-nyers.webp',
  out: 'public/splash.webp',
  // Pontosan az a sor, ami eddig a CSS-ben volt a `CaveBackdrop` képén.
  saturate: 0.72,
  brightness: 0.66,
  contrast: 1.05,
  quality: 68,
})

/* ------------------------------------------------------------------ 2. logó */
// A logónál a bájtok az ALFACSATORNÁBAN voltak, nem a színekben: a lágy
// fényudvar pontos átlátszóság-térképe drágább, mint maga a kép. A színek
// minősége 80-ról 62-re csökkentve 65,3 → 62,6 KB-ot adott (−4%), az
// `alphaQuality` 100-ról 70-re viszont 31 KB-ot (−53%). A mért hiba átlagban
// 1,7/255, a legnagyobb egyedi eltérés 36/255 — egy sötét háttéren derengő
// fényudvar belsejében, 132 CSS-pixelen megjelenítve. Alfa nélkül nem megy:
// az indítóképernyő közepén a barlang képe ÁTLÁTSZIK a jel mögött, tehát
// feketére lapítva ott egy fekete négyzet állna.
await graded({
  master: '_assetek-bejovo/mark-nyers.webp',
  out: 'public/mark.webp',
  width: 400, // 132 CSS-px × 3× kijelzősűrűség = 396
  quality: 62,
  alphaQuality: 70,
  note: 'alfa-minőség 100 → 70',
})

/* ------------------------------------------------------- 3. fül-hangulatsávok */
// Ugyanannak a barlangnak négy MÁS részlete, fülenként egy. A `TabHero`
// komponens eddig is tudta őket, csak soha nem készült el egyik sem — a sáv
// helyén egy puszta akcentus-derengés állt.
//
// Négy külön generálás helyett EGY mesterkép négy kivágása: így a négy fül
// ugyanabban a barlangban van, nem négy különböző helyen. A színkorrekció itt
// is be van égetve (a `TabHero` CSS-szűrője eltűnt), mert egy teljes
// szélességű `filter` minden fülváltáskor külön festési menetet kért.
for (const [nev, top] of [
  ['hero-egeszseg', 40],
  ['hero-edzes', 300],
  ['hero-szokasok', 560],
  ['hero-trendek', 790],
]) {
  await graded({
    master: '_assetek-bejovo/splash-nyers.webp',
    out: `public/${nev}.webp`,
    crop: { left: 0, top, width: 768, height: 360 },
    saturate: 0.7,
    brightness: 0.5,
    contrast: 1.05,
    quality: 62,
  })
}

/* ------------------------------------------------------------------ 4. kövek */
for (let i = 0; i < 10; i++) {
  await shrink(`public/stones/stone-${i}.webp`, STONE_HEIGHT, 78)
}

/* ------------------------------------------------------------------ 5. ikonok */
for (const file of ['public/pwa-512.png', 'public/pwa-192.png', 'public/apple-touch-icon.png']) {
  const original = readFileSync(file)
  const out = await sharp(original).png({ compressionLevel: 9, effort: 10 }).toBuffer()
  const { mean, max } = await pixelError(original, out)
  if (mean > MAX_MEAN_ERROR || max > MAX_PIXEL_ERROR) {
    console.error(`kihagyva (túl nagy a torzítás: átlag ${mean.toFixed(2)}, max ${max}): ${file}`)
    before += original.length
    after += original.length
    continue
  }
  report(file, original.length, out, `hiba: átlag ${mean.toFixed(2)}, max ${max}`)
}

console.log(`\nÖsszesen: ${kb(before)} → ${kb(after)} (${pct(before, after)})`)
if (dry) console.log('(--dry: egyetlen fájl sem íródott felül)')

/* ========================================================================= */

/** Mesterképből színkorrigált, méretre vágott webp. */
async function graded({ master, out, saturate, brightness = 1, contrast = 1, width, crop, quality, alphaQuality = 100, note = '' }) {
  if (!existsSync(master)) {
    console.error(`HIÁNYZÓ MESTERKÉP: ${master} — ${out} érintetlen marad`)
    return
  }
  const originalSize = existsSync(out) ? readFileSync(out).length : 0
  let pipeline = sharp(master)

  // A kivágás MINDEN más lépés előtt: a színkorrekciót már csak arra a
  // részletre kell elvégezni, ami tényleg megjelenik.
  if (crop) pipeline = pipeline.extract(crop)
  if (width) {
    const meta = await pipeline.metadata()
    if (meta.width > width) pipeline = pipeline.resize({ width })
  }
  // A `saturate()` a CSS-ben luminancia-mátrix, nem LCh-telítettség.
  if (saturate !== undefined) pipeline = pipeline.recomb(saturateMatrix(saturate))
  // A `brightness()` egyszerű RGB-szorzó, a `contrast()` a 0,5 középérték
  // körül nyújt. A kettő egyetlen lineáris lépésbe összevonható.
  if (brightness !== 1 || contrast !== 1) {
    pipeline = pipeline.linear(brightness * contrast, 255 * 0.5 * (1 - contrast))
  }
  const buf = await pipeline.webp({ quality, alphaQuality, effort: 6 }).toBuffer()
  report(out, originalSize, buf, note, true)
}

/** Meglévő webp kicsinyítése a megjelenítési méretre. */
async function shrink(file, height, quality) {
  const original = readFileSync(file)
  const meta = await sharp(original).metadata()
  if (meta.height <= height) {
    report(file, original.length, original)
    return
  }
  const buf = await sharp(original).resize({ height }).webp({ quality, effort: 6 }).toBuffer()
  report(file, original.length, buf, `${meta.height}px → ${height}px`)
}

/** A CSS `saturate(s)` 3×3-as mátrixa (sRGB, Rec.709 luminancia). */
function saturateMatrix(s) {
  const [lr, lg, lb] = [0.213, 0.715, 0.072]
  return [
    [lr + (1 - lr) * s, lg * (1 - s), lb * (1 - s)],
    [lr * (1 - s), lg + (1 - lg) * s, lb * (1 - s)],
    [lr * (1 - s), lg * (1 - s), lb + (1 - lb) * s],
  ]
}

/** Pixelenkénti eltérés a két kódolás között, 0–255-ös skálán. */
async function pixelError(a, b) {
  const [ra, rb] = await Promise.all([sharp(a).raw().toBuffer(), sharp(b).raw().toBuffer()])
  if (ra.length !== rb.length) return { mean: Infinity, max: Infinity }
  let sum = 0
  let max = 0
  for (let i = 0; i < ra.length; i++) {
    const d = Math.abs(ra[i] - rb[i])
    sum += d
    if (d > max) max = d
  }
  return { mean: sum / ra.length, max }
}

/**
 * @param force  Mesterképből származó eredménynél igaz: ott a színkorrekció a
 *   lényeg, nem a bájtszám, és a kimenet amúgy sem a következő futás bemenete.
 *   A helyben újrakódolt fájloknál hamis, és akkor a 3%-os szabály véd attól,
 *   hogy ismételt futtatásra hajszálnyi nyereségért romoljon a kép.
 */
function report(file, originalSize, out, note = '', force = false) {
  before += originalSize
  const keep = force || originalSize === 0 || out.length < originalSize * 0.97
  if (keep && !dry) writeFileSync(file, out)
  after += keep ? out.length : originalSize
  const name = file.replace('public/', '')
  console.log(
    keep
      ? `${name.padEnd(24)} ${kb(originalSize).padStart(9)} → ${kb(out.length).padStart(9)}  ${pct(originalSize, out.length).padEnd(5)} ${note}`
      : `${name.padEnd(24)} ${kb(originalSize).padStart(9)}  — már tömör, marad`,
  )
}

function pct(from, to) {
  if (from === 0) return 'új'
  return `−${Math.round((1 - to / from) * 100)}%`
}
