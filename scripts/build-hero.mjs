// The hero car: a cut-out of a car from the fleet (transparent PNG), trimmed to
// its edges and baked to WebP at the widths the hero shows it.
//
// Usage: node scripts/build-hero.mjs [cut-out.png]
//        (defaults to scripts/hero-car.png: the Dacia Logan of public/Cars, turned
//        to face the headline, its plate left readable)
// Then copy the size it prints to CAR in src/components/Hero.jsx, and for another
// car, move the shadows of Ground there under its tyres.
import sharp from 'sharp'
import { mkdir, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = process.argv[2] || join(root, 'scripts', 'hero-car.png')
const outDir = join(root, 'public', 'hero')

// Phone, laptop, dense screens.
const WIDTHS = [640, 1000, 1500]

async function run() {
  await mkdir(outDir, { recursive: true })

  const car = await sharp(src).trim({ threshold: 2 }).png().toBuffer()
  const { width: native } = await sharp(car).metadata()

  for (const w of WIDTHS) {
    const out = join(outDir, `car-${w}.webp`)
    let img = sharp(car).resize({ width: w, kernel: 'lanczos3' })
    // Past its own size the picture softens: give the edges some bite back.
    if (w > native) img = img.sharpen({ sigma: 1.1, m1: 0.2, m2: 1.6 })
    const info = await img.webp({ quality: 74, alphaQuality: 80, effort: 6 }).toFile(out)
    const { size } = await stat(out)
    console.log(`car-${w}.webp`.padEnd(16), `${info.width} × ${info.height}`, (size / 1024).toFixed(0).padStart(5), 'KB')
  }
}

run().catch(e => { console.error(e); process.exit(1) })
