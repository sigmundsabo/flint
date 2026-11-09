/**
 * A generált képek (kő, gyűrű) fekete háttere helyett valódi alfacsatornát készít.
 *
 * A `mix-blend-mode: screen` elvileg elintézné, de a blend csak a saját
 * stacking contextusán belül lát — a lebegő animáció és a lap z-indexei
 * pedig többet is létrehoznak közte és a barlang között, így a fekete
 * négyzet ott maradna. Ezért itt égetjük bele az átlátszóságot.
 *
 * A generátor egy kis ✦ vízjelet tesz a jobb alsó sarokba — a `--crop`
 * kapcsolóval kivágható a hasznos sáv, mielőtt a levágás futna, különben a
 * vízjel megakadályozná a trimmelést.
 *
 * Futtatás:
 *   node scripts/make-alpha.mjs <bemenet> <kimenet> [--crop=top,height] [--max=720]
 *                               [--floor=N] [--trim=N] [--bg=black|white] [--shrink=N]
 *
 *   --bg     a háttér színe. `black` (alap) a sötét háttéren generált képekhez,
 *            `white` a fehér háttéren generáltakhoz. A kettő teljesen más
 *            eljárás — lásd lentebb, miért.
 *   --shrink  fehér módban ennyi képponttal húzza befelé a maszkot (alap: 2).
 *   --band    a peremsáv vastagsága képpontban (alap: 10). Ezen belül a
 *             fényesség szabja az átlátszóságot, nem a maszk. Világító tárgynál
 *             a saját koszorúja szélesebb ennél — ilyenkor fel kell vinni, és a
 *             derengés átúszóvá válik ahelyett, hogy fehér gyűrűként ülne ott.
 *   --fade    a peremsáv átlátszósági skálája: `papír,szilárd` (alap: 252,216).
 *             A `szilárd` lejjebb vitele lankásabb átmenetet ad — erre a
 *             világító tárgyaknál van szükség, ahol a koszorú még elég sötét
 *             ahhoz, hogy a szűk skálán átlátszatlannak minősüljön.
 *   --paper   mi számít papírnak az öntésnél: `legkisebbCsatorna,színesség`
 *             (alap: 232,12). Világító tárgynál mindkettőt engedni kell — a
 *             kő saját koszorúja világos ÉS színes (pl. min 230, színesség 22),
 *             így a szigorú színesség-küszöb megállítja az öntést, és fehér
 *             gyűrű marad a sötét felületen. A tárgy belsejét nem bántja: oda
 *             az öntés kívülről nem jut el.
 *   --floor  ennyi alatt nullázza az alfát, MIELŐTT a levágás fut
 *   --trim   a levágás küszöbe. A generátorok szemcséje a fekete háttéren is
 *            hagy 1–6 közötti alfát; alapértelmezett 1-gyel ez kint tartja a
 *            kép szélét, és a tárgy kicsinek, elcsúszottnak látszik a dobozában.
 */
import sharp from 'sharp'

const input = process.argv[2]
const output = process.argv[3]
if (!input || !output) {
  console.error('Használat: node scripts/make-alpha.mjs <bemenet> <kimenet>')
  process.exit(1)
}

// A háttér tiszta fekete, a kő pereme viszont sötét kőzet — ezért NEM lehet
// egyszerű küszöböt húzni. A fényesség alsó sávjában lágyan úsztatjuk az
// alfát, így a perem megmarad, a háttér viszont eltűnik.
const LO = 5 // e alatt biztosan háttér
const HI = 26 // e fölött biztosan a kő

const bgArg = process.argv.find((a) => a.startsWith('--bg='))
const bg = bgArg ? bgArg.split('=')[1] : 'black'
if (bg !== 'black' && bg !== 'white') {
  console.error(`Ismeretlen --bg: ${bg}. Csak 'black' vagy 'white'.`)
  process.exit(1)
}

// A peremsáv vastagsága képpontban: ezen belül a fényesség szabja az alfát.
const bandArg = process.argv.find((a) => a.startsWith('--band='))
const HALO_BAND = bandArg ? Number(bandArg.split('=')[1]) : 10
// E fölött papír, e alatt szilárd — a peremsáv átlátszóságának a skálája.
const fadeArg = process.argv.find((a) => a.startsWith('--fade='))
const [PAPER, SOLID] = fadeArg ? fadeArg.split('=')[1].split(',').map(Number) : [252, 216]

const shrinkArg = process.argv.find((a) => a.startsWith('--shrink='))
const shrink = shrinkArg ? Number(shrinkArg.split('=')[1]) : 2

const paperArg = process.argv.find((a) => a.startsWith('--paper='))
const [paperMin, paperChroma] = paperArg
  ? paperArg.split('=')[1].split(',').map(Number)
  : [232, 12]

const cropArg = process.argv.find((a) => a.startsWith('--crop='))
const maxArg = process.argv.find((a) => a.startsWith('--max='))
const maxWidth = maxArg ? Number(maxArg.split('=')[1]) : 720

// A halvány külső derengést nullára húzza, mielőtt a levágás futna. Enélkül a
// trim ott vág, ahol az alfa még 2–5, és marad egy látható egyenes perem.
const floorArg = process.argv.find((a) => a.startsWith('--floor='))
const floor = floorArg ? Number(floorArg.split('=')[1]) : 0

const trimArg = process.argv.find((a) => a.startsWith('--trim='))
const trimThreshold = trimArg ? Number(trimArg.split('=')[1]) : 1

let pipeline = sharp(input)
if (cropArg) {
  const [top, height] = cropArg.split('=')[1].split(',').map(Number)
  const meta = await sharp(input).metadata()
  pipeline = sharp(input).extract({ left: 0, top, width: meta.width, height })
}

const { data, info } = await pipeline
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const { width, height, channels } = info
const out = Buffer.alloc(width * height * 4)

/**
 * Fehér háttér: NEM küszöböléssel, hanem a papír megkeresésével.
 *
 * A küszöbölés itt bukik el. A sziluett menti képpont a papír és a kő
 * keveréke; ha a küszöb átlátszatlanná teszi, a beleégett fehér is ott marad,
 * és 1-2 képpontos fehér gyűrű ül a tárgy körül. A visszafejtés sem menti meg,
 * mert teljes alfánál nincs mit visszaosztani.
 *
 * Ehelyett: a KÉP SZÉLÉRŐL indított öntéssel megkeressük az összefüggő papírt
 * (a tárgy belsejében lévő világos foltokat így nem lyukasztjuk ki), a maszkot
 * befelé húzzuk pár képponttal — pont annyival, amennyi a kevert gyűrű —, és
 * a friss peremet magunk lágyítjuk.
 */
function whiteAlpha() {
  const paper = new Uint8Array(width * height)
  const stack = []

  const looksLikePaper = (px) => {
    const i = px * channels
    const r = data[i], g = data[i + 1], b = data[i + 2]
    return Math.min(r, g, b) > paperMin && Math.max(r, g, b) - Math.min(r, g, b) < paperChroma
  }

  for (let x = 0; x < width; x++) {
    stack.push(x, (height - 1) * width + x)
  }
  for (let y = 0; y < height; y++) {
    stack.push(y * width, y * width + width - 1)
  }

  while (stack.length) {
    const px = stack.pop()
    if (paper[px] || !looksLikePaper(px)) continue
    paper[px] = 1
    const x = px % width, y = (px / width) | 0
    if (x > 0) stack.push(px - 1)
    if (x < width - 1) stack.push(px + 1)
    if (y > 0) stack.push(px - width)
    if (y < height - 1) stack.push(px + width)
  }

  // A tárgy: minden, amit az öntés nem ért el.
  let mask = new Float32Array(width * height)
  for (let i = 0; i < mask.length; i++) mask[i] = paper[i] ? 0 : 1

  // Erózió: a kevert gyűrű a tárgy legkülső pár képpontja. Ezt visszük el.
  for (let pass = 0; pass < shrink; pass++) {
    const next = new Float32Array(width * height)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x
        if (!mask[i]) continue
        const edge =
          x === 0 || y === 0 || x === width - 1 || y === height - 1 ||
          !mask[i - 1] || !mask[i + 1] || !mask[i - width] || !mask[i + width]
        next[i] = edge ? 0 : 1
      }
    }
    mask = next
  }

  // A tárgy BELSEJE: még beljebb húzott maszk. Ami ezen belül van, az biztosan
  // szilárd, és teljesen átlátszatlan marad — a fényes kristálycsúcsok nem
  // lyukadhatnak ki attól, hogy világosak.
  let inner = mask
  for (let pass = 0; pass < HALO_BAND; pass++) {
    const next = new Float32Array(width * height)
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = y * width + x
        if (!inner[i]) continue
        next[i] =
          inner[i - 1] && inner[i + 1] && inner[i - width] && inner[i + width] ? 1 : 0
      }
    }
    inner = next
  }

  // Lágyítás: 3×3 átlag, hogy a friss perem ne legyen fűrészes.
  const soft = new Float32Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0, n = 0
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= height) continue
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= width) continue
          sum += mask[yy * width + xx]
          n++
        }
      }
      soft[y * width + x] = sum / n
    }
  }

  // A peremsávban a fényesség dönt. A világító kövek körül ott van a saját
  // fénykoszorújuk: az öntés a majdnem-fehér derengésnél megáll, és ha azt
  // átlátszatlannak hagyjuk, fehér gyűrű ül a kő körül a sötét háttéren.
  // Derengésnek FÉLIG átlátszónak kell lennie — a színesség pedig megvédi a
  // telített zöld kristályt attól, hogy világossága miatt elhalványuljon.
  const out = new Float32Array(width * height)
  for (let i = 0, px = 0; px < width * height; px++, i += channels) {
    if (inner[px]) {
      out[px] = soft[px]
      continue
    }
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const mn = Math.min(r, g, b)
    const chroma = Math.max(r, g, b) - mn
    const fromDark = (PAPER - mn) / (PAPER - SOLID)
    const cover = Math.max(0, Math.min(1, Math.max(fromDark, chroma / 25)))
    out[px] = soft[px] * cover
  }
  return out
}

const whiteMask = bg === 'white' ? whiteAlpha() : null

for (let px = 0, i = 0, o = 0; px < width * height; px++, i += channels, o += 4) {
  const r = data[i]
  const g = data[i + 1]
  const b = data[i + 2]

  let a
  if (whiteMask) {
    a = whiteMask[px]
  } else {
    // Rec. 709 fényesség
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    // A színesség külön számít: egy sötét, de zöldes képpont még a kő része
    const chroma = Math.max(r, g, b) - Math.min(r, g, b)
    a = Math.max(0, Math.min(1, Math.max((luma - LO) / (HI - LO), chroma / 18)))
  }

  let alpha255 = a * 255
  if (floor > 0) alpha255 = Math.max(0, (alpha255 - floor) / (255 - floor)) * 255
  const alpha = Math.round(alpha255)

  // A megmaradt félig átlátszó peremben még van papír; azt visszafejtjük.
  // A megfigyelt szín `a·szín + (1-a)·255`.
  const unmat = (c) => {
    if (!whiteMask || alpha === 0) return c
    const av = alpha / 255
    if (av > 0.995 || av < 0.05) return c
    return Math.max(0, Math.min(255, Math.round((c - (1 - av) * 255) / av)))
  }

  // A teljesen átlátszó képpont SZÍNÉT is nullázni kell: a sharp `trim` a
  // sarokponthoz hasonlít, és a színt is nézi — ha ott marad a háttér RGB-je,
  // a levágás nem talál egyenletes keretet.
  out[o] = alpha === 0 ? 0 : unmat(r)
  out[o + 1] = alpha === 0 ? 0 : unmat(g)
  out[o + 2] = alpha === 0 ? 0 : unmat(b)
  out[o + 3] = alpha
}

// A felesleges átlátszó keretet levágjuk, és a megjelenítési méretre húzzuk —
// a forrás sokkal nagyobb, mint amekkorán valaha látszik.
await sharp(out, { raw: { width, height, channels: 4 } })
  .trim({ threshold: trimThreshold })
  .resize({ width: maxWidth, withoutEnlargement: true })
  // WebP alfával: ugyanaz a kép töredék méretben, és mindenhol támogatott,
  // ahol ez az app egyáltalán fut.
  .webp({ quality: 88, alphaQuality: 92, effort: 6 })
  .toFile(output)

const meta = await sharp(output).metadata()
console.log(`kész: ${output} — ${meta.width}×${meta.height}, alfacsatornával`)
