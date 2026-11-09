/**
 * Indítóképernyő — betöltés és belépés-ellenőrzés alatt.
 *
 * A szó itt nem a generált képen van, hanem Fraunces-szel szedve: a generátorok
 * torzítva rajzolják a betűt, és 1× méretben ez azonnal látszik. Így a felirat
 * éles marad minden kijelzőn, és ugyanaz a betű, mint a fülcímeken.
 */
export function LaunchScreen({ label = 'Betöltés…' }: { label?: string }) {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden">
      {/* Nincs CSS-szűrő: a sötétítés és a visszafogott telítettség BE VAN
          SÜTVE a webp-be (`scripts/optimize-images.mjs`). Ez a lap első és
          legnagyobb képe — egy teljes képernyős `filter` itt a legdrágább
          helyen kért volna külön GPU-réteget és egy külön festési menetet. */}
      <img
        src="/splash.webp"
        alt=""
        aria-hidden
        fetchPriority="high"
        className="absolute inset-0 size-full object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(70% 55% at 50% 42%, transparent 10%, rgba(4,4,4,0.55) 55%, #040404 100%)',
        }}
      />

      <div className="relative flex flex-col items-center gap-5">
        <img
          src="/mark.webp"
          alt=""
          aria-hidden
          className="size-[132px] object-contain"
          style={{ filter: 'drop-shadow(0 0 34px rgba(140,240,205,0.32))' }}
        />
        <div className="flex flex-col items-center gap-2">
          <h1 className="display text-[34px] leading-none">Flint</h1>
          <p className="eyebrow" role="status">
            {label}
          </p>
        </div>
      </div>
    </div>
  )
}
