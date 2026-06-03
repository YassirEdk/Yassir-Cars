// Normalize all car photos to an identical canvas size so every car
// renders at a consistent visual size. Flatten -> trim background -> fit
// into a fixed box centered on white.
//
// Usage: node scripts/normalize-cars.mjs
import sharp from 'sharp'
import { readdir, mkdir } from 'node:fs/promises'
import { dirname, join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(root, 'public', 'Cars')
const outDir = join(root, 'public', 'cars-fit')

// Final canvas (≈1.85:1, matches the card image area) and padding.
const CANVAS_W = 740
const CANVAS_H = 400
const PAD = 28 // breathing room around each car
const BG = { r: 255, g: 255, b: 255, alpha: 1 }

async function run() {
  await mkdir(outDir, { recursive: true })
  const files = (await readdir(srcDir)).filter(f => /\.(png|jpe?g|webp)$/i.test(f))

  for (const file of files) {
    const inPath = join(srcDir, file)
    const outPath = join(outDir, basename(file).replace(/\.(jpe?g|webp)$/i, '.png'))

    // Flatten onto white (handles transparency), then trim the uniform
    // border so the car's true bounding box is found.
    const trimmed = await sharp(inPath)
      .flatten({ background: BG })
      .trim({ threshold: 25 })
      .toBuffer()

    // Resize the trimmed car to fit inside the padded content box,
    // keeping aspect ratio, then center it on the fixed white canvas.
    const fitted = await sharp(trimmed)
      .resize({
        width: CANVAS_W - PAD * 2,
        height: CANVAS_H - PAD * 2,
        fit: 'inside',
        withoutEnlargement: false,
      })
      .toBuffer()

    await sharp({
      create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: BG },
    })
      .composite([{ input: fitted, gravity: 'center' }])
      .png()
      .toFile(outPath)

    const meta = await sharp(outPath).metadata()
    console.log(`✓ ${file} -> cars-fit/${basename(outPath)} (${meta.width}x${meta.height})`)
  }
  console.log(`\nDone. ${files.length} images normalized to ${CANVAS_W}x${CANVAS_H}.`)
}

run().catch(err => { console.error(err); process.exit(1) })
