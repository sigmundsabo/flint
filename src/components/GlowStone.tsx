import { useEffect, useRef, useState } from 'react'
import { TiltStone } from './TiltStone'
import { stoneLevel, stoneSrc } from '@/domain/stone'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface GlowStoneProps {
  /** 0–100 — ennyire világít a kő fényudvara. */
  pct: number
  thresholdPct: number
  size?: number
}

/**
 * Igazat ad egy pillanatra, valahányszor NŐ a napi pontszám.
 *
 * Ettől szikrázik fel a kő, amikor kipipálsz valamit: a lista és a hérosz
 * összeér, nem két külön dolog lesz ugyanazon a lapon.
 */
function useScoreFlash(pct: number): boolean {
  const [flash, setFlash] = useState(false)
  const prev = useRef(pct)

  useEffect(() => {
    const rose = pct > prev.current
    prev.current = pct
    if (!rose) return
    setFlash(true)
    const t = setTimeout(() => setFlash(false), 110)
    return () => clearTimeout(t)
  }, [pct])

  return flash
}

/**
 * A LECSERÉLT kő képét tartja életben egy fél másodpercig.
 *
 * Fokozatváltáskor a hérosz teljes tárgya kicserélődik. Vágásban ez ugrás; a
 * két kép egymásra úsztatva viszont átalakulásnak látszik — ami pontosan az,
 * ami történt. A kiúszó példány nem fogad ujjat, hogy ne vegye el az eseményt
 * az érkezőtől.
 */
function useOutgoing(src: string | null): string | null {
  const [outgoing, setOutgoing] = useState<string | null>(null)
  const prev = useRef(src)

  useEffect(() => {
    if (prev.current && src && prev.current !== src) {
      setOutgoing(prev.current)
      const t = setTimeout(() => setOutgoing(null), 460)
      prev.current = src
      return () => clearTimeout(t)
    }
    prev.current = src
  }, [src])

  return outgoing
}

/**
 * A fokozat képe: `/stones/stone-N.webp`, és ha az hiányzik, a rajzolt kő.
 *
 * Volt közöttük egy harmadik lépcső, a `/stone.webp`. Az viszont BÁJTRA
 * UGYANAZ a kép volt, mint a `stone-9.webp` — 26 KB tiszta ismétlés, amit a
 * service worker is letöltött minden telepítéskor, és ami csak akkor került
 * volna sorra, ha pont a tíz fokozat hiányzik, ő meg megvan. Ilyen deploy
 * nincs: vagy a `stones/` mappa fölkerül, vagy nem.
 *
 * Fontos, hogy ez NEM előre ellenőrzi a képeket. A korábbi változat
 * `new Image()`-dzsel sorra próbálgatta a jelölteket, és amíg egyik sem jött
 * vissza, a hérosz közepén a RAJZOLT kő állt. Mivel a próba mindig tart egy
 * kicsit, a rajz minden indításnál felvillant — telefonon ez volt a hibajelzés
 * („betöltésnél ott a rajz"). Most az `<img>` azonnal a valódi képet kéri, és
 * csak a tényleges `onError` lép tovább a láncon.
 *
 * Az elbukott útvonalakat megjegyezzük: egy hiányzó fájlt nincs értelme minden
 * fokozatváltáskor újra kérni. Fokozatonként külön esélyt kap, mert a tíz kép
 * külön fájl — abból hiányozhat egy anélkül, hogy a többi gond lenne.
 */
function useStoneSrc(level: number): { src: string | null; onError: () => void } {
  const [dead, setDead] = useState<readonly string[]>([])

  const file = stoneSrc(level)
  const src = dead.includes(file) ? null : file

  const onError = () => {
    setDead((d) => (d.includes(file) ? d : [...d, file]))
  }

  return { src, onError }
}

/**
 * A fénylő kő — a barlang közepén lebegő kovakő.
 *
 * Nincs körülötte gyűrű: a forgó fénykoszorú elvonta a figyelmet a kőről, és a
 * barlang hasadékával is versengett. A haladást most maga a kő mutatja — a
 * fényudvara és a saját telítettsége erősödik a napi pontszámmal, a napi cél
 * elérésekor pedig kap egy halk többletfényt. A pontos érték amúgy is ott van
 * alatta számmal.
 *
 * A képek opcionálisak: `public/stones/stone-0…9.webp` (alfacsatornával, a
 * `scripts/make-stones.mjs` készíti egyetlen mesterképből). Ha hiányoznak,
 * rajzolt változat lép a helyükre.
 */
export function GlowStone({ pct, thresholdPct, size = 168 }: GlowStoneProps) {
  const reduced = useReducedMotion()
  const level = stoneLevel(pct)
  const { src: stone, onError } = useStoneSrc(level)
  const outgoing = useOutgoing(stone)

  const clamped = Math.max(0, Math.min(100, pct))
  const heat = clamped / 100
  const reached = clamped >= thresholdPct
  const flash = useScoreFlash(clamped)
  // A doboz mérete marad, hiába tűnt el a gyűrű: ez tartja a helyén a alatta
  // lévő tartalmat, a felszabaduló helyet pedig a barlang tölti ki.
  const box = Math.round(size * 1.78)
  // A kő MAGASSÁGÁT rögzítjük, a szélességet a kép aránya hozza. Így a hérosz
  // függőleges helyigénye állandó marad akkor is, ha fekvőről álló kőre
  // váltunk — a pontszám alatta nem ugrik.
  //
  // A szorzó 0,76-ról 0,85-re nőtt az új kővel együtt: a szabad formájú opál
  // keskenyebb a korábbi tojásnál, és azonos magasságon elveszett a barlang
  // terében. A DOBOZ mérete (`box`) nem változott, tehát a lap elrendezése
  // sem — csak a kő tölti ki jobban a helyét.
  //
  // A szám azért nem több, mert az új képek SZOROSABBAN vannak levágva: a kő
  // kitölti a képkockát, míg a régin volt körülötte üres sáv. A kettő együtt
  // adja ki a kb. harmadával nagyobb megjelenést.
  const stoneHeight = Math.round(size * 0.85)
  // A hérosz egésze — fényudvar, fénykiömlés, kő — feljebb csúszik, a hasadék
  // világosabb, szélesebb szakaszába. Transformmal, nem margóval: így csak a
  // látvány mozdul, a doboz helyigénye marad, és a pontszám nem ugrik alatta.
  const drop = -Math.round(size * 0.1)

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: box, height: box, transform: `translateY(${drop}px)` }}
      role="img"
      aria-label={`Napi pontszám: ${clamped} százalék`}
    >
      {/* fényudvar — a nap teljesülésével erősödik */}
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-full"
        style={{
          width: box * 0.86,
          height: box * 0.86,
          // A kő SAJÁT smaragdja, nem egy általános mentazöld: az Opalnál is a
          // gem színe úszik szét a barlangon, ettől tartozik össze a kettő.
          background:
            'radial-gradient(circle, rgba(74,222,146,0.42), rgba(120,210,190,0.12) 46%, transparent 72%)',
          filter: 'blur(32px)',
          // A 32 pixeles elmosás drága menet. `will-change` nélkül a böngésző
          // minden képkockán ÚJRA elvégzi, mert az elem közben nagyítva van
          // animálva; ezzel egyszer rasztereződik, és a lélegzés onnantól
          // tiszta kompozitálás. Látványban nincs különbség, a telefon
          // viszont nem futtatja folyamatosan a GPU-t a háttérben.
          willChange: reduced ? undefined : 'transform, opacity',
          opacity: 0.12 + heat * 0.48 + (reached ? 0.12 : 0) + (flash ? 0.34 : 0),
          // Aszimmetrikus: felkap gyorsan, visszahal lassan — így olvassuk
          // szikrának. Átmenet, nem keyframe, hogy több gyors pipánál ne
          // induljon újra nulláról, hanem az aktuális értékről forduljon.
          transition: flash
            ? 'opacity 110ms var(--ease-out)'
            : 'opacity 760ms var(--ease-out)',
          animation: reduced ? undefined : 'stone-breathe 6.5s ease-in-out infinite',
        }}
      />

      {/* Fénykiömlés a kő alatt. Az Opalnál a gem fénye rávetül a sziklára,
          amin áll — ez teszi oda a térbe. A miénk lebeg, de a hasadék falára
          ugyanígy rá kell festenie a fényét, különben kivágott matrica marad. */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          width: box * 0.78,
          height: box * 0.26,
          top: '58%',
          background:
            'radial-gradient(closest-side, rgba(74,222,146,0.5), rgba(60,190,150,0.14) 55%, transparent 78%)',
          filter: 'blur(26px)',
          willChange: 'opacity',
          opacity: 0.08 + heat * 0.44 + (flash ? 0.26 : 0),
          transition: flash
            ? 'opacity 110ms var(--ease-out)'
            : 'opacity 760ms var(--ease-out)',
        }}
      />

      {/* maga a kő */}
      <div
        className="relative grid place-items-center"
        style={{
          height: stoneHeight,
          willChange: reduced ? undefined : 'transform',
          animation: reduced ? undefined : 'stone-float 9s ease-in-out infinite',
        }}
      >
        {outgoing ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 grid place-items-center"
            style={{ animation: 'stone-swap-out 460ms var(--ease-out) forwards' }}
          >
            <TiltStone
              src={outgoing}
              height={stoneHeight}
              heat={heat}
              filter={stoneFilter(heat)}
            />
          </div>
        ) : null}

        {stone ? (
          <TiltStone
            src={stone}
            height={stoneHeight}
            heat={heat}
            filter={stoneFilter(heat)}
            onError={onError}
          />
        ) : (
          <div style={{ width: stoneHeight, height: stoneHeight }}>
            <DrawnStone heat={heat} reduced={reduced} />
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * A kő képszűrője a nap teljesültségéből.
 *
 * Van tartománya, hogy a haladás látsszon, de a padló magasabb, mint a régi
 * kőnél: ennek nagy, lágy zöld magja van, amit az erős sötétítés kiolt — üres
 * napon is látszania kell, hogy ez egy zöld szívű kő, csak halkabban.
 */
function stoneFilter(heat: number): string {
  return (
    `saturate(${0.66 + heat * 0.56}) brightness(${0.64 + heat * 0.46}) ` +
    `drop-shadow(0 0 30px rgba(96,226,158,${0.16 + heat * 0.34})) ` +
    `drop-shadow(0 12px 26px rgba(0,0,0,0.75))`
  )
}

/** Rajzolt tartalék: irizáló gömb, ha nincs generált kép. */
function DrawnStone({ heat, reduced }: { heat: number; reduced: boolean }) {
  const iridescent =
    'conic-gradient(from 0deg, #ffd9a8 0deg, #b6ffe4 52deg, #8fd4ff 104deg, ' +
    '#c3b4ff 156deg, #ffb8dd 208deg, #ffe9a8 260deg, #9dffd2 312deg, #ffd9a8 360deg)'

  return (
    <div
      className="relative size-full overflow-hidden rounded-full"
      style={{
        background: 'radial-gradient(105% 92% at 34% 26%, #46504e 0%, #232b2a 46%, #0c1211 100%)',
        boxShadow: `inset 0 2px 2px rgba(255,255,255,0.2),
                    inset 0 -18px 34px rgba(0,0,0,0.8),
                    0 22px 46px -18px rgba(0,0,0,0.95)`,
      }}
    >
      <div
        className="absolute"
        style={{
          inset: '-26%',
          background: iridescent,
          filter: 'blur(11px)',
          opacity: 0.42 + heat * 0.36,
          mixBlendMode: 'screen',
          animation: reduced ? undefined : 'stone-fire 26s linear infinite',
        }}
      />
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(78% 70% at 36% 28%, transparent 22%, rgba(6,10,10,0.5) 68%, rgba(3,6,6,0.92) 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(26% 22% at 44% 42%, rgba(235,255,250,${0.3 + heat * 0.4}), transparent 70%)`,
          filter: 'blur(7px)',
          animation: reduced ? undefined : 'stone-breathe 5s ease-in-out infinite',
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(24% 16% at 32% 18%, rgba(255,255,255,0.42), transparent 62%)' }}
      />
    </div>
  )
}
