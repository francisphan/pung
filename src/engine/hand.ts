/**
 * Sets, hands and waits. Variant-agnostic: the "four sets and a pair" shape
 * is shared by Hong Kong, Riichi, Chinese Official and most other rule sets.
 */
import { STANDARD_TILES, TILE_BY_ID, isStandard, sortTiles, suitTile, type Rank, type StandardId } from './tiles'

export type SetKind = 'chow' | 'pung' | 'kong'
export type MeldKind = SetKind | 'pair'

export interface Meld {
  kind: MeldKind
  tiles: StandardId[]
  /** Claimed from a discard and shown face up. Concealed kongs stay `open: false`. */
  open?: boolean
}

/** A hand is the tiles still in your rack plus any sets already declared on the table. */
export interface Hand {
  concealed: StandardId[]
  melds: Meld[]
}

export interface Decomposition {
  sets: Meld[]
  pair: Meld
}

/** Tiles a hand holds overall, counting a kong as its four tiles. */
export function allTiles(hand: Hand): StandardId[] {
  return [...hand.concealed, ...hand.melds.flatMap((m) => m.tiles)]
}

function nextRank(id: StandardId, step: number): StandardId | null {
  const t = TILE_BY_ID[id]
  if (t.kind !== 'suit') return null
  const r = t.rank + step
  if (r < 1 || r > 9) return null
  return suitTile(t.suit, r as Rank)
}

/** Is this an ordered run of three in one suit? */
export function isChow(tiles: readonly StandardId[]): boolean {
  if (tiles.length !== 3) return false
  const s = sortTiles(tiles)
  return nextRank(s[0], 1) === s[1] && nextRank(s[0], 2) === s[2]
}
export function isPung(tiles: readonly StandardId[]): boolean {
  return tiles.length === 3 && tiles.every((t) => t === tiles[0])
}
export function isKong(tiles: readonly StandardId[]): boolean {
  return tiles.length === 4 && tiles.every((t) => t === tiles[0])
}
export function isPair(tiles: readonly StandardId[]): boolean {
  return tiles.length === 2 && tiles[0] === tiles[1]
}

export function classifyMeld(tiles: readonly StandardId[]): MeldKind | null {
  if (isPair(tiles)) return 'pair'
  if (isPung(tiles)) return 'pung'
  if (isKong(tiles)) return 'kong'
  if (isChow(tiles)) return 'chow'
  return null
}

function counts(tiles: readonly StandardId[]): Map<StandardId, number> {
  const m = new Map<StandardId, number>()
  for (const t of tiles) m.set(t, (m.get(t) ?? 0) + 1)
  return m
}

/**
 * Every way to split the concealed tiles into sets plus one pair.
 * Returns [] when there is none. Concealed tiles must number 3n + 2.
 */
export function decomposeConcealed(tiles: readonly StandardId[]): Decomposition[] {
  if (tiles.length % 3 !== 2) return []
  const need = (tiles.length - 2) / 3
  const c = counts(tiles)
  const order = STANDARD_TILES.filter((id) => (c.get(id) ?? 0) > 0)
  const results: Decomposition[] = []
  const seen = new Set<string>()

  function walk(i: number, sets: Meld[], pair: Meld | null) {
    while (i < order.length && (c.get(order[i]) ?? 0) === 0) i++
    if (i === order.length) {
      if (pair && sets.length === need) {
        const key = [...sets.map((s) => s.tiles.join('')), pair.tiles.join('')].sort().join('|')
        if (!seen.has(key)) {
          seen.add(key)
          results.push({ sets: [...sets], pair })
        }
      }
      return
    }
    const id = order[i]
    const n = c.get(id) ?? 0
    if (!pair && n >= 2) {
      c.set(id, n - 2)
      walk(i, sets, { kind: 'pair', tiles: [id, id] })
      c.set(id, n)
    }
    if (n >= 3) {
      c.set(id, n - 3)
      sets.push({ kind: 'pung', tiles: [id, id, id] })
      walk(i, sets, pair)
      sets.pop()
      c.set(id, n)
    }
    const b = nextRank(id, 1)
    const d = nextRank(id, 2)
    if (b && d && (c.get(b) ?? 0) > 0 && (c.get(d) ?? 0) > 0) {
      c.set(id, n - 1)
      c.set(b, (c.get(b) ?? 0) - 1)
      c.set(d, (c.get(d) ?? 0) - 1)
      sets.push({ kind: 'chow', tiles: [id, b, d] })
      walk(i, sets, pair)
      sets.pop()
      c.set(id, n)
      c.set(b, (c.get(b) ?? 0) + 1)
      c.set(d, (c.get(d) ?? 0) + 1)
    }
  }

  walk(0, [], null)
  return results
}

/** Every full arrangement of the hand: declared melds plus a split of the concealed tiles. */
export function decompose(hand: Hand): Decomposition[] {
  if (hand.concealed.length + hand.melds.length * 3 !== 14) return []
  if (hand.melds.some((m) => m.kind === 'pair')) return []
  return decomposeConcealed(hand.concealed).map((d) => ({
    sets: [...hand.melds, ...d.sets],
    pair: d.pair,
  }))
}

/** The thirteen tiles of the orphans hand: every terminal and every honor. */
export const ORPHANS: readonly StandardId[] = [
  'C1', 'C9', 'D1', 'D9', 'B1', 'B9', 'WE', 'WS', 'WW', 'WN', 'RD', 'GD', 'WD',
]

/** Thirteen orphans: one of each terminal and honor, plus a duplicate of any of them. Fully concealed. */
export function isThirteenOrphans(hand: Hand): boolean {
  if (hand.melds.length > 0 || hand.concealed.length !== 14) return false
  const held = new Set(hand.concealed)
  return ORPHANS.every((o) => held.has(o)) && hand.concealed.every((t) => held.has(t) && ORPHANS.includes(t))
}

/** Four sets and a pair, or thirteen orphans? */
export function isWinning(hand: Hand): boolean {
  return decompose(hand).length > 0 || isThirteenOrphans(hand)
}

/** Which tiles would complete a 13-tile (or 3n + 1) hand. */
export function findWaits(hand: Hand): StandardId[] {
  if ((hand.concealed.length + hand.melds.length * 3) % 3 !== 1) return []
  const held = counts(allTiles(hand))
  const out: StandardId[] = []
  for (const id of STANDARD_TILES) {
    if ((held.get(id) ?? 0) >= 4) continue
    if (isWinning({ concealed: [...hand.concealed, id], melds: hand.melds })) out.push(id)
  }
  return out
}

/** Keep only tiles that can be part of a hand. */
export function standardOnly(ids: readonly string[]): StandardId[] {
  return ids.filter((id): id is StandardId => isStandard(id as StandardId))
}
