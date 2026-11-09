/**
 * A tíz kő-fokozat előállítása EGYETLEN mesterképből.
 *
 * Miért nem tíz generálás: tíz külön kép tíz külön kő lenne. Akármilyen
 * pontos a prompt, a körvonal, a kameraállás és a felület mintázata
 * generálásonként elcsúszik, és a fokozatváltás ugrásnak látszana, nem
 * folyamatnak. Egy mesterképből számolva a sziluett PIXELRE azonos marad, és
 * csak az változik, aminek változnia kell: mennyi élet van benne.
 *
 * A görbe nem lineáris sötétítés. Három dolog történik egyszerre, mert a
 * „kialvó kő" nem ugyanaz, mint a „lehalkított kép":
 *
 *   1. TELÍTETTSÉG — a játék a színekben hal el először. A 0. fokozat
 *      gyakorlatilag szürke kavics.
 *   2. FÉNYERŐ — a kő elsötétül, de nem feketedik be: a 0. fokozatnak is
 *      látszania kell a barlang előtt, különben eltűnik a háttérben.
 *   3. A MAG külön, GYORSABBAN hűl. A kép legvilágosabb foltja (a belső
 *      izzás) maszkolva kap külön szorzót, így a tűz előbb alszik ki, mint
 *      ahogy a kő elsötétül. Enélkül a 2. fokozat is „világító opál" maradna,
 *      csak halványabb — vagyis nem látszana, hogy épp kialudni készül.
 *
 * Futtatás:  node scripts/make-stones.mjs <mesterkép> [--out=public/stones] [--height=520]
 */
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const input = process.argv[2]
if (!input) {
  console.error('Használat: node scripts/make-stones.mjs <mesterkép.webp> [--out=…] [--height=…]')
  process.exit(1)
}
const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.split('=')[1] : fallback
}
const outDir = arg('out', 'public/stones')
const height = Number(arg('height', 520))
const LEVELS = 10

mkdirSync(outDir, { recursive: true })

/** 0 → kialudt, 1 → teljes. A 0. fokozat sem nulla: látszania kell. */
const t = (level) => level / (LEVELS - 1)

/** Telítettség: a szín hal el leghamarabb. */
const saturation = (level) => 0.1 + 0.9 * Math.pow(t(level), 0.75)
/** Fényerő: a kő sötétedik, de 0,5 alá nem megy — különben eltűnik. */
const brightness = (level) => 0.5 + 0.5 * Math.pow(t(level), 0.9)
/** A belső izzás külön, meredekebb görbén hűl ki. */
const core = (level) => Math.pow(t(level), 1.9)

const base = sharp(input).ensureAlpha()
const { width: W, height: H } = await base.metadata()

// A mesterkép alfacsatornája külön. Ez a sziluett, és ez a végső szó: a
// rárakások után VISSZAÍRJUK, különben a `screen` keverés kitölti az egész
// vásznat. (Pontosan ez történt először: a 9. fokozat körül ott ült a kép
// fekete téglalapja, mert a keverés az alfát is összeadta. A hiba a fekete
// hátterű kontaktlapon láthatatlan volt, csak az appban, a barlang előtt
// derült ki — ezért kell az ilyet mindig a valódi háttéren megnézni.)
const alpha = await sharp(input).ensureAlpha().extractChannel('alpha').raw().toBuffer()

// A mag maszkja: a kép legvilágosabb foltja. Egyszer számoljuk ki, és minden
// fokozatnál ugyanazt használjuk — így a tűz pontosan ott ül mind a tízen.
// Az alfával is leszorítjuk: a kövön kívül nem gyulladhat ki semmi, akármit
// tartalmaz a RGB a levágott területen.
const grey = await sharp(input).removeAlpha().greyscale().raw().toBuffer()
const coreMask = Buffer.alloc(W * H)
for (let i = 0; i < coreMask.length; i++) {
  // 170 alatt nincs mag, 255-nél teljes — lágy átmenettel
  const luma = Math.max(0, Math.min(255, Math.round(((grey[i] - 170) / 85) * 255)))
  coreMask[i] = Math.min(luma, alpha[i])
}
const softMask = await sharp(coreMask, { raw: { width: W, height: H, channels: 1 } })
  .blur(3)
  .raw()
  .toBuffer()
// Sziluett-maszk `dest-in` keveréshez: fehér kép, aminek az ALFÁJA a
// mesterképé. A `joinChannel`-lel visszatűzött csatornát a PNG-író nem
// mindig veszi alfának — a rárakás viszont mindig.
const silhouette = await sharp({
  create: { width: W, height: H, channels: 3, background: { r: 255, g: 255, b: 255 } },
})
  .joinChannel(alpha, { raw: { width: W, height: H, channels: 1 } })
  .png()
  .toBuffer()

const coreLayer = await sharp(input)
  .removeAlpha()
  .joinChannel(softMask, { raw: { width: W, height: H, channels: 1 } })
  .png()
  .toBuffer()

for (let level = 0; level < LEVELS; level++) {
  const body = await sharp(input)
    .modulate({ brightness: brightness(level), saturation: saturation(level) })
    .png()
    .toBuffer()

  // A magot `screen`-nel tesszük vissza: a fény hozzáadódik, nem kitakar.
  // Az erősségét az alfa szabja — egy egyszínű fehér réteggel maszkolva.
  const strength = {
    create: { width: W, height: H, channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: core(level) } },
  }
  const glow = await sharp(coreLayer)
    .composite([{ input: await sharp(strength).png().toBuffer(), blend: 'dest-in' }])
    .png()
    .toBuffer()

  // Két menet: a sharp a kicsinyítést a rárakás ELŐTT futtatja, tehát egy
  // menetben a teljes méretű izzás nem férne rá a már lekicsinyített kőre.
  const lit = await sharp(body)
    .composite([{ input: glow, blend: 'screen' }])
    .png()
    .toBuffer()

  // Harmadik menet: a sziluett visszavágása. Enélkül a `screen` keverés az
  // alfát is összeadja, és a kő köré kerül a kép fekete téglalapja.
  const composed = await sharp(lit)
    .composite([{ input: silhouette, blend: 'dest-in' }])
    .png()
    .toBuffer()

  const file = join(outDir, `stone-${level}.webp`)
  await sharp(composed).resize({ height }).webp({ quality: 80, effort: 6 }).toFile(file)

  console.log(
    `stone-${level}: telítettség ${saturation(level).toFixed(2)}, ` +
      `fényerő ${brightness(level).toFixed(2)}, mag ${core(level).toFixed(2)}`,
  )
}
console.log(`\nKész — ${LEVELS} fokozat a(z) ${outDir} mappában.`)
