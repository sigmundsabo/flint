/**
 * Képgenerálás és képszerkesztés a Gemini API-val, terminálból.
 *
 * Miért külön szkript, és nem a böngésző: a tíz kőfokozatnak SOROZATNAK kell
 * lennie. Egy hős képet generálunk, a többi kilenc pedig abból SZERKESZTÉSSEL
 * származik (`--image`), hogy ugyanaz a kő, ugyanaz a nézet, ugyanaz a fény
 * maradjon. Ez a kattintgatós felületen türelemjáték, parancssorból viszont
 * egy ciklus.
 *
 * A KULCS SOHA NEM KERÜL A PARANCSBA. A szkript a környezeti változóból vagy
 * a `~/.config/flint/gemini.env` fájlból olvassa, és sehol nem írja ki — így
 * nem kerül bele a shell előzményébe, a képernyőképekbe és a beszélgetésbe
 * sem. A hívás `x-goog-api-key` fejlécben megy, nem URL-paraméterben: a
 * query string naplózódhat, a fejléc nem.
 *
 * Használat:
 *   node scripts/gemini-image.mjs --check
 *   node scripts/gemini-image.mjs -p "..." -o public/stones/hero.png
 *   node scripts/gemini-image.mjs -p "..." -i hero.png -o lepes-3.png
 *   node scripts/gemini-image.mjs -p "..." -o proba.png -n 4
 *
 * Kapcsolók:
 *   -p, --prompt   a leírás (kötelező, ha nem --check)
 *   -o, --out      kimeneti fájl (alap: out.png). Több képnél -1, -2 … utótag.
 *   -i, --image    bemeneti kép a szerkesztéshez; többször is megadható
 *   -m, --model    alap: gemini-3.1-flash-lite-image (ez az ingyenes szinten is fut)
 *   -n, --count    hány változat készüljön egymás után (alap: 1)
 *       --aspect   képarány, pl. 1:1, 3:4, 16:9 (csak ha a modell támogatja)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, extname, join } from 'node:path'

const API = 'https://generativelanguage.googleapis.com/v1beta'
const DEFAULT_MODEL = 'gemini-3.1-flash-lite-image'

const args = parseArgs(process.argv.slice(2))
const apiKey = loadKey()

if (args.check) {
  await check()
} else {
  if (!args.prompt) fail('Hiányzik a -p "leírás".')
  const count = Number(args.count ?? 1)
  for (let i = 1; i <= count; i++) {
    const out = count === 1 ? (args.out ?? 'out.png') : numbered(args.out ?? 'out.png', i)
    await generate(out)
  }
}

/* ------------------------------------------------------------------ */

async function generate(outPath) {
  const parts = [{ text: args.prompt }]
  for (const file of args.image ?? []) {
    parts.push({
      inlineData: { mimeType: mimeOf(file), data: readFileSync(file).toString('base64') },
    })
  }

  const body = { contents: [{ role: 'user', parts }] }
  if (args.aspect) body.generationConfig = { imageConfig: { aspectRatio: args.aspect } }

  const model = args.model ?? DEFAULT_MODEL
  const res = await fetch(`${API}/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  if (!res.ok) {
    // A hibatörzs megmondja, mi a baj (kvóta, ismeretlen modell, fizetős szint),
    // ezért kiírjuk — a kulcsot nem tartalmazza.
    fail(`A kérés elbukott (HTTP ${res.status}):\n${text}`)
  }

  const json = JSON.parse(text)
  const out = json.candidates?.[0]?.content?.parts ?? []
  const images = out.filter((p) => p.inlineData?.data)
  const notes = out.filter((p) => p.text).map((p) => p.text.trim()).filter(Boolean)

  if (images.length === 0) {
    fail(`A válasz nem tartalmaz képet.${notes.length ? `\nA modell üzenete: ${notes.join(' ')}` : ''}\n${text.slice(0, 600)}`)
  }

  writeFileSync(outPath, Buffer.from(images[0].inlineData.data, 'base64'))
  const kb = (Buffer.byteLength(images[0].inlineData.data, 'base64') / 1024).toFixed(0)
  console.log(`kész: ${outPath} (${kb} KB, ${model})`)
  if (notes.length) console.log(`megjegyzés a modelltől: ${notes.join(' ')}`)
}

async function check() {
  const res = await fetch(`${API}/models`, { headers: { 'x-goog-api-key': apiKey } })
  const text = await res.text()
  if (!res.ok) fail(`A kulcs nem működik (HTTP ${res.status}):\n${text}`)

  const models = JSON.parse(text).models ?? []
  const images = models
    .map((m) => m.name.replace('models/', ''))
    .filter((n) => n.includes('image') || n.includes('imagen'))
  console.log(`A kulcs működik. ${models.length} modell érhető el.`)
  console.log('Képmodellek:')
  for (const n of images) console.log(`  ${n}${n === DEFAULT_MODEL ? '   ← az alapértelmezett' : ''}`)
  if (!images.includes(DEFAULT_MODEL)) {
    console.log(`\nFigyelem: a(z) ${DEFAULT_MODEL} nincs a listában — a -m kapcsolóval adj meg másikat.`)
  }
}

/** A kulcs: környezeti változó, különben a ~/.config/flint/gemini.env fájl. */
function loadKey() {
  const fromEnv = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (fromEnv) return fromEnv.trim()

  const path = join(homedir(), '.config', 'flint', 'gemini.env')
  try {
    const line = readFileSync(path, 'utf8')
      .split('\n')
      .find((l) => l.startsWith('GEMINI_API_KEY='))
    if (line) return line.slice('GEMINI_API_KEY='.length).trim().replace(/^["']|["']$/g, '')
  } catch {
    /* nincs fájl — lentebb elmagyarázzuk, mit tegyen */
  }
  fail(
    'Nincs API-kulcs.\n' +
      'Hozz egyet a https://aistudio.google.com/apikey oldalon, majd mentsd el:\n' +
      '  mkdir -p ~/.config/flint && read -rs "k?Gemini API kulcs: " && printf \'GEMINI_API_KEY=%s\\n\' "$k" > ~/.config/flint/gemini.env && chmod 600 ~/.config/flint/gemini.env && unset k',
  )
}

function mimeOf(file) {
  const ext = extname(file).toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'
  return 'image/png'
}

function numbered(path, i) {
  const ext = extname(path)
  return path.slice(0, path.length - ext.length) + `-${i}` + ext
}

function parseArgs(argv) {
  const out = { image: [] }
  const alias = { p: 'prompt', o: 'out', i: 'image', m: 'model', n: 'count' }
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i]
    if (!raw.startsWith('-')) continue
    const name = alias[raw.replace(/^-+/, '')] ?? raw.replace(/^-+/, '')
    if (name === 'check') { out.check = true; continue }
    const value = argv[++i]
    if (value === undefined) fail(`A ${raw} kapcsolóhoz hiányzik az érték.`)
    if (name === 'image') out.image.push(value)
    else out[name] = value
  }
  return out
}

function fail(message) {
  console.error(message)
  process.exit(1)
}
