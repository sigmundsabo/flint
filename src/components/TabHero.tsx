import { useState } from 'react'

interface TabHeroProps {
  /**
   * A hangulatkép útvonala, ha VAN ilyen fájl (pl. `/hero-edzes.webp`).
   *
   * Megadás nélkül a sáv csak az akcentus-derengést mutatja, és NEM KÉR
   * SEMMIT a hálózatról. Korábban a komponens egy `name` prop alapján mindig
   * megpróbálta letölteni a `/{name}.webp`-et — csak hát egyetlen ilyen fájl
   * sem létezett. Négy fül, négy hiábavaló kérés minden egyes megnyitáskor; és
   * mivel a Netlify az egyoldalas átírás miatt minden ismeretlen útvonalra
   * 200-as `index.html`-t ad, nem is 404 jött vissza, hanem a teljes HTML-lap
   * letöltődött képnek álcázva. Ha lesz hangulatkép, a fájl bekerül a
   * `public/`-ba, és a hívó ideírja az útvonalát.
   */
  src?: string
  height?: number
}

/**
 * Keskeny hangulatsáv a fül tetején — ugyanannak a barlangnak egy másik
 * részlete, a fül saját akcentusszínére hangolva. Ettől minden fül *hely* lesz,
 * nem lista, és folytatja a világot, amit a Ma fül felépít.
 *
 * Kép nélkül is működik: olyankor egy halk, akcentusszínű derengés áll a
 * helyére, tehát a fejléc sosem lesz csupasz. A szín nem propból jön, hanem a
 * szülőre tett `data-accent` `--accent-rgb` tokenjéből — a sávnak nem kell
 * tudnia, melyik fülön áll.
 */
export function TabHero({ src, height = 168 }: TabHeroProps) {
  // A kép csak akkor számít meglévőnek, ha tényleg be is töltött: így egy
  // elírt útvonal a derengésre esik vissza, nem üres sávot hagy.
  const [failed, setFailed] = useState(false)
  const photo = src && !failed ? src : null

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden"
      style={{
        height,
        maskImage: 'linear-gradient(to bottom, #000 42%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, #000 42%, transparent 100%)',
      }}
    >
      {photo ? (
        <img
          src={photo}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
          // Nincs CSS-szűrő: a sötétítés és a visszafogott telítettség be van
          // égetve a webp-be (`scripts/optimize-images.mjs`). Egy teljes
          // szélességű `filter` minden fülváltáskor külön festési menetet kért.
        />
      ) : null}

      {/* A fül akcentusa átszínezi a sávot — így négy különböző hely lesz
          belőle, nem négyszer ugyanaz a kép. */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(70% 100% at 50% 0%, rgba(var(--accent-rgb), ${photo ? 0.16 : 0.13}), transparent 72%)`,
          mixBlendMode: photo ? 'soft-light' : 'normal',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(100% 90% at 50% 0%, transparent 24%, rgba(4,4,4,0.7) 74%, #040404 100%)',
        }}
      />
    </div>
  )
}
