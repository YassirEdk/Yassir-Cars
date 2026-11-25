// Light WebP copies of the images that ship with the site: the brand logos of the
// home strip (in white; the page inks them) and the stock cars. The PNG originals
// stay (the database and the admin still point at them), but visitors download a
// fraction of the weight: the Mercedes logo alone was 805 KB, shown 80px wide.
//
// Usage: node scripts/build-images.mjs   (run it again after adding an image)
import sharp from 'sharp'
import { mkdir, readdir, stat } from 'node:fs/promises'
import { dirname, join, parse } from 'node:path'
import { fileURLToPath } from 'node:url'

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

/* How each logo turns white:
   shape  a flat drawing: every drawn pixel goes white
   light  what is bright stays (the lettering on Ford's blue, Peugeot's lion)
   dark   what is dark or coloured stays, white areas drop out (BMW) */
const LOGOS = {
  'Renault-logo.png': ['renault', 'shape'],
  'mercedes-logo-mercedes-benz-logo-png-transparent-svg-vector-bie-13.png': ['mercedes', 'shape'],
  'BMW-Logo-500x281.png': ['bmw', 'dark'],
  'Toyota-logo-500x281.png': ['toyota', 'shape'],
  'Dacia-logo.png': ['dacia', 'light'],
  'Fiat_logo.svg.png': ['fiat', 'shape'],
  'Ford-Logo-500x281.png': ['ford', 'light'],
  'Mazda-Logo-500x281.png': ['mazda', 'shape'],
  'Porsche-Logo-500x281.png': ['porsche', 'light'],
  'Volkswagen-logo-500x281.png': ['volkswagen', 'shape'],
  'Peugeot-logo.png': ['peugeot', 'light'],
}

async function whiteLogo(from, to, mode) {
  const { data, info } = await sharp(from).ensureAlpha().trim({ threshold: 10 })
    .resize({ width: 240, height: 112, fit: 'inside' }).raw().toBuffer({ resolveWithObject: true })
  for (let i = 0; i < data.length; i += 4) {
    const bright = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255
    const keep = mode === 'light' ? Math.min(1, Math.max(0, (bright - 0.12) / 0.6))
      : mode === 'dark' ? Math.min(1, Math.max(0, (0.97 - bright) / 0.4)) : 1
    data[i] = data[i + 1] = data[i + 2] = 255
    data[i + 3] = Math.round(data[i + 3] * keep)
  }
  await sharp(data, { raw: info }).webp({ quality: 82, alphaQuality: 90 }).toFile(to)
  const { size } = await stat(to)
  console.log(parse(to).base.padEnd(30), `${info.width}×${info.height}`.padStart(8), `${(size / 1024).toFixed(0)} KB`)
}

/* A stock car, cut out of its background and cropped to the car, so every photo
   shows it at the same size (src/lib/photoFit.js does the rest for the photos the
   agency uploads). */
async function cutOut(from, to, width) {
  const { data, info } = await sharp(from).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let [l, t, r, b] = [info.width, info.height, 0, 0]
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] < 12) continue       // past the shadow's edge
      l = Math.min(l, x); r = Math.max(r, x)
      t = Math.min(t, y); b = Math.max(b, y)
    }
  }
  const crop = { left: l, top: t, width: r - l + 1, height: b - t + 1 }
  let img = sharp(from).extract(crop).resize({ width, kernel: 'lanczos3' })
  // Past its own size the picture softens: give the edges some bite back.
  if (width > crop.width) img = img.sharpen({ sigma: 0.9, m1: 0.2, m2: 1.2 })
  const out = await img.webp({ quality: 82, alphaQuality: 90, effort: 6 }).toFile(to)
  const { size } = await stat(to)
  console.log(parse(to).base.padEnd(30), `${out.width}×${out.height}`.padStart(8), `${(size / 1024).toFixed(0)} KB`)
}

// Shown up to 96×44: twice that for dense screens.
await mkdir(join(publicDir, 'brands'), { recursive: true })
for (const [file, [name, mode]] of Object.entries(LOGOS)) {
  await whiteLogo(join(publicDir, file), join(publicDir, 'brands', `${name}.webp`), mode)
}

// Shown up to 400px wide. Next to the PNG the database points at, under its name.
for (const file of await readdir(join(publicDir, 'Cars'))) {
  if (!file.toLowerCase().endsWith('.png')) continue
  await cutOut(join(publicDir, 'Cars', file), join(publicDir, 'cars-fit', `${parse(file).name}.webp`), 720)
}
