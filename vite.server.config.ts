import { defineConfig } from 'vite'

// Bundles the table server into one file for Node; dependencies stay external.
export default defineConfig({
  publicDir: false,
  build: {
    ssr: 'server/index.ts',
    outDir: 'dist-server',
    target: 'node22',
    emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: 'index.mjs' } },
  },
  ssr: { target: 'node' },
})
