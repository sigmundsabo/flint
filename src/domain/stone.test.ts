import { describe, expect, it } from 'vitest'
import { STONE_LEVELS, stoneLevel } from './stone'

describe('stoneLevel', () => {
  it('üres napon a legnyersebb kő jár', () => {
    expect(stoneLevel(0)).toBe(0)
  })

  it('már az első kipipált szokás átvisz a következő fokozatra', () => {
    // Tíz szokásból egy = 10%. Ha ez még a 0. fokozat lenne, a nap első
    // sikerének semmi látható következménye nem volna.
    expect(stoneLevel(10)).toBeGreaterThan(0)
  })

  it('a teljes nap a legfelső fokozat', () => {
    expect(stoneLevel(100)).toBe(STONE_LEVELS - 1)
  })

  it('monoton: több pont sosem ad alacsonyabb fokozatot', () => {
    let prev = -1
    for (let pct = 0; pct <= 100; pct++) {
      const level = stoneLevel(pct)
      expect(level).toBeGreaterThanOrEqual(prev)
      prev = level
    }
  })

  it('a sávon kívüli értékeket is kezeli, nem ad NaN-t vagy hiányzó fokozatot', () => {
    expect(stoneLevel(-30)).toBe(0)
    expect(stoneLevel(140)).toBe(STONE_LEVELS - 1)
    expect(stoneLevel(Number.NaN)).toBe(0)
  })

  it('minden fokozat elérhető — egyik kép sem marad használatlan', () => {
    const seen = new Set<number>()
    for (let pct = 0; pct <= 100; pct++) seen.add(stoneLevel(pct))
    expect(seen.size).toBe(STONE_LEVELS)
  })
})
