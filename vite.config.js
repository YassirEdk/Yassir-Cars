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

export default defineConfig({
  plugins: [react(), siteUrlPlugin()],
})
