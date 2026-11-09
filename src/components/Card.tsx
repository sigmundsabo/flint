import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Egy fokkal világosabb lap — beágyazott vagy kiemelt tartalomhoz. */
  raised?: boolean
  padded?: boolean
}

/**
 * Az Opal kártyái tömör, nagyon sötét lapok hajszálvékony peremmel — nem
 * áttetsző, elmosott "üveg". A mélységet a fekete háttér és a perem adja.
 */
export function Card({ children, raised, padded = true, className = '', ...rest }: CardProps) {
  return (
    <div
      className={[
        raised ? 'card-2' : 'glass',
        'rounded-[var(--radius-card)]',
        padded ? 'p-4' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
}

/** Szekciócím — az Opal mondatkezdő félkövér fejléceinek megfelelően. */
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-3 px-0.5">
      <h2 className="display text-[17px]">{children}</h2>
      {action}
    </div>
  )
}
