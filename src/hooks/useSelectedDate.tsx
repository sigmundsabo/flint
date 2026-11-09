import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useAppData } from './useAppData'
import { toDateKey } from '@/lib/date'

/**
 * A kiválasztott nap fülváltáskor megmarad — így a "tegnapot pótolom"
 * munkamenet nem szakad meg, ha átlépsz a Ma fülről az Egészségre.
 */
interface SelectedDateApi {
  dateKey: string
  setDateKey: (key: string) => void
}

const SelectedDateContext = createContext<SelectedDateApi | null>(null)

export function SelectedDateProvider({ children }: { children: ReactNode }) {
  const [dateKey, setRaw] = useState(() => toDateKey())
  const { ensureWindow } = useAppData()

  const value = useMemo<SelectedDateApi>(
    () => ({
      dateKey,
      setDateKey: (key) => {
        setRaw(key)
        void ensureWindow(key)
      },
    }),
    [dateKey, ensureWindow],
  )

  return <SelectedDateContext.Provider value={value}>{children}</SelectedDateContext.Provider>
}

export function useSelectedDate(): SelectedDateApi {
  const ctx = useContext(SelectedDateContext)
  if (!ctx) throw new Error('useSelectedDate csak SelectedDateProvider-en belül használható')
  return ctx
}
