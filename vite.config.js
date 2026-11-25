import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolveSiteUrl, SITE_URL_HELP } from './scripts/site-url.mjs'

// Replaces %SITE_URL% in index.html (canonical, og:url, og:image,
// twitter:image, JSON-LD).
//
// Deliberately NOT Vite's built-in %VITE_*% substitution: that only reads .env
// and the environment, so it could not fall back to the domain Vercel injects —
// and an unset variable silently shipped a literal "%VITE_SITE_URL%" inside the
// canonical tag. This uses the same resolver as scripts/build-seo.mjs, so the
// HTML and the sitemap can never disagree about the host.
function siteUrlPlugin() {
  return {
    name: 'yassir-site-url',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const url = resolveSiteUrl()
        if (!url) throw new Error('\n\n  Cannot determine the site URL for index.html.\n\n' + SITE_URL_HELP)
        return html.replaceAll('%SITE_URL%', url)
      },
    },
  }
}

// The first data a visitor sees (cars, prices, contact details) comes from
// Supabase. A preconnect opens that connection while the JavaScript is still
// downloading, instead of after. Nothing is added when the URL isn't set.
function supabasePreconnectPlugin() {
  let origin = null
  return {
    name: 'yassir-supabase-preconnect',
    configResolved(config) {
      try { origin = new URL(config.env.VITE_SUPABASE_URL).origin } catch { origin = null }
    },
    transformIndexHtml() {
      if (!origin) return []
      // crossorigin: the data requests are CORS fetches, which use their own connection.
      return [{ tag: 'link', attrs: { rel: 'preconnect', href: origin, crossorigin: true }, injectTo: 'head' }]
    },
  }
}

// React and the router change far less often than the site itself. In a file
// of their own they stay in the visitor's cache across deploys.
const VENDOR = /[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/

export default defineConfig({
  plugins: [react(), siteUrlPlugin(), supabasePreconnectPlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => (VENDOR.test(id) ? 'react' : undefined),
      },
    },
  },
  // Always the same local address: http://localhost:5998. strictPort so a busy
  // port fails loudly instead of quietly moving to another one.
  server: { port: 5998, strictPort: true },
})
