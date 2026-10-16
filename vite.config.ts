import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from a GitHub Pages project subpath in production; root in dev.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/pung/' : '/',
  plugins: [react()],
}))
