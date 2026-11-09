import { Suspense, lazy } from 'react'
import type { MuscleRadarProps } from './MuscleRadar'

/**
 * A pókhálódiagram KÉSLELTETVE töltődik.
 *
 * A diagramkönyvtár (recharts) a kezdő csomagot 420 kB-ról 713 kB-ra hizlalta
 * (gzip: +89 kB), mert az Edzés fül nincs külön útvonal-darabban. Ez minden
 * hideg indításkor letöltendő és értelmezendő kód lett volna — telefonon,
 * mobilneten, azért a grafikonért, ami a fül közepén van. Külön darabban
 * viszont csak akkor jön le, amikor tényleg kirajzoljuk.
 *
 * A várakozó doboz pontosan akkora, mint a diagram, hogy a lap ne ugorjon meg
 * betöltéskor.
 */
const Chart = lazy(() => import('./MuscleRadar').then((m) => ({ default: m.MuscleRadar })))

export function MuscleRadar(props: MuscleRadarProps) {
  return (
    <Suspense fallback={<div style={{ height: props.height ?? 260 }} aria-hidden />}>
      <Chart {...props} />
    </Suspense>
  )
}
