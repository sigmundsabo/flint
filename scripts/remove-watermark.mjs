/**
 * Eltünteti a generátor ✦ vízjelét egy szomszédos folt átmásolásával.
 *
 * Nem befeketítjük: a vízjel gyakran textúrán ül (a barlangképen sziklán és
 * vízen), ott egy fekete téglalap jobban látszana, mint maga a vízjel. Ehelyett
 * a MELLETTE lévő, hasonló tónusú területet másoljuk rá, lágy szélű maszkkal —
 * így nincs látható varrat.
 *
 * Futtatás:
 *   node scripts/remove-watermark.mjs <be> <ki> --at=x,y --size=N [--from=dx,dy]
 *
 *   --at    a vízjel KÖZEPE
 *   --size  a lefedendő négyzet oldala (legyen bőven nagyobb a jelnél)
 *   --from  honnan másoljunk, a folthoz képest eltolva (alap: balra a folt 1,5×-e)
 *   --blur  a folt elmosása, hogy a textúra-eltérés ne adjon látható varratot
 *   --match a folt fényességét a környezethez igazítja (alapból be van kapcsolva)
 *   --fill  egyszínű folt másolás helyett (pl. --fill=#000000). Ott jó, ahol a
 *           vízjel egyenletes háttéren ül — másoláskor ilyenkor könnyű véletlenül
 *           a tárgy egy darabját behúzni a képbe.
 */
import sharp from 'sharp'

const [, , input, output, ...rest] = process.argv
const arg = (name) => rest.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]

if (!input || !output || !arg('at')) {
  console.error('Használat: node scripts/remove-watermark.mjs <be> <ki> --at=x,y --size=N [--from=dx,dy]')
  process.exit(1)
}

const [cx, cy] = arg('at').split(',').map(Number)
const size = Number(arg('size') ?? 80)
const [dx, dy] = (arg('from') ?? `${-Math.round(size * 1.5)},0`).split(',').map(Number)

const left = Math.round(cx - size / 2)
const top = Math.round(cy - size / 2)

const base = sharp(input)
const { width, height } = await base.metadata()

const clamp = (v, max) => Math.max(0, Math.min(max - size, v))
const srcLeft = clamp(left + dx, width)
const srcTop = clamp(top + dy, height)

const blurAmount = Number(arg('blur') ?? 0)
const fill = arg('fill')

// A forrásfolt, amit rámásolunk
let patchPipe = sharp(input).extract({ left: srcLeft, top: srcTop, width: size, height: size })
if (blurAmount > 0) patchPipe = patchPipe.blur(blurAmount)

// Tónusigazítás: a forrás és a cél átlagos fényessége ritkán egyezik, és pont
// ez adja a látható folt-élt. A különbséget lineáris szorzóval visszük vissza.
const meanOf = async (l, t) => {
  const { channels } = await sharp(input)
    .extract({ left: l, top: t, width: size, height: size })
    .stats()
  return channels.slice(0, 3).reduce((a, c) => a + c.mean, 0) / 3
}
const srcMean = await meanOf(srcLeft, srcTop)
const dstMean = await meanOf(clamp(left, width), clamp(top, height))
const ratio = srcMean > 1 ? Math.max(0.6, Math.min(1.6, dstMean / srcMean)) : 1
if (arg('match') !== 'off') patchPipe = patchPipe.linear(ratio, 0)

const patch = fill
  ? await sharp({
      create: { width: size, height: size, channels: 4, background: fill },
    })
      .png()
      .toBuffer()
  : await patchPipe.toBuffer()

// Lágy szélű maszk: középen tömör, a szélek felé kifut — ettől nincs varrat
const feather = Math.round(size * 0.22)
const mask = await sharp({
  create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([
    {
      input: Buffer.from(
        `<svg width="${size}" height="${size}"><rect x="${feather}" y="${feather}" ` +
          `width="${size - feather * 2}" height="${size - feather * 2}" rx="${size / 4}" fill="#fff"/></svg>`,
      ),
      blend: 'over',
    },
  ])
  .blur(feather / 2)
  .png()
  .toBuffer()

const softPatch = await sharp(patch)
  .ensureAlpha()
  .composite([{ input: mask, blend: 'dest-in' }])
  .png()
  .toBuffer()

await sharp(input)
  .composite([{ input: softPatch, left, top }])
  .toFile(output)

console.log(`kész: ${output} — a ${cx},${cy} körüli ${size}px folt lecserélve`)
