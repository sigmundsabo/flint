import { describe, it, expect } from 'vitest'
import { compareTimeToDeadline, minutesSinceNoon, parseTimeToMinutes } from './time'

describe('parseTimeToMinutes', () => {
  it('elfogadja a HH:MM és HH:MM:SS formát', () => {
    expect(parseTimeToMinutes('23:00')).toBe(1380)
    expect(parseTimeToMinutes('23:00:00')).toBe(1380)
    expect(parseTimeToMinutes('00:01')).toBe(1)
    expect(parseTimeToMinutes('7:05')).toBe(425)
  })

  it('null-t ad érvénytelen bemenetre', () => {
    expect(parseTimeToMinutes(null)).toBeNull()
    expect(parseTimeToMinutes('')).toBeNull()
    expect(parseTimeToMinutes('25:00')).toBeNull()
    expect(parseTimeToMinutes('12:60')).toBeNull()
    expect(parseTimeToMinutes('este')).toBeNull()
  })
})

describe('minutesSinceNoon', () => {
  it('a hajnali időpontokat a nap végére tolja', () => {
    expect(minutesSinceNoon(12 * 60)).toBe(0) // 12:00
    expect(minutesSinceNoon(23 * 60)).toBe(660) // 23:00
    expect(minutesSinceNoon(1)).toBe(721) // 00:01 → később, mint 23:00
    expect(minutesSinceNoon(11 * 60 + 59)).toBe(1439) // 11:59 → a nap utolsó perce
  })
})

describe('compareTimeToDeadline — az éjfél körüli hiba', () => {
  const deadline = '23:00'

  it('22:59 még teljesítve', () => {
    expect(compareTimeToDeadline('22:59', deadline)).toBe(true)
  })

  it('pontosan 23:00 még teljesítve', () => {
    expect(compareTimeToDeadline('23:00', deadline)).toBe(true)
  })

  it('23:01 már nem teljesítve', () => {
    expect(compareTimeToDeadline('23:01', deadline)).toBe(false)
  })

  it('00:01 NEM teljesítve — ez volt az eredeti hiba', () => {
    expect(compareTimeToDeadline('00:01', deadline)).toBe(false)
  })

  it('01:30 sem teljesítve', () => {
    expect(compareTimeToDeadline('01:30', deadline)).toBe(false)
  })

  it('kora esti időpont bőven teljesítve', () => {
    expect(compareTimeToDeadline('21:15', deadline)).toBe(true)
  })

  it('hajnali határidővel is helyesen működik', () => {
    // "kelj fel 06:00 előtt"
    expect(compareTimeToDeadline('05:30', '06:00')).toBe(true)
    expect(compareTimeToDeadline('06:00', '06:00')).toBe(true)
    expect(compareTimeToDeadline('07:00', '06:00')).toBe(false)
    expect(compareTimeToDeadline('23:00', '06:00')).toBe(true) // előző este
  })

  it('hiányzó adat = nem teljesítve', () => {
    expect(compareTimeToDeadline(null, deadline)).toBe(false)
    expect(compareTimeToDeadline('22:00', null)).toBe(false)
  })
})
