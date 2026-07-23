// Single source of truth for the site's public base URL.
//
// Used by vite.config.js (to substitute %SITE_URL% in index.html) and by
// scripts/build-seo.mjs (robots.txt + sitemap.xml), so the domain is resolved
// the same way everywhere.
//
// Order of preference:
//   1. VITE_SITE_URL in the environment          (CI / Vercel dashboard)
//   2. VITE_SITE_URL in .env                     (local development)
//   3. VERCEL_PROJECT_PRODUCTION_URL             (Vercel sets this itself)
//   4. VERCEL_URL                                (per-deployment preview URL)
// Returning null means "genuinely unknown" — the caller decides what to do.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const clean = (u) => String(u).trim().replace(/\/+$/, '')
const withScheme = (host) => (/^https?:\/\//.test(host) ? clean(host) : `https://${clean(host)}`)

function fromEnvFile() {
  // Vite loads .env for the app, but this runs in plain Node before that, so
  // the file is parsed directly. Four lines beats a dotenv dependency.
  try {
    const env = readFileSync(join(root, '.env'), 'utf8')
    const line = env.split(/\r?\n/).find(l => l.trim().startsWith('VITE_SITE_URL='))
    if (!line) return null
    const value = line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')
    return value || null
  } catch {
    return null
  }
}

export function resolveSiteUrl(env = process.env) {
  if (env.VITE_SITE_URL) return withScheme(env.VITE_SITE_URL)

  const fromFile = fromEnvFile()
  if (fromFile) return withScheme(fromFile)

  // Vercel injects these on every build — no dashboard configuration needed.
  // PROJECT_PRODUCTION_URL is the stable domain; VERCEL_URL changes per deploy,
  // so it is only a last resort (previews, where the canonical matters least).
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return withScheme(env.VERCEL_PROJECT_PRODUCTION_URL)
  if (env.VERCEL_URL) return withScheme(env.VERCEL_URL)

  return null
}

export const SITE_URL_HELP =
  '  Set VITE_SITE_URL so the canonical link, Open Graph image, JSON-LD,\n' +
  '  robots.txt and sitemap.xml point at the right host.\n\n' +
  '  Locally : add it to .env\n' +
  '  Vercel  : Settings → Environment Variables → VITE_SITE_URL\n\n' +
  '  Example : VITE_SITE_URL=https://votre-domaine.ma   (no trailing slash)\n'
