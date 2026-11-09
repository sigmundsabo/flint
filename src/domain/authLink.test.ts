import { describe, expect, it } from 'vitest'
import { tokenFromLink } from './authLink'

const REF = 'https://taljgfbarjdyryzzhfqc.supabase.co/auth/v1/verify'

describe('tokenFromLink', () => {
  it('a nyers Supabase linkből kiszedi a tokent és a típust', () => {
    const link = `${REF}?token=abc123DEF&type=magiclink&redirect_to=https://flint-szokaskoveto.netlify.app`
    expect(tokenFromLink(link)).toEqual({ token_hash: 'abc123DEF', type: 'magiclink' })
  })

  it('a Gmail átirányítójából is kiszedi — ez volt a valódi hiba', () => {
    // A Gmail a saját /url?q=… címére cseréli a linket, és a tokent egy
    // paraméter ÉRTÉKÉBE kódolja. A felső szintű paramétereket olvasva a token
    // nem található meg.
    const inner = encodeURIComponent(`${REF}?token=gmailToken9&type=magiclink`)
    const link = `https://www.google.com/url?q=${inner}&source=gmail&ust=1700000000`
    expect(tokenFromLink(link)).toEqual({ token_hash: 'gmailToken9', type: 'magiclink' })
  })

  it('duplán kódolt burkot is kibont', () => {
    const once = encodeURIComponent(`${REF}?token=deep42&type=magiclink`)
    const twice = encodeURIComponent(`https://x.test/r?u=${once}`)
    expect(tokenFromLink(`https://mail.test/go?target=${twice}`)?.token_hash).toBe('deep42')
  })

  it('elfogadja a token_hash nevű paramétert is', () => {
    expect(tokenFromLink(`${REF}?token_hash=hashed7&type=email`)).toEqual({
      token_hash: 'hashed7',
      type: 'email',
    })
  })

  it('ismeretlen típusnál magiclinkre esik vissza, nem dob hibát', () => {
    expect(tokenFromLink(`${REF}?token=t1&type=valamiUjDolog`)?.type).toBe('magiclink')
  })

  it('típus nélkül is működik', () => {
    expect(tokenFromLink(`${REF}?token=t2`)).toEqual({ token_hash: 't2', type: 'magiclink' })
  })

  it('hatjegyű kódra null — az nem link', () => {
    expect(tokenFromLink('123456')).toBeNull()
  })

  it('üres és értelmetlen bemenetre null, nem kivétel', () => {
    expect(tokenFromLink('')).toBeNull()
    expect(tokenFromLink('   ')).toBeNull()
    expect(tokenFromLink('szia')).toBeNull()
    expect(tokenFromLink('token nélkül nincs érték')).toBeNull()
  })

  it('a token végét a következő paraméter zárja, nem viszi magával', () => {
    const link = `${REF}?token=onlyThis&type=magiclink&redirect_to=https://pelda.hu`
    expect(tokenFromLink(link)?.token_hash).toBe('onlyThis')
  })

  it('a köré ragadt idézőjelet vagy szóközt nem veszi bele', () => {
    expect(tokenFromLink(`  ${REF}?token=trimmed1&type=magiclink  `)?.token_hash).toBe('trimmed1')
  })
})
