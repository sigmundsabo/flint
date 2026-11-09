import { useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

/** Meddig dőlhet el a kő, fokban. Ennél többtől kilátszik, hogy lapos kép. */
const MAX_TILT = 13

interface TiltStoneProps {
  src: string
  /** A kő MAGASSÁGA — a szélességet a kép aránya adja.
   *
   *  Azért a magasság a rögzített méret, mert a hérosz függőlegesen szűkös: a
   *  kő alatt közvetlenül a napi pontszám következik. Így a kép arányától
   *  függetlenül ugyanannyi helyet foglal, akár fekvő, akár álló követ teszünk
   *  be — a szélesség meg úgyis van hová nőjön. */
  height: number
  /** A pontszámból számolt kép-szűrő (telítettség, fényerő, árnyékok). */
  filter: string
  /** 0–1, a nap teljesültsége. Ettől erősödik a csillanás. */
  heat: number
  /** A kép betöltése elbukott — a hívó léphet a következő tartalékra. */
  onError?: () => void
}

/**
 * A kő térbeli megdöntése — ettől olvassuk szilárd testnek, nem matricának.
 *
 * Két réteg dolgozik együtt:
 *
 * - A tétlen, lassú forgás CSS-animáció. A fő szálon kívül fut, így akkor sem
 *   akad meg, amikor az app épp adatot tölt — és nem `requestAnimationFrame`,
 *   ami háttérbe került lapon egyszerűen nem tüzel.
 * - Az ujjra/egérre válaszoló döntés Motion-rugó. Gesztusnál ez a helyes
 *   eszköz: megszakításkor átviszi a lendületet, nem ugrik vissza nullára.
 *
 * A csillanás a döntéssel ELLENTÉTES irányba csúszik, és a kő sziluettjére van
 * maszkolva. Ez a mozgás adja a mélységet — egy együtt mozgó fényfolt csak
 * ráragasztott fóliának látszana.
 */
export function TiltStone({ src, height, filter, heat, onError }: TiltStoneProps) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  // A kép halkan beúszik, amikor megjött. Enélkül fokozatváltáskor az új kő
  // egy képkockán „bepattanna" a kiúszó régi mellé, ami vágásnak látszik.
  const [loaded, setLoaded] = useState(false)

  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  // Nincs pattogás: ez egy kődarab. A bounce gumiszerűvé tenné.
  const spring = { stiffness: 150, damping: 18, mass: 0.7 }
  const sx = useSpring(rx, spring)
  const sy = useSpring(ry, spring)

  const transform = useTransform<number, string>(
    [sx, sy],
    ([x, y]) => `rotateX(${x}deg) rotateY(${y}deg)`,
  )
  const glare = useTransform<number, string>(
    [sx, sy],
    ([x, y]) => `translate3d(${y * -1.7}%, ${x * 1.7}%, 0)`,
  )

  function tilt(e: React.PointerEvent<HTMLDivElement>) {
    if (reduced) return
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * MAX_TILT * 2)
    ry.set(((e.clientX - r.left) / r.width - 0.5) * MAX_TILT * 2)
  }

  function rest() {
    rx.set(0)
    ry.set(0)
  }

  return (
    <div
      ref={ref}
      onPointerMove={tilt}
      onPointerLeave={rest}
      onPointerUp={rest}
      onPointerCancel={rest}
      // `pan-y`: a kövön húzva is lehessen görgetni a lapot. Enélkül a hüvelykujj
      // beleakadna a hérobba, és a lista nem indulna el alatta.
      style={{ height, perspective: 760, touchAction: 'pan-y' }}
      // `w-fit`: a doboz a képre zsugorodik, így a döntés a KŐ közepe körül
      // fordul, nem a sáv közepe körül, amiben ül.
      className="relative w-fit"
    >
      <div
        className="h-full"
        style={{
          transformStyle: 'preserve-3d',
          animation: reduced ? undefined : 'stone-turn 17s ease-in-out infinite',
        }}
      >
        <motion.div className="h-full" style={{ transform, transformStyle: 'preserve-3d' }}>
          <img
            src={src}
            alt=""
            draggable={false}
            // A kő a hérosz tárgya: a böngésző ne hagyja a sor végére.
            fetchPriority="high"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={onError}
            className="h-full w-auto select-none"
            style={{
              filter,
              opacity: loaded ? 1 : 0,
              transition: 'filter 700ms var(--ease-out), opacity 180ms var(--ease-out)',
            }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              transform: glare,
              // A kő alfacsatornája vágja ki a fényfoltot, így nem lóg túl a
              // sziluetten, és nem kell hozzá külön maszkkép.
              maskImage: `url(${src})`,
              WebkitMaskImage: `url(${src})`,
              maskSize: '100% 100%',
              WebkitMaskSize: '100% 100%',
              background:
                'radial-gradient(42% 48% at 36% 28%, rgba(226,255,246,0.55), rgba(180,240,225,0.14) 52%, transparent 76%)',
              mixBlendMode: 'screen',
              opacity: 0.22 + heat * 0.45,
              transition: 'opacity 700ms var(--ease-out)',
            }}
          />
        </motion.div>
      </div>
    </div>
  )
}
