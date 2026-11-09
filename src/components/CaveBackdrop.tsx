import { useState } from 'react'

/**
 * Barlang-háttér a Ma fül tetején.
 *
 * Ugyanaz a kép, mint az indítóképernyőn: egy letöltés, és a két felület
 * ugyanabban a barlangban játszódik — a megnyitás folytatódik a Ma fülön. Az
 * `index.html` `rel="preload"` sora már a HTML olvasásakor elindítja a
 * letöltést, tehát mire a React idáig ér, a kép jellemzően megvan.
 *
 * A rajzolt barlang CSAK VÉGSŐ TARTALÉK, és ezért nem „töltés alatt" állapot:
 *
 * Korábban a komponens `new Image()`-dzsel ELŐBB megnézte, betölthető-e a
 * fotó, és amíg nem jött vissza, az SVG-barlangot rajzolta. Így a rajz MINDEN
 * indításnál felvillant — telefonon jól láthatóan, mert ott a kép lassabban
 * érkezik, a feTurbulence-szűrő kirajzolása pedig épp a legszűkebb pillanatban
 * terheli a GPU-t. Most a valódi `<img>` megy ki azonnal, és a rajz csak akkor
 * lép be, ha a betöltés tényleg ELBUKIK (`onError`). Töltés közben nincs
 * helyettesítő látvány — a barlang feketéről úszik be, ami pontosan az, amit
 * egy barlangtól várunk.
 */
export function CaveBackdrop({ height = 460 }: { height?: number }) {
  const [failed, setFailed] = useState(false)
  const photo = !failed

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden"
      style={{
        height,
        maskImage: 'linear-gradient(to bottom, #000 58%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, #000 58%, transparent 100%)',
      }}
    >
      {photo ? (
        <img
          src="/splash.webp"
          alt=""
          // A böngésző magas prioritással kérje: ez a lap legnagyobb képe,
          // tehát ez határozza meg, mikor látszik késznek a Ma fül.
          fetchPriority="high"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
          style={{
            // Nincs külön nagyítás: az `object-cover` amúgy is majdnem
            // pontosan kitölti a dobozt. Az `objectPosition` a kép FELSŐ
            // harmadát hozza előre — ott a legdrámaibb a hasadék, és így a kő
            // pont elé kerül.
            objectPosition: '50% 26%',
            // Nincs CSS-szűrő: a sötétítés, a visszafogott telítettség és a
            // kontraszt BE VAN SÜTVE a webp-be (`scripts/optimize-images.mjs`).
            // Egy teljes képernyős `filter` minden képkockán újrarasztereztette
            // a réteget, és a festést is megvárakoztatta — most a kép úgy
            // jelenik meg, ahogy megjött.
          }}
        />
      ) : (
        <ProceduralCave />
      )}

      {/* A szintetikus fénypászma csak a rajzolt változathoz kell — a fotó
          hozza magával a sajátját, azt megduplázni csak kimosná. */}
      {photo ? null : (
        <>
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(8rem 15rem at 50% 32%, rgba(150,240,210,0.28), transparent 70%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(22rem 14rem at 50% 38%, rgba(190,255,235,0.045), transparent 72%)',
            }}
          />
        </>
      )}
      {/* A fejléc mögött visszahúzzuk a fényt, hogy a dátumsáv olvasható maradjon */}
      <div
        className="absolute inset-x-0 top-0 h-40"
        style={{ background: 'linear-gradient(to bottom, #040404 8%, rgba(4,4,4,0.55) 55%, transparent 100%)' }}
      />
      {/* erős vignetta — a barlang lényege, hogy a szélek feketék */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(62% 52% at 50% 34%, transparent 6%, rgba(4,4,4,0.55) 44%, rgba(4,4,4,0.93) 74%, #040404 100%)',
        }}
      />
      <DustMotes />
    </div>
  )
}

/** Sziklafalak fraktálzajból — nincs szükség képfájlra. */
function ProceduralCave() {
  return (
    <svg
      className="absolute inset-0 size-full"
      viewBox="0 0 400 460"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <filter id="cave-rock" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.014 0.03" numOctaves="4" seed="9" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="46" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="0.7" />
        </filter>

        <filter id="cave-grain" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="4" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.5" />
          </feComponentTransfer>
        </filter>

        <linearGradient id="cave-wall-l" x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0%" stopColor="#0e1113" />
          <stop offset="60%" stopColor="#060809" />
          <stop offset="100%" stopColor="#040404" />
        </linearGradient>
        <linearGradient id="cave-wall-r" x1="1" y1="0" x2="0" y2="0.3">
          <stop offset="0%" stopColor="#0f1214" />
          <stop offset="60%" stopColor="#060809" />
          <stop offset="100%" stopColor="#040404" />
        </linearGradient>
        <linearGradient id="cave-roof" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#0c0f10" />
          <stop offset="100%" stopColor="#040404" />
        </linearGradient>
      </defs>

      <rect width="400" height="460" fill="#040404" />

      {/* boltozat */}
      <path
        d="M-20,-20 H420 V112 C336,168 302,84 200,96 C102,108 62,166 -20,116 Z"
        fill="url(#cave-roof)"
        filter="url(#cave-rock)"
      />
      {/* bal fal */}
      <path
        d="M-20,-20 H146 C134,110 152,236 116,352 C92,418 52,452 -20,472 Z"
        fill="url(#cave-wall-l)"
        filter="url(#cave-rock)"
      />
      {/* jobb fal */}
      <path
        d="M420,-20 H258 C274,106 252,232 292,348 C316,414 352,450 420,472 Z"
        fill="url(#cave-wall-r)"
        filter="url(#cave-rock)"
      />
      {/* alsó szikla-perem, amin a kő áll */}
      <path
        d="M-20,470 C60,392 140,368 200,368 C262,368 342,394 420,470 Z"
        fill="#080a0b"
        filter="url(#cave-rock)"
      />

      {/* finom szemcse az egész fölé */}
      <rect width="400" height="460" filter="url(#cave-grain)" opacity="0.08" />
    </svg>
  )
}

/** Lassan sodródó porszemek a fényben. */
function DustMotes() {
  const motes = [
    { l: 22, t: 34, s: 2, d: 0, dur: 17 },
    { l: 36, t: 62, s: 1.4, d: 3, dur: 21 },
    { l: 58, t: 28, s: 1.8, d: 6, dur: 19 },
    { l: 68, t: 55, s: 1.2, d: 1.5, dur: 24 },
    { l: 46, t: 76, s: 1.6, d: 8, dur: 16 },
    { l: 78, t: 40, s: 1.1, d: 4.5, dur: 23 },
    { l: 30, t: 48, s: 1.3, d: 10, dur: 20 },
  ]
  return (
    <div className="absolute inset-0">
      {motes.map((m, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${m.l}%`,
            top: `${m.t}%`,
            width: m.s,
            height: m.s,
            background: 'rgba(200,255,240,0.7)',
            // Nincs `filter: blur(0.3px)`: harmad pixelnyi lágyításért hét
            // külön GPU-réteg készült, amit a böngésző minden képkockán
            // újrarajzolt. Szabad szemmel nem látszott a különbség.
            animation: `dust-drift ${m.dur}s ${m.d}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  )
}
