/**
 * Elmozdulás-térkép a „folyékony üveg" fénytöréséhez (`public/glass-map.png`).
 *
 * Az SVG `feDisplacementMap` úgy működik, hogy minden képpontnál a térkép
 * PIROS csatornája mondja meg, mennyivel told el vízszintesen a forrást, a
 * ZÖLD pedig függőlegesen; 128 a semleges. Ha a perem közelében elhajlítjuk a
 * mintavételt befelé, a mögötte lévő kép a széleken összenyomódik — pontosan
 * ezt csinálja egy üveglap vastag pereme.
 *
 * A térkép BEÁGYAZVA megy a kódba (`src/components/glassMap.ts`), nem külön
 * fájlként. Nem esztétikai döntés: a Chromium a szűrőn belüli `feImage`-et
 * NEM tölti be külső URL-ről — lemértem, a `/glass-map.png`-re hivatkozó
 * változat semmit nem csinált, miközben ugyanaz a szűrő turbulenciával
 * működött. A forrásrepó is ezért tart base64-blobot a HTML-ben.
 *
 * Nálunk viszont nem kézzel bemásolt blob: ez a szkript számolja, a
 * paraméterek olvashatók, és a térkép bármikor újragenerálható.
 *
 * Futtatás:  node scripts/make-glass-map.mjs
 */
import { writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const SIZE = 160
/** A peremsáv szélessége a doboz arányában. Ezen belül hajlik a fény. */
const EDGE = 0.2
/** Mekkora a legnagyobb kitérés (0–0,5 skálán, a 128-as semlegeshez képest). */
const STRENGTH = 0.42

/** 1 a legszélén, 0 a peremsáv belső határánál — lágy, koszinuszos átmenettel. */
function ramp(t) {
  if (t >= EDGE) return 0
  const k = 1 - t / EDGE
  return (1 - Math.cos(k * Math.PI)) / 2
}

const data = Buffer.alloc(SIZE * SIZE * 3)
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const u = (x + 0.5) / SIZE
    const v = (y + 0.5) / SIZE

    // Bal szélen befelé (pozitív), jobb szélen szintén befelé (negatív).
    const dx = ramp(u) - ramp(1 - u)
    const dy = ramp(v) - ramp(1 - v)

    const i = (y * SIZE + x) * 3
    data[i] = Math.round(128 + dx * STRENGTH * 255)
    data[i + 1] = Math.round(128 + dy * STRENGTH * 255)
    data[i + 2] = 128
  }
}

const png = await sharp(data, { raw: { width: SIZE, height: SIZE, channels: 3 } })
  .png({ compressionLevel: 9, effort: 10 })
  .toBuffer()

const module = `// GENERÁLT FÁJL — ne szerkeszd kézzel.
// Készítette: scripts/make-glass-map.mjs (${SIZE}×${SIZE}, peremsáv ${EDGE * 100}%, erősség ${STRENGTH})
//
// Elmozdulás-térkép a folyékony üveg peremi fénytöréséhez. Azért van
// beágyazva, mert a Chromium a szűrőn belüli feImage-et nem tölti be külső
// URL-ről — lásd a szkript fejlécét.
export const GLASS_MAP =
  'data:image/png;base64,${png.toString('base64')}'
`

await writeFile('src/components/glassMap.ts', module)
console.log(
  `kész: src/components/glassMap.ts — ${SIZE}×${SIZE}, ` +
    `${(png.length / 1024).toFixed(1)} KB nyersen, ` +
    `${((png.toString('base64').length) / 1024).toFixed(1)} KB base64-ben`,
)
