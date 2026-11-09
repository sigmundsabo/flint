import { AnimatePresence, motion } from 'motion/react'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

type ToastTone = 'info' | 'success' | 'error'

interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

interface ToastApi {
  show: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const TONE_ICON: Record<ToastTone, string> = {
  info: 'circle-alert',
  success: 'check',
  error: 'triangle-alert',
}

const TONE_COLOR: Record<ToastTone, string> = {
  info: 'var(--color-ink-soft)',
  success: 'var(--color-good)',
  error: 'var(--color-bad)',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const show = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = Date.now() + Math.random()
    setItems((prev) => [...prev, { id, message, tone }])
    // 4 mp — elég elolvasni, nem elég útban lenni
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  const api = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* aria-live: felolvasásra kerül, de NEM veszi el a fókuszt */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 84px)' }}
      >
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <motion.div
              key={t.id}
              /* Teljes transform-string, nem x/y/scale shorthand: azok nem
                 hardveresen gyorsítottak, és terhelés alatt képkockát ejtenek. */
              initial={{ opacity: 0, transform: 'translateY(14px) scale(0.96)' }}
              animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
              exit={{ opacity: 0, transform: 'translateY(8px) scale(0.98)' }}
              transition={{ type: 'spring', stiffness: 460, damping: 34 }}
              className="card-2 pointer-events-auto flex max-w-md items-center gap-2.5 px-4 py-3 text-[14px]"
            >
              <Icon name={TONE_ICON[t.tone]} size={17} style={{ color: TONE_COLOR[t.tone] }} />
              <span>{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast csak ToastProvider-en belül használható')
  return ctx
}
