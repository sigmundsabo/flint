/**
 * Rezgés-visszajelzés. iOS Safari nem támogatja a Vibration API-t, ezért ez
 * ott csendben nem csinál semmit — a vizuális visszajelzés sosem támaszkodhat rá.
 */
type Pattern = 'tick' | 'success' | 'warning' | 'heavy'

const PATTERNS: Record<Pattern, number | number[]> = {
  tick: 8,
  success: [12, 40, 18],
  warning: [22, 60, 22],
  heavy: 32,
}

export function haptic(pattern: Pattern = 'tick'): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  try {
    navigator.vibrate(PATTERNS[pattern])
  } catch {
    /* nem kritikus */
  }
}
