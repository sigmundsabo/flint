/**
 * Globális SVG gradiens-definíciók. Egy helyen élnek, mert több komponens
 * (időzítő, diagramok) ugyanarra az `url(#…)` azonosítóra hivatkozik —
 * duplikált id-k egymást ütnék ki. A pontszám-ív saját, egyedi nevű
 * gradienst használ, mert ott a színátmenet iránya is más.
 */
import { GLASS_MAP } from './glassMap'

export function SvgDefs() {
  return (
    <svg width="0" height="0" aria-hidden focusable="false" style={{ position: 'absolute' }}>
      <defs>
        <linearGradient id="ring-mint" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--accent-deep)" />
          <stop offset="55%" stopColor="var(--accent-2)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
        <linearGradient id="bar-mint" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="var(--accent-2)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>

        {/*
          Folyékony üveg — fénytörés a peremen.

          A `glass-map.png` piros csatornája mondja meg, mennyivel toljuk el
          vízszintesen a mögöttes képet, a zöld a függőlegest (128 = semleges).
          A térkép a széleken hajlít befelé, középen nem nyúl semmihez — így a
          perem úgy nyomja össze a hátteret, ahogy egy vastag üveglap.

          `objectBoundingBox`: a térkép ráfeszül az elem dobozára, tehát
          ugyanez a szűrő jó a kapszula alakú navigációra és a kártyákra is.

          CSAK Chromiumban lép működésbe — lásd a main.tsx gate-jét és a
          .glass/.floating szabályokat. A térkép beágyazva érkezik
          (`glassMap.ts`), mert a Chromium a szűrőn belüli feImage-et nem
          tölti be külső URL-ről; lemérve a /glass-map.png-re hivatkozó
          változat semmit nem csinált. Újragenerálás:
          `node scripts/make-glass-map.mjs`.
        */}
        <filter
          id="liquid-glass"
          primitiveUnits="objectBoundingBox"
          colorInterpolationFilters="sRGB"
        >
          <feImage
            href={GLASS_MAP}
            x="0"
            y="0"
            width="1"
            height="1"
            preserveAspectRatio="none"
            result="map"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="map"
            // A skála a doboz arányában értendő (objectBoundingBox). 0,05-nél
            // nem látszott semmi, 0,4-nél eltorzult a kép — 0,14 az a mérték,
            // ahol a perem érezhetően összenyomja a hátteret, de nem tűnik
            // hibának.
            scale="0.14"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  )
}
