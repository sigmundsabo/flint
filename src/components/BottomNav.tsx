import { motion } from 'motion/react'
import { NavLink } from 'react-router-dom'
import { Icon } from './Icon'
import { haptic } from '@/hooks/useHaptics'
import { useReducedMotion } from '@/hooks/useReducedMotion'

/**
 * Minden fül a kék→zöld sáv egy másik pontját kapja, hogy ne ugyanaz a szín
 * menjen végig az egész appon. Az `accent` az `[data-accent]` szabályokat
 * kapcsolja (index.css), a `hex` pedig a navigáció aktív ikonját színezi —
 * ott ugyanis a lap saját akcentusa még nem érvényes.
 */
export const TABS = [
  { to: '/', label: 'Ma', icon: 'house', accent: 'mint', hex: '#b8fff0' },
  { to: '/egeszseg', label: 'Egészség', icon: 'heart', accent: 'teal', hex: '#a6f3ff' },
  { to: '/edzes', label: 'Edzés', icon: 'dumbbell', accent: 'sky', hex: '#aadcff' },
  { to: '/szokasok', label: 'Szokások', icon: 'list-checks', accent: 'lime', hex: '#dcffb4' },
  { to: '/trendek', label: 'Trendek', icon: 'trending-up', accent: 'azure', hex: '#b6c6ff' },
] as const

export const ACCENT_BY_PATH: Record<string, string> = {
  ...Object.fromEntries(TABS.map((t) => [t.to, t.accent])),
  '/beallitasok': 'mint',
}

/**
 * Lebegő kapszula-navigáció — az Opal alsó sávjának a formája: nem teljes
 * szélességű, tömör sáv, hanem egy elmosott hátterű pill, ami fölött a
 * tartalom átúszik. Az aktív korong nem ki-be úszik fülenként, hanem ÁTCSÚSZIK
 * a megnyomott fülre: így megmutatja, merre mozdultál, nem csak azt, hogy hol
 * vagy. Rugóval, mert azt félbe lehet szakítani — gyors fülváltásnál nem kezd
 * újra, hanem elfordul menet közben.
 */
export function BottomNav() {
  const reduced = useReducedMotion()

  return (
    <nav
      aria-label="Fő navigáció"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-safe"
    >
      <ul className="floating pointer-events-auto mx-4 mb-1 flex w-full max-w-[400px] items-center gap-0.5 rounded-[var(--radius-pill)] p-1.5">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.to === '/'}
              onClick={() => haptic('tick')}
              className="relative flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-[var(--radius-pill)] py-1.5"
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <motion.span
                      aria-hidden
                      // Csökkentett mozgás mellett nincs `layoutId`: a korong
                      // ott jelenik meg, ahol kell, csúszás nélkül.
                      layoutId={reduced ? undefined : 'nav-pill'}
                      className="absolute inset-0 rounded-[var(--radius-pill)]"
                      style={{
                        background: `${tab.hex}1a`,
                        boxShadow: `inset 0 0 0 1px ${tab.hex}2e`,
                      }}
                      transition={{ type: 'spring', duration: 0.32, bounce: 0.12 }}
                    />
                  ) : null}
                  <Icon
                    name={tab.icon}
                    size={20}
                    className="relative"
                    style={{
                      color: isActive ? tab.hex : 'var(--color-ink-faint)',
                      transition:
                        'color 220ms var(--ease-in-out), transform 280ms var(--ease-out)',
                      transform: isActive ? 'translateY(-1px)' : 'none',
                    }}
                  />
                  <span
                    className="relative text-[10px] font-medium"
                    style={{
                      color: isActive ? 'var(--color-ink)' : 'var(--color-ink-faint)',
                      transition: 'color 220ms var(--ease-in-out)',
                    }}
                  >
                    {tab.label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
