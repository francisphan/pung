/**
 * Shanten: how many tiles away a hand is from ready. 0 means ready (one tile
 * from a win), -1 means complete. Standard four-sets-and-a-pair shape, plus
 * thirteen orphans for a concealed hand. Used by the AI to pick discards.
 *
 * Computed per block (each suit, then the honors) and combined, which keeps
 * the search tiny even for hands full of runs.
 */
import { ORPHANS } from './hand'
import { STANDARD_TILES, type StandardId } from './tiles'

/** Index of each face in STANDARD_TILES order: C1-9, D1-9, B1-9, winds, dragons. */
export const TILE_INDEX: Record<StandardId, number> = Object.fromEntries(
  STANDARD_TILES.map((id, i) => [id, i]),
) as Record<StandardId, number>

export function toCounts(tiles: readonly StandardId[]): number[] {
  const c = new Array<number>(34).fill(0)
  for (const t of tiles) c[TILE_INDEX[t]]++
  return c
}

/** (sets, partials, pair) an isolated block can supply; encoded as m * 100 + p * 10 + pair. */
type Opt = number

const blockCache = new Map<string, Opt[]>()

function blockOptions(c: number[], suit: boolean): Opt[] {
  const key = (suit ? 's' : 'h') + c.join('')
  const hit = blockCache.get(key)
  if (hit) return hit
  const found = new Set<Opt>()
  const n = c.length
  const dfs = (i: number, m: number, p: number, pair: number) => {
    while (i < n && c[i] === 0) i++
    if (i === n) {
      found.add(m * 100 + p * 10 + pair)
      return
    }
    const k = c[i]
    if (k >= 3) {
      c[i] -= 3
      dfs(i, m + 1, p, pair)
      c[i] += 3
    }
    if (suit && i <= 6 && c[i + 1] > 0 && c[i + 2] > 0) {
      c[i]--
      c[i + 1]--
      c[i + 2]--
      dfs(i, m + 1, p, pair)
      c[i]++
      c[i + 1]++
      c[i + 2]++
    }
    if (k >= 2) {
      c[i] -= 2
      if (!pair) dfs(i, m, p, 1)
      dfs(i, m, p + 1, pair)
      c[i] += 2
    }
    if (suit && i <= 7 && c[i + 1] > 0) {
      c[i]--
      c[i + 1]--
      dfs(i, m, p + 1, pair)
      c[i]++
      c[i + 1]++
    }
    if (suit && i <= 6 && c[i + 2] > 0) {
      c[i]--
      c[i + 2]--
      dfs(i, m, p + 1, pair)
      c[i]++
      c[i + 2]++
    }
    c[i]--
    dfs(i, m, p, pair)
    c[i]++
  }
  dfs(0, 0, 0, 0)
  // Keep only options no other option beats on every count.
  const all = [...found]
  const keep = all.filter((a) => {
    const [am, ap, az] = [Math.floor(a / 100), Math.floor(a / 10) % 10, a % 10]
    return !all.some((b) => {
      if (a === b) return false
      const [bm, bp, bz] = [Math.floor(b / 100), Math.floor(b / 10) % 10, b % 10]
      return bm >= am && bp >= ap && bz >= az
    })
  })
  blockCache.set(key, keep)
  return keep
}

/** Shanten of the standard shape. `open` is how many sets are already declared. */
export function shantenStandard(counts: readonly number[], open: number): number {
  const blocks: Opt[][] = [
    blockOptions(counts.slice(0, 9), true),
    blockOptions(counts.slice(9, 18), true),
    blockOptions(counts.slice(18, 27), true),
    blockOptions(counts.slice(27, 34), false),
  ]
  // DP over blocks on (sets, partials, pair), capped so the state space stays small.
  let states = new Set<Opt>([0])
  for (const opts of blocks) {
    const next = new Set<Opt>()
    for (const s of states) {
      const sm = Math.floor(s / 100)
      const sp = Math.floor(s / 10) % 10
      const sz = s % 10
      for (const o of opts) {
        const om = Math.floor(o / 100)
        const op = Math.floor(o / 10) % 10
        const oz = o % 10
        if (sz + oz > 1) continue
        next.add(Math.min(4, sm + om) * 100 + Math.min(4, sp + op) * 10 + (sz + oz))
      }
    }
    states = next
  }
  let best = 8
  for (const s of states) {
    const m = Math.min(4, Math.floor(s / 100) + open)
    const p = Math.min(Math.floor(s / 10) % 10, 4 - m)
    const pair = s % 10
    const v = 8 - 2 * m - p - pair
    if (v < best) best = v
  }
  return best
}

/** Shanten of thirteen orphans; only possible with nothing declared. */
export function shantenOrphans(counts: readonly number[], open: number): number {
  if (open > 0) return 99
  let distinct = 0
  let pair = 0
  for (const id of ORPHANS) {
    const k = counts[TILE_INDEX[id]]
    if (k > 0) distinct++
    if (k > 1) pair = 1
  }
  return 13 - distinct - pair
}

/** Best shanten across the shapes this app scores. */
export function shanten(concealed: readonly StandardId[], open: number): number {
  const c = toCounts(concealed)
  return Math.min(shantenStandard(c, open), shantenOrphans(c, open))
}

export interface Acceptance {
  shanten: number
  /** Faces that would bring the hand closer, with how many copies are still unseen. */
  tiles: { id: StandardId; unseen: number }[]
  /** Total unseen copies across those faces. */
  count: number
}

/**
 * For a hand one tile short (13 - 3 * open), which draws improve it.
 * `unseen` is a 34-count of copies not visible to this player.
 */
export function acceptance(
  concealed: readonly StandardId[],
  open: number,
  unseen: readonly number[],
): Acceptance {
  const c = toCounts(concealed)
  const base = Math.min(shantenStandard(c, open), shantenOrphans(c, open))
  const tiles: Acceptance['tiles'] = []
  let count = 0
  for (let i = 0; i < 34; i++) {
    if (unseen[i] <= 0 || c[i] >= 4) continue
    c[i]++
    const s = Math.min(shantenStandard(c, open), shantenOrphans(c, open))
    c[i]--
    if (s < base) {
      tiles.push({ id: STANDARD_TILES[i], unseen: unseen[i] })
      count += unseen[i]
    }
  }
  return { shanten: base, tiles, count }
}
