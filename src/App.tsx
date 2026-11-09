import { AnimatePresence, motion } from 'motion/react'
import { Suspense, lazy, useRef } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { ACCENT_BY_PATH, BottomNav, TABS } from '@/components/BottomNav'
import { AuthGate } from '@/components/AuthGate'
import { LaunchScreen } from '@/components/LaunchScreen'
import { SvgDefs } from '@/components/SvgDefs'
import { ToastProvider } from '@/components/Toast'
import { DataProvider, useAppData } from '@/hooks/useAppData'
import { SelectedDateProvider } from '@/hooks/useSelectedDate'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { MaPage } from '@/pages/MaPage'
import { EdzesPage } from '@/pages/EdzesPage'
import { SzokasokPage } from '@/pages/SzokasokPage'

// A diagramkönyvtárat (recharts) csak az azt használó fülek húzzák be, hogy a
// belépőképernyő ne fizessen érte. A Beállítások is külön darab.
const EgeszsegPage = lazy(() =>
  import('@/pages/EgeszsegPage').then((m) => ({ default: m.EgeszsegPage })))
const TrendekPage = lazy(() =>
  import('@/pages/TrendekPage').then((m) => ({ default: m.TrendekPage })))
const BeallitasokPage = lazy(() =>
  import('@/pages/BeallitasokPage').then((m) => ({ default: m.BeallitasokPage })))
const EdzesSessionPage = lazy(() =>
  import('@/pages/EdzesSessionPage').then((m) => ({ default: m.EdzesSessionPage })))

/* --------------------------------------------------------------------------
   Fülváltás animációja. Az irány a fülek sorrendjéből jön: jobbra lépés
   jobbról úszik be, balra lépés balról — ettől lesz térbeli folytonosság
   (60fps.design: shared spatial continuity).
   -------------------------------------------------------------------------- */
const ORDER = [...TABS.map((t) => t.to), '/beallitasok']

function RoutedPages() {
  const location = useLocation()
  const reduced = useReducedMotion()
  const prevIndex = useRef(0)

  const index = ORDER.indexOf(location.pathname)
  const direction = index >= 0 && index < prevIndex.current ? -1 : 1
  if (index >= 0) prevIndex.current = index

  // Teljes transform-string a x/scale/rotateY shorthandek helyett — azok nem
  // hardveresen gyorsítottak, és terhelés alatt akadnak.
  const enter = reduced
    ? { opacity: 0 }
    : { opacity: 0, transform: `translateX(${direction * 26}px) scale(0.988) rotateY(${direction * 2.5}deg)` }
  const center = reduced
    ? { opacity: 1 }
    : { opacity: 1, transform: 'translateX(0px) scale(1) rotateY(0deg)' }
  const exit = reduced
    ? { opacity: 0 }
    : { opacity: 0, transform: `translateX(${direction * -18}px) scale(0.99) rotateY(${direction * -1.5}deg)` }

  return (
    <div style={{ perspective: 1400 }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          data-accent={ACCENT_BY_PATH[location.pathname] ?? 'mint'}
          initial={enter}
          animate={center}
          exit={exit}
          transition={{ duration: reduced ? 0.01 : 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: '50% 40%' }}
        >
          {/* A gradiensek itt élnek, nem a gyökérben: így a `data-accent`
              hatókörébe esnek, és a diagramok is a fül színét veszik fel. */}
          <SvgDefs />
          <Suspense fallback={<PageFallback />}>
          <Routes location={location}>
            <Route path="/" element={<MaPage />} />
            <Route path="/egeszseg" element={<EgeszsegPage />} />
            <Route path="/edzes" element={<EdzesPage />} />
            <Route path="/edzes/:dayId" element={<EdzesSessionPage />} />
            <Route path="/szokasok" element={<SzokasokPage />} />
            <Route path="/trendek" element={<TrendekPage />} />
            <Route path="/beallitasok" element={<BeallitasokPage />} />
            <Route path="*" element={<MaPage />} />
          </Routes>
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/** Helyfoglaló a lusta oldalaknak — a magasság előre le van foglalva, hogy ne ugorjon a layout. */
function PageFallback() {
  return (
    <div className="grid min-h-[70dvh] place-items-center">
      <div className="size-8 animate-spin rounded-full border-2 border-white/12 border-t-[var(--color-mint)]" />
    </div>
  )
}

function LoadedApp() {
  const { loading, error } = useAppData()
  const isSession = useLocation().pathname.startsWith('/edzes/')

  if (loading) return <LaunchScreen />

  if (error) {
    return (
      <div className="grid min-h-dvh place-items-center px-6">
        <div className="glass max-w-sm p-5 text-center">
          <p className="mb-1.5 font-semibold">Nem sikerült betölteni az adatokat</p>
          <p className="text-[13.5px] text-ink-soft">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <SelectedDateProvider>
      <main className="min-h-dvh">
        <RoutedPages />
      </main>
      {/* Az edzés-munkamenetnek saját alsó sávja van (időzítő + befejezés),
          a fülsáv ott csak ütközne vele. */}
      {!isSession ? <BottomNav /> : null}
    </SelectedDateProvider>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthGate>
        <DataProvider>
          <LoadedApp />
        </DataProvider>
      </AuthGate>
    </ToastProvider>
  )
}
