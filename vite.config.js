import { readFileSync, writeFileSync, existsSync } from 'node:fs'

// Exposed to the client so usage counters can report which build produced them.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const SITE_ORIGIN = 'https://lactia.nicutools.org'
const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'))

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Post-build artifacts:
// 1. Stamps a unique CACHE_VERSION into dist/sw.js on every build, so stale
//    PWA caches are invalidated automatically (no manual bump needed).
// 2. Generates dist/sitemap.xml with one ?drug= deep link per LactMed title
//    from src/data/drugTitles.json (skipped while the index is empty).
function lactiaBuildArtifacts() {
  return {
    name: 'lactia-build-artifacts',
    apply: 'build',
    closeBundle() {
      const swPath = 'dist/sw.js'
      if (existsSync(swPath)) {
        const version = `v${Date.now().toString(36)}`
        const sw = readFileSync(swPath, 'utf8')
        writeFileSync(
          swPath,
          sw.replace(/const CACHE_VERSION = '[^']*'/, `const CACHE_VERSION = '${version}'`),
        )
        console.log(`sw.js cache version stamped: ${version}`)
      }

      const titlesPath = 'src/data/drugTitles.json'
      if (existsSync(titlesPath)) {
        const titles = JSON.parse(readFileSync(titlesPath, 'utf8'))
        if (Array.isArray(titles) && titles.length > 0) {
          const urls = [
            `${SITE_ORIGIN}/`,
            ...titles.map((t) => `${SITE_ORIGIN}/?drug=${encodeURIComponent(t)}`),
          ]
          const xml =
            '<?xml version="1.0" encoding="UTF-8"?>\n' +
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
            urls.map((u) => `  <url><loc>${escapeXml(u)}</loc></url>`).join('\n') +
            '\n</urlset>\n'
          writeFileSync('dist/sitemap.xml', xml)
          console.log(`sitemap.xml generated with ${urls.length} URLs`)
        }
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), lactiaBuildArtifacts()],
  define: { __APP_VERSION__: JSON.stringify(version) },
})
