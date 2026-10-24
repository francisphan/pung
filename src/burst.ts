/**
 * A comic-book starburst filling a w by h box: spikes alternate long and
 * short, each a little off, as if inked by hand. `grow` scales it about the
 * centre, for a second burst behind the first.
 */
export function burstPoints(spikes: number, w: number, h: number, grow = 1): string {
  const out: string[] = []
  const n = spikes * 2
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    const wobble = ((Math.sin((i + 1) * 7.3 + spikes) + 1) / 2) * 0.1
    const r = (i % 2 === 0 ? 1 - wobble : 0.68 + wobble) * grow
    out.push(`${(w / 2 + (w / 2) * r * Math.cos(a)).toFixed(1)},${(h / 2 + (h / 2) * r * Math.sin(a)).toFixed(1)}`)
  }
  return out.join(' ')
}

