/**
 * An optional table server. Without one, the host's own browser runs the
 * table. Set VITE_PUNG_SERVER at build time to use a server instead, or
 * open the page once with `?server=wss://…` to use one in this browser
 * (`?server=` clears it again).
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
  return env || null
}
