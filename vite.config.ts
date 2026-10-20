import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, type Plugin, type ResolvedConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** A copy of index.html in each page's folder, so /friends/ and /learn/ load on a static host. */
function pages(names: string[]): Plugin {
  let outDir = 'dist'
  return {
    name: 'pages',
    apply: 'build',
    configResolved(config: ResolvedConfig) {
      outDir = config.build.outDir
    },
    closeBundle() {
      for (const name of names) {
        mkdirSync(join(outDir, name), { recursive: true })
        copyFileSync(join(outDir, 'index.html'), join(outDir, name, 'index.html'))
      }
    },
  }
}

// Served from a GitHub Pages project subpath in production; root in dev.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/pung/' : '/',
  plugins: [react(), pages(['friends', 'learn'])],
}))
