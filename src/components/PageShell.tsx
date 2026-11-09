import type { ReactNode } from 'react'

interface PageShellProps {
  title: string
  subtitle?: string
  action?: ReactNode
  /** A fejléc helyett teljesen egyedi tartalom (pl. a Ma fül dátumnavigációja). */
  header?: ReactNode
  /** Teljes szélességű háttérréteg a tartalom mögé (barlang-háttér). */
  backdrop?: ReactNode
  children: ReactNode
}

export function PageShell({ title, subtitle, action, header, backdrop, children }: PageShellProps) {
  return (
    <div className="relative">
      {backdrop}
      <div className="relative z-1 mx-auto w-full max-w-lg px-4 pt-safe">
        {header ?? (
          <header className="flex items-start justify-between gap-3 pt-3 pb-4">
            <div>
              <h1 className="display text-[30px]">{title}</h1>
              {subtitle ? <p className="mt-0.5 text-[14px] text-ink-soft">{subtitle}</p> : null}
            </div>
            {action}
          </header>
        )}
      {/* alul hely a lebegő navigációnak, hogy ne takarjon tartalmat */}
        <div className="flex flex-col gap-6 pb-[calc(env(safe-area-inset-bottom)+104px)]">
          {children}
        </div>
      </div>
    </div>
  )
}

export function EmptyState({
  title, body, action,
}: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="glass flex flex-col items-center gap-2 rounded-[var(--radius-card)] px-5 py-8 text-center">
      <p className="text-[15px] font-semibold">{title}</p>
      <p className="max-w-xs text-[13.5px] text-ink-soft">{body}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
