// Generate the responsive hero images from a single source file.
//
// The hero background used to be loaded straight from Unsplash's CDN at a fixed
// 1800px — a third-party round-trip on the LCP element of every first visit.
// This bakes local WebP variants instead, so the browser downloads one
// appropriately-sized file from our own origin.
//
// Usage: node scripts/build-hero.mjs [sourceImage]
//        (defaults to public/hero-source.jpg)
import sharp from 'sharp'
import { mkdir, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = process.argv[2] || join(root, 'public', 'hero-source.jpg')
const outDir = join(root, 'public', 'hero')

// One per breakpoint the hero actually renders at.
const WIDTHS = [800, 1400, 2000]

async function run() {
  await mkdir(outDir, { recursive: true })

  for (const w of WIDTHS) {
    const out = join(outDir, `hero-${w}.webp`)
    await sharp(src)
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 72 })
      .toFile(out)
    const { size } = await stat(out)
    console.log(`hero-${w}.webp`.padEnd(20), (size / 1024).toFixed(0).padStart(5), 'KB')
  }

  // JPEG fallback for browsers without WebP (negligible share, but the hero is
  // the page's backdrop — a missing one leaves an empty black band).
  const fallback = join(outDir, 'hero-1400.jpg')
  await sharp(src).resize({ width: 1400, withoutEnlargement: true }).jpeg({ quality: 78, progressive: true }).toFile(fallback)
  const { size } = await stat(fallback)
  console.log('hero-1400.jpg'.padEnd(20), (size / 1024).toFixed(0).padStart(5), 'KB')
}

run().catch(e => { console.error(e); process.exit(1) })
