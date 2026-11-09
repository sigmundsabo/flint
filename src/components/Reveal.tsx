import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface RevealProps {
  children: ReactNode
  /** Késleltetés ms-ban — csoportos belépésnél ebből lesz a lépcsőzés. */
  delay?: number
  className?: string
}

/**
 * Csoportos belépés — a lap megnyitásakor, EGYSZER.
 *
 * Korábban görgetésre indult (IntersectionObserver), de az kizárólag
 * marketingfelületre való: egy napi használatú fülön az interfész folyton
 * újrajátssza magát, miközben az olvasó csak le akar görgetni.
 *
 * TISZTA CSS-ANIMÁCIÓ, nem JS-állapot. Két okból:
 *   1. A `requestAnimationFrame` nem fut, amíg a lap nem látható. Ha az app
 *      háttérben töltődik be (visszaállított munkamenet, PWA-indítás), egy
 *      rAF-re váró láthatóvá tétel VÉGLEG átlátszón hagyná a tartalmat.
 *   2. A CSS-animáció a főszálon kívül fut, tehát betöltés közben sem akad.
 *
 * A `prefers-reduced-motion` kezelése az index.css-ben van, ott az animáció
 * teljesen kikapcsol, és az elem azonnal a végállapotban látszik.
 */
export function Reveal({ children, delay = 0, className = '' }: RevealProps) {
  return (
    <div
      className={`reveal ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

/**
 * Számláló, ami a láthatóvá válástól számol fel a végértékig.
 *
 * Csak ott indokolt, ahol az érték tényleg NŐ a használattól — az edzés utáni
 * összsúlynál a felszámolás maga a visszajelzés. Puszta előzményszámon
 * dekoráció lenne, azt pedig egy naponta többször megnyitott felületen nem
 * érdemes eljátszani.
 */
export function CountUp({
  value, duration = 420, format,
}: { value: number; duration?: number; format?: (n: number) => string }) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState(reduced ? value : 0)
  const started = useRef(false)

  useEffect(() => {
    if (reduced) {
      setShown(value)
      return
    }
    const el = ref.current
    if (!el) return

    const run = () => {
      const start = performance.now()
      const from = 0
      let raf = 0
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        const eased = 1 - Math.pow(1 - t, 3)
        setShown(from + (value - from) * eased)
        if (t < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(raf)
    }

    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          run()
          io.unobserve(entry.target)
        }
      }
    })
    io.observe(el)
    return () => io.disconnect()
  }, [value, duration, reduced])

  const n = Math.round(shown)
  return <span ref={ref}>{format ? format(n) : n}</span>
}
