/**
 * A generált app-ikonból előállítja a PWA-hoz kellő méreteket.
 *
 * Az ikon SZÁNDÉKOSAN nem kap alfacsatornát: a kezdőképernyőn a rendszer maga
 * vágja le a sarkokat, és egy átlátszó hátterű ikon iOS-en feketére, Androidon
 * fehérre esne ki — vagyis eszközönként másképp nézne ki.
 *
 * Futtatás:  node scripts/make-icons.mjs <bemenet>
 */
import sharp from 'sharp'

const input = process.argv[2]
if (!input) {
  console.error('Használat: node scripts/make-icons.mjs <bemenet.png>')
  process.exit(1)
}

const targets = [
  { file: 'public/pwa-192.png', size: 192 },
  { file: 'public/pwa-512.png', size: 512 },
  // iOS a saját meta-tagjéből ezt tölti be, és 180 px-et vár
  { file: 'public/apple-touch-icon.png', size: 180 },
]

for (const { file, size } of targets) {
  await sharp(input)
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .flatten({ background: '#040404' })
    .png({ compressionLevel: 9 })
    .toFile(file)
  console.log(`kész: ${file} — ${size}×${size}`)
}
