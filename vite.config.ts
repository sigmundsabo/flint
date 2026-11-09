/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      /**
       * A webmanifest ikonjai NE kerüljenek az offline csomagba.
       *
       * A plugin alapból külön úton is beteszi őket — a `globIgnores` ezért
       * nem fogta meg a `pwa-512.png`-t, hiába volt rajta a listán. Ezt a 117
       * (+18) KB-ot az OPERÁCIÓS RENDSZER olvassa, amikor kiteszed az appot a
       * kezdőképernyőre; a futó app soha nem hivatkozik rájuk. Offline
       * telepíteni amúgy sem lehet, tehát nincs mit megőrizni.
       */
      includeManifestIcons: false,
      workbox: {
        // A `webp` és a `woff2` NINCS benne a plugin alapértelmezett
        // mintáiban. A képek miatt eddig egyetlen kép sem került offline
        // csomagba — se a barlang, se az indítókép, se a logó. A betűk pedig
        // azóta kellenek ide, hogy saját kiszolgálásból jönnek: enélkül
        // repülőmódban a címek Georgiára, a számok Menlóra estek vissza.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,webmanifest,woff2}'],
        globIgnores: [
          // A tíz fokozat képe NEM való az előtöltésbe: együtt 140 KB fölött
          // van, és egy nap alatt jó, ha három-négy fokozatot látsz. Amelyiket
          // elérted, az futásidőben beragad a gyorsítótárba, és onnantól
          // offline is megvan.
          '**/stones/**',
          // A 192/512-es app-ikont az OPERÁCIÓS RENDSZER olvassa telepítéskor,
          // a futó app soha. 117 KB-ot töltöttünk le minden telepítésnél egy
          // fájlért, amit a lapon semmi nem hivatkozik. A minta ELŐTAG NÉLKÜL
          // kell: a `**/` legalább egy mappaszintet vár, a fájl viszont a
          // `dist/` gyökerében van, tehát `**/pwa-512.png` sosem talált rá.
          'pwa-512.png',
          'pwa-192.png',
          'apple-touch-icon.png',
          // A Supabase-kliens külön kötege. Helyi módban SOHA nem hívódik meg
          // (minden kérés a localStorage-ból megy), tehát 200 KB holt kódot
          // töltött le a telefon minden telepítéskor. Supabase-módban az app
          // indulásakor azonnal lekéri, és akkor a lenti szabály elkapja.
          '**/supabase-*.js',
        ],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/stones/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'flint-stones',
              expiration: { maxEntries: 12 },
            },
          },
          {
            urlPattern: ({ url }) => /\/assets\/supabase-.*\.js$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'flint-supabase',
              expiration: { maxEntries: 3 },
            },
          },
        ],
      },
      manifest: {
        name: 'Flint',
        short_name: 'Flint',
        description: 'Napi szokás- és egészségkövető',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        /**
         * A Supabase-kliens kap SAJÁT, BESZÉLŐ NEVET.
         *
         * Nem kozmetika: a service worker előtöltési listájából név szerint
         * kell kihagyni (lásd `globIgnores` fent), a köteg viszont alapból a
         * belépő moduljának a mappájáról kapta a nevét — `dist-<hash>.js` —,
         * ami bármelyik könyvtárfrissítéskor megváltozhat. Egy minta, ami
         * véletlenül talál, egy nap véletlenül nem fog találni.
         */
        manualChunks(id: string) {
          if (id.includes('node_modules/@supabase/')) return 'supabase'
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
