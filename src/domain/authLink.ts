/** A Supabase e-mailes belépésének token-típusai. */
export type EmailOtpType = 'magiclink' | 'email' | 'signup' | 'recovery' | 'invite' | 'email_change'

const TYPES: EmailOtpType[] = ['magiclink', 'email', 'signup', 'recovery', 'invite', 'email_change']

function decodeOnce(text: string): string {
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}

/**
 * Kiszedi a beváltható tokent a Supabase belépő linkjéből.
 *
 * Miért nem elég a `new URL(...).searchParams.get('token')`: a levelezők
 * ÁTÍRJÁK a linket. A Gmail a sajátjára cseréli
 * (`https://www.google.com/url?q=<kódolt eredeti>&source=gmail`), az Outlook a
 * Safe Linksre — a token ilyenkor egy paraméter ÉRTÉKÉN belül, egyszer vagy
 * többször URL-kódolva ül. A felső szintű paramétereket olvasva nem találjuk
 * meg, és a felhasználó csak annyit lát, hogy „nem működik".
 *
 * Ezért: néhányszor visszafejtjük a kódolást, aztán a teljes szövegben
 * keressük a mintát. Így mindegy, milyen burokban érkezik.
 *
 * `null`, ha nincs benne token — akkor a bemenet hatjegyű kódnak számít.
 */
export function tokenFromLink(raw: string): { token_hash: string; type: EmailOtpType } | null {
  let text = raw.trim()
  if (!text.includes('token')) return null

  // Három kör bőven elég: a Gmail egyszer kódol, a duplán kódolt esetre is
  // marad tartalék. A ciklus akkor is leáll, ha már nincs mit visszafejteni.
  for (let i = 0; i < 3; i++) {
    const next = decodeOnce(text)
    if (next === text) break
    text = next
  }

  // A `token_hash` előbb szerepel a mintában, mint a `token`, különben a
  // rövidebb név illeszkedne a hosszabb elejére.
  const token = text.match(/[?&#](?:token_hash|token)=([^&\s#"'<>]+)/)?.[1]
  if (!token) return null

  const found = text.match(/[?&#]type=([a-z_]+)/)?.[1] as EmailOtpType | undefined
  return { token_hash: token, type: found && TYPES.includes(found) ? found : 'magiclink' }
}
