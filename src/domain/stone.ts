/** Hány fokozata van a kőnek. A 0. az üres nap, a 9. a teljes. */
export const STONE_LEVELS = 10

/**
 * A napi pontszámból a kő fokozata.
 *
 * SZÁZALÉKBÓL számol, nem a kipipált szokások darabszámából. Ma épp tíz szokás
 * számít bele, de a `frequency` mező tud `weekdays`/`weekends` is lenni, és a
 * lista bármikor bővül — a „hányadik a tízből" logika az első hétköznapi
 * szokásnál elromlana. A százalék ettől független.
 *
 * A nulla külön eset: üres napon a legnyersebb kő jár. Onnantól a maradék
 * kilenc fokozat egyenletesen osztja fel az 1–100 sávot, tehát már az első
 * kipipált szokás láthatóan előrébb visz.
 */
export function stoneLevel(pct: number): number {
  // A `Number.isFinite` nem túlbiztosítás: a `Math.min/max` a NaN-t továbbadja,
  // és abból hiányzó képfájl lenne — a kő egyszerűen eltűnne a lapról.
  const clamped = Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0
  if (clamped <= 0) return 0
  return Math.min(STONE_LEVELS - 1, Math.ceil((clamped / 100) * (STONE_LEVELS - 1)))
}

/** A fokozathoz tartozó kép útvonala. */
export function stoneSrc(level: number): string {
  return `/stones/stone-${level}.webp`
}
