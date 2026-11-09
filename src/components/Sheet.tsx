import { useCallback, useEffect, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Destruktív tartalomnál a háttér mély vörös izzást kap (Opal "Leave Early?"). */
  tone?: 'default' | 'danger'
  /**
   * Beíró laphoz: a fejléc gombja pipa lesz X helyett.
   *
   * Nem kozmetika. Az X azt üzeni, hogy eldobod, amit csináltál — miközben az
   * érték már el van mentve, és a koppintás valójában nyugtázás. Rögzítés után
   * tehát pipa jár, és csak akkor marad X, ha tényleg van mit elvetni (pl. a
   * mezőben hibás érték áll, amit nem mentettünk el).
   */
  confirm?: boolean
}

const SLIDE_MS = 500 // a fiók-recept értéke (Vaul)
const FADE_MS = 300

/**
 * Alsó lap.
 *
 * A be- és kicsúszás sima CSS-átmenet `translateY(100%)`-ról: a százalék az
 * elem SAJÁT magasságához mér, tehát nem kell futásidőben magasságot mérni, és
 * nem tud félúton megállni akkor sem, ha a tartalom közben átrendeződik.
 *
 * Az elhomályosított háttér nem dekoráció: azt jelzi, hogy a mögötte lévő
 * felület most nem interaktív, és egy koppintással elbocsátható.
 */
export function Sheet({ open, onClose, title, children, tone = 'default', confirm = false }: SheetProps) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  const [dragY, setDragY] = useState(0)
  const dragStart = useRef<number | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setMounted(true)
      setDragY(0)
      // két képkocka: az első a beillesztés, a második indítja az átmenetet
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
      return () => cancelAnimationFrame(raf)
    }
    setShown(false)
    const t = setTimeout(() => setMounted(false), SLIDE_MS)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!mounted) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [mounted, onClose])

  // Lehúzás a bezáráshoz — csak a fejlécről indítva, hogy ne akadjon össze a
  // tartalom görgetésével.
  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    dragStart.current = e.clientY
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStart.current === null) return
    setDragY(Math.max(0, e.clientY - dragStart.current))
  }, [])

  const onPointerUp = useCallback(() => {
    if (dragStart.current === null) return
    dragStart.current = null
    setDragY((y) => {
      if (y > 110) onClose()
      return 0
    })
  }, [onClose])

  if (!mounted) return null

  const dragging = dragStart.current !== null

  return createPortal(
    // Portál a <body>-ba: a fülváltás animációja transformot tesz a szülőre, és
    // egy transzformált ős a position:fixed-et a saját dobozához köti — a lap
    // különben a görgethető tartalom aljára csúszna, a képernyőn kívülre.
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Bezárás"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-md"
        style={{
          opacity: shown ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease`,
        }}
      />

      {tone === 'danger' ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[70vh]"
          style={{
            background: 'radial-gradient(70% 60% at 50% 100%, rgba(190,45,75,0.42), transparent 72%)',
            opacity: shown ? 1 : 0,
            transition: `opacity ${SLIDE_MS}ms var(--ease-out)`,
          }}
        />
      ) : null}

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="card-2 relative z-10 max-h-[88vh] w-full max-w-lg overflow-y-auto pb-safe"
        style={{
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          transform: shown ? `translateY(${dragY}px)` : 'translateY(100%)',
          // a fiók-görbe (Ionic/Vaul) — nem általános ease-out
          transition: dragging ? 'none' : `transform ${SLIDE_MS}ms var(--ease-drawer)`,
        }}
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="sticky top-0 z-10 flex touch-none items-center justify-between gap-3 border-b border-[var(--color-line)] bg-[rgba(19,19,24,0.78)] px-4 pt-4 pb-3 backdrop-blur-xl"
        >
          <span aria-hidden className="absolute inset-x-0 top-1.5 mx-auto h-1 w-10 rounded-full bg-white/22" />
          <h2 className="text-[17px] font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={confirm ? 'Kész' : 'Bezárás'}
            className="press grid size-11 shrink-0 place-items-center rounded-full transition-colors"
            style={
              confirm
                ? {
                    background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                    color: '#04251b',
                  }
                : { background: 'rgba(255,255,255,0.06)', color: 'var(--color-ink-soft)' }
            }
          >
            <Icon name={confirm ? 'check' : 'x'} size={19} strokeWidth={confirm ? 2.6 : 2} />
          </button>
        </div>
        <div className="px-4 pt-4 pb-6">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
