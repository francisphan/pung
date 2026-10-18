/**
 * Anonymous usage counts through GoatCounter (goatcounter.com): page views
 * and a few named events, with no cookies and nothing personal. Off unless
 * VITE_GOATCOUNTER names a site, such as https://pung.goatcounter.com, and
 * GoatCounter's own script skips localhost by itself.
 *
 * Events, as paths in the GoatCounter dashboard:
 *   deal/solo            a solo game dealt
 *   deal/table/2p        a table dealt, counted by its host, with the number of people at it
 *   rules/min-3          the minimum faan chosen at a deal (0, 1 or 3)
 *   rules/rounds-4       the length chosen at a deal (1 or 4)
 *   hand/win/person      a hand won by a person (solo: you; table: counted by the host)
 *   hand/win/bot         a hand won by a bot
 *   hand/draw            a hand with no winner
 *   game/end             a game played to the end
 *   table/host           a table hosted
 *   table/join           a table joined
 *   table/host-failed    hosting failed (the broker could not be reached)
 *   table/join-failed    joining failed (no such code, table full, host gone)
 */
const SITE = (import.meta.env.VITE_GOATCOUNTER as string | undefined)?.replace(/\/+$/, '')

interface GoatCounter {
  count(vars: { path: string; title?: string; event?: boolean }): void
}
declare global {
  interface Window {
    goatcounter?: GoatCounter
  }
}

export function metricsEnabled(): boolean {
  return !!SITE
}

/** Add the counting script once. Call at start-up. */
export function installMetrics(): void {
  if (!SITE || typeof document === 'undefined' || document.querySelector('script[data-goatcounter]')) return
  const s = document.createElement('script')
  s.async = true
  s.src = 'https://gc.zgo.at/count.js'
  s.dataset.goatcounter = `${SITE}/count`
  document.head.appendChild(s)
}

/** Count a named event. Silent when metrics are off or the script has not loaded yet. */
export function track(path: string, title?: string): void {
  try {
    window.goatcounter?.count({ path, title, event: true })
  } catch {
    /* counting must never get in the way of the game */
  }
}

/** The rules chosen at a deal. */
export function trackRules(rules: { minimumFaan: number; rounds: number }): void {
  track(`rules/min-${rules.minimumFaan}`, `Minimum ${rules.minimumFaan} faan`)
  track(`rules/rounds-${rules.rounds}`, rules.rounds === 1 ? 'East round' : 'Four rounds')
}
