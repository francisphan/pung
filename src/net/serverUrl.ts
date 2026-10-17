/**
 * Where the table server lives. Set VITE_PUNG_SERVER at build time; in
 * development it defaults to a server on this machine. `?server=wss://…`
 * on the page URL overrides it for this browser (and `?server=` clears
 * the override), which helps when trying a server before deploying it.
 */
const KEY = 'pung.server.v1'

export function serverUrl(): string | null {
  try {
    const q = new URLSearchParams(window.location.search).get('server')
    if (q !== null) {
      if (q) localStorage.setItem(KEY, q)
      else localStorage.removeItem(KEY)
    }
    const stored = localStorage.getItem(KEY)
    if (stored) return stored
  } catch {
    /* no storage: fall through */
  }
  const env = import.meta.env.VITE_PUNG_SERVER as string | undefined
  if (env) return env
  return import.meta.env.DEV ? 'ws://localhost:8787' : null
}
