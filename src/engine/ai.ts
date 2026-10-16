/**
 * The three opponents. They see only what a player at the table sees: their
 * own rack, every open meld, every discard and every flower. Decisions are
 * deterministic for a given state, so a game replays from its seed.
 */
import {
  canSelfWin,
  dealerOf,
  kongOptions,
  prevailingOf,
  seatWind,
  unseenCounts,
  type Action,
  type Claim,
  type Decision,
  type GameMeld,
  type GameState,
  type Seat,
} from './game'
import { acceptance, shanten, TILE_INDEX } from './shanten'
import { TILE_BY_ID, isHonor, tileOrder, windTile, type StandardId, type Wind } from './tiles'

/**
 * Rough faan the hand is heading for, counting value pungs, suit focus and
 * all-pungs shape. Used to keep the AI from opening a hand that could never
 * reach the minimum.
 */
export function faanPotential(
  concealed: readonly StandardId[],
  melds: readonly GameMeld[],
  seat: Wind,
  prevailing: Wind,
): number {
  const all = [...concealed, ...melds.flatMap((m) => m.tiles)]
  const counts = new Map<StandardId, number>()
  for (const t of all) counts.set(t, (counts.get(t) ?? 0) + 1)
  let v = 0
  const valued = new Set<StandardId>(['RD', 'GD', 'WD', windTile(seat), windTile(prevailing)])
  for (const id of valued) {
    const n = counts.get(id) ?? 0
    const weight = id === windTile(seat) && id === windTile(prevailing) ? 2 : 1
    if (n >= 3) v += weight
    else if (n === 2) v += 0.55 * weight
    else if (n === 1) v += 0.12 * weight
  }
  const bySuit = { characters: 0, dots: 0, bamboo: 0 }
  let honors = 0
  for (const t of all) {
    const tile = TILE_BY_ID[t]
    if (tile.kind === 'suit') bySuit[tile.suit]++
    else honors++
  }
  const main = Math.max(bySuit.characters, bySuit.dots, bySuit.bamboo)
  const others = all.length - main - honors
  const full = honors > 0 ? 3 : 7
  if (others === 0) v += full
  else if (others === 1) v += full * 0.45
  else if (others === 2) v += full * 0.2
  else if (others === 3) v += full * 0.06
  if (!melds.some((m) => m.kind === 'chow')) {
    let pairsUp = 0
    for (const n of counts.values()) if (n >= 2) pairsUp++
    pairsUp += melds.length
    if (pairsUp >= 5) v += 3
    else if (pairsUp === 4) v += 1.8
    else if (pairsUp === 3) v += 0.6
  }
  if (melds.every((m) => !m.open)) v += 1
  return v
}

interface Eval {
  shanten: number
  accept: number
  potential: number
  score: number
}

function evaluate(
  s: GameState,
  seat: Seat,
  concealed: readonly StandardId[],
  melds: readonly GameMeld[],
  unseen: readonly number[],
): Eval {
  const a = acceptance(concealed, melds.length, unseen)
  const potential = faanPotential(concealed, melds, seatWind(s, seat), prevailingOf(s))
  const need = s.rules.minimumFaan
  // Below the minimum, a tile of progress is worth less than a tile of value.
  const valueWeight = potential >= need ? 4 : 10
  const score = -a.shanten * 100 + Math.min(a.count, 40) * 2 + potential * valueWeight
  return { shanten: a.shanten, accept: a.count, potential, score }
}

/** How safe a tile is to throw: copies already in the rivers, and loneliness. */
function safety(s: GameState, tile: StandardId): number {
  let seen = 0
  for (const p of s.players) for (const t of p.discards) if (t === tile) seen++
  return Math.min(seen, 3)
}

/** The discard that keeps the hand closest to a win worth playing for. */
export function chooseDiscard(s: GameState, seat: Seat): StandardId {
  const p = s.players[seat]
  const unseen = unseenCounts(s, seat)
  let best: StandardId | null = null
  let bestScore = -Infinity
  for (const cand of new Set(p.concealed)) {
    const rest = [...p.concealed]
    rest.splice(rest.indexOf(cand), 1)
    const e = evaluate(s, seat, rest, p.melds, unseen)
    const isolated = p.concealed.filter((t) => t === cand).length === 1
    const honorPenalty = isHonor(cand) && isolated && unseen[TILE_INDEX[cand]] <= 1 ? 3 : 0
    const score = e.score + safety(s, cand) * 1.5 + honorPenalty - tileOrder(cand) * 0.001
    if (score > bestScore) {
      bestScore = score
      best = cand
    }
  }
  return best ?? p.concealed[0]
}

/** What the AI does on its own turn: win, declare a kong, or discard. */
export function aiTurn(s: GameState, seat: Seat): Action {
  if (canSelfWin(s, seat)) return { type: 'selfWin', seat }
  const p = s.players[seat]
  for (const k of kongOptions(s, seat)) {
    if (k.kind === 'added') return { type: 'kong', seat, tile: k.tile }
    const rest = p.concealed.filter((t) => t !== k.tile)
    const before = shanten(p.concealed, p.melds.length)
    const after = shanten(rest, p.melds.length + 1)
    if (after <= before) return { type: 'kong', seat, tile: k.tile }
  }
  return { type: 'discard', seat, tile: chooseDiscard(s, seat) }
}

/** Whether to take a discard. A win always; a set only if it helps and the hand stays worth winning. */
export function aiClaim(s: GameState, seat: Seat, options: readonly Claim[]): Decision {
  if (options.some((o) => o.kind === 'win')) return { kind: 'win' }
  const w = s.claim
  if (!w) return { kind: 'pass' }
  const p = s.players[seat]
  const unseen = unseenCounts(s, seat)
  const before = shanten(p.concealed, p.melds.length)
  const need = Math.max(0, s.rules.minimumFaan - 1)
  let best: Decision = { kind: 'pass' }
  let bestScore = -Infinity
  for (const o of options) {
    const rest = [...p.concealed]
    let meld: GameMeld
    if (o.kind === 'chow') {
      for (const t of o.tiles) rest.splice(rest.indexOf(t), 1)
      meld = { kind: 'chow', tiles: [...o.tiles, w.tile], open: true }
    } else {
      const n = o.kind === 'kong' ? 3 : 2
      for (let i = 0; i < n; i++) rest.splice(rest.indexOf(w.tile), 1)
      meld = { kind: o.kind === 'kong' ? 'kong' : 'pung', tiles: new Array<StandardId>(n + 1).fill(w.tile), open: true }
    }
    const melds = [...p.melds, meld]
    // Best discard after the claim.
    let after: Eval | null = null
    for (const cand of new Set(rest)) {
      const r = [...rest]
      r.splice(r.indexOf(cand), 1)
      const e = evaluate(s, seat, r, melds, unseen)
      if (!after || e.score > after.score) after = e
    }
    if (!after) continue
    const valued = isHonor(w.tile) && o.kind !== 'chow'
    const progress = after.shanten < before
    if (!progress && !(valued && after.shanten <= before)) continue
    if (after.potential < need) continue
    const score = after.score + (o.kind === 'kong' ? 5 : 0)
    if (score > bestScore) {
      bestScore = score
      best = o
    }
  }
  return best
}

/** Decisions for every AI seat that still owes one. */
export function aiDecisions(s: GameState, human: Seat): Partial<Record<Seat, Decision>> {
  const out: Partial<Record<Seat, Decision>> = {}
  if (!s.claim) return out
  for (const seat of [0, 1, 2, 3] as Seat[]) {
    if (seat === human) continue
    const opts = s.claim.options[seat]
    if (opts && !s.claim.decisions[seat]) out[seat] = aiClaim(s, seat, opts)
  }
  return out
}

export { dealerOf }
