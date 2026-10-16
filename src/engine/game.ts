/**
 * The table. A plain, serialisable game state and a reducer over it.
 * Nothing here knows which seat is human: the UI decides when to ask the
 * AI and when to wait for a click.
 */
import { isWinning, type Hand, type Meld } from './hand'
import { mulberry32, shuffle } from './rng'
import { pointsFor, scoreHand, type Score, type WinContext } from './scoring'
import {
  FULL_SET,
  STANDARD_TILES,
  TILE_BY_ID,
  WINDS,
  isStandard,
  sortTiles,
  suitTile,
  type BonusId,
  type Rank,
  type StandardId,
  type TileId,
  type Wind,
} from './tiles'

export type Seat = 0 | 1 | 2 | 3
export const SEATS: readonly Seat[] = [0, 1, 2, 3]

export interface Rules {
  /** Faan needed to declare a win. Hong Kong tables usually play 3. */
  minimumFaan: number
  /** One round is four dealerships; a full game is four rounds. */
  rounds: 1 | 4
}
export const DEFAULT_RULES: Rules = { minimumFaan: 3, rounds: 4 }

export interface GameMeld extends Meld {
  /** Seat the claimed tile came from. */
  from?: Seat
  /** The claimed tile, shown turned. */
  claimed?: StandardId
}

export interface Player {
  concealed: StandardId[]
  melds: GameMeld[]
  flowers: BonusId[]
  discards: StandardId[]
  score: number
}

export type Claim =
  | { kind: 'chow'; tiles: [StandardId, StandardId] }
  | { kind: 'pung' }
  | { kind: 'kong' }
  | { kind: 'win' }
export type Decision = Claim | { kind: 'pass' }

export interface ClaimWindow {
  tile: StandardId
  from: Seat
  /** A discard, or a tile being added to a pung (which can only be robbed for a win). */
  source: 'discard' | 'kong'
  options: Partial<Record<Seat, Claim[]>>
  decisions: Partial<Record<Seat, Decision>>
}

export type Phase = 'discard' | 'claim' | 'handEnd' | 'gameEnd'

export interface WinResult {
  kind: 'win'
  winner: Seat
  /** Who discarded the winning tile; null when self-drawn. */
  from: Seat | null
  score: Score
  points: number
  deltas: number[]
  hand: Hand
  winningTile: StandardId
  flowers: BonusId[]
}
export interface DrawResult {
  kind: 'draw'
  deltas: number[]
}
export type HandResult = WinResult | DrawResult

export type LogEntry =
  | { kind: 'deal'; dealer: Seat; prevailing: Wind; hand: number }
  | { kind: 'flower'; seat: Seat; tile: BonusId }
  | { kind: 'discard'; seat: Seat; tile: StandardId }
  | { kind: 'chow' | 'pung' | 'kong'; seat: Seat; tile: StandardId; from: Seat }
  | { kind: 'concealedKong' | 'addedKong'; seat: Seat; tile: StandardId }
  | { kind: 'win'; seat: Seat; from: Seat | null; tile: StandardId; faan: number; points: number }
  | { kind: 'exhausted' }

export interface GameState {
  rules: Rules
  seed: number
  /** Hands dealt so far; drives the shuffle. */
  handIndex: number
  /** Dealer changes so far. Dealer is `dealerIndex % 4`; the round wind advances every four. */
  dealerIndex: number
  players: Player[]
  wall: TileId[]
  current: Seat
  phase: Phase
  /** The tile the current player just drew, kept apart in the rack. */
  drawn: StandardId | null
  lastDiscard: { seat: Seat; tile: StandardId } | null
  claim: ClaimWindow | null
  result: HandResult | null
  log: LogEntry[]
  /** Discards so far this hand. */
  discardCount: number
  /** Current player drew a replacement after a kong. */
  afterKong: boolean
  /** The most recent draw emptied the wall. */
  lastTile: boolean
}

export type Action =
  | { type: 'discard'; seat: Seat; tile: StandardId }
  | { type: 'selfWin'; seat: Seat }
  | { type: 'kong'; seat: Seat; tile: StandardId }
  | { type: 'decide'; decisions: Partial<Record<Seat, Decision>> }
  | { type: 'nextHand' }
  | { type: 'newGame'; rules: Rules; seed: number }

// Geometry of the table

export function dealerOf(s: GameState): Seat {
  return (s.dealerIndex % 4) as Seat
}
export function prevailingOf(s: GameState): Wind {
  return WINDS[Math.floor(s.dealerIndex / 4) % 4]
}
export function seatWind(s: GameState, seat: Seat): Wind {
  return WINDS[(seat - dealerOf(s) + 4) % 4]
}
export function nextSeat(seat: Seat): Seat {
  return ((seat + 1) % 4) as Seat
}
/** Hand number within the round, 1 to 4 (more if the dealer repeats). */
export function handInRound(s: GameState): number {
  return (s.dealerIndex % 4) + 1
}
export function totalRounds(s: GameState): number {
  return s.rules.rounds
}

export class IllegalAction extends Error {}
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new IllegalAction(msg)
}

function count(tiles: readonly StandardId[], id: StandardId): number {
  let n = 0
  for (const t of tiles) if (t === id) n++
  return n
}
function removeOne(tiles: StandardId[], id: StandardId): boolean {
  const i = tiles.indexOf(id)
  if (i === -1) return false
  tiles.splice(i, 1)
  return true
}

// Dealing and drawing

/** Take a tile from the wall for a seat, setting flowers aside and replacing them from the back. */
function drawTile(s: GameState, seat: Seat, fromBack: boolean): StandardId | null {
  for (;;) {
    const t = fromBack ? s.wall.pop() : s.wall.shift()
    if (t === undefined) return null
    if (isStandard(t)) return t
    s.players[seat].flowers.push(t)
    s.log.push({ kind: 'flower', seat, tile: t })
    fromBack = true
  }
}

function deal(s: GameState): void {
  const rng = mulberry32((s.seed ^ Math.imul(s.handIndex + 1, 0x9e3779b9)) >>> 0)
  s.wall = shuffle(FULL_SET, rng)
  for (const p of s.players) {
    p.concealed = []
    p.melds = []
    p.flowers = []
    p.discards = []
  }
  const dealer = dealerOf(s)
  s.log = [{ kind: 'deal', dealer, prevailing: prevailingOf(s), hand: handInRound(s) }]
  s.result = null
  s.claim = null
  s.lastDiscard = null
  s.discardCount = 0
  s.afterKong = false
  s.lastTile = false
  for (let i = 0; i < 13; i++)
    for (let k = 0; k < 4; k++) {
      const seat = ((dealer + k) % 4) as Seat
      s.players[seat].concealed.push(drawTile(s, seat, false)!)
    }
  const fourteenth = drawTile(s, dealer, false)!
  for (const p of s.players) p.concealed = sortTiles(p.concealed)
  s.players[dealer].concealed.push(fourteenth)
  s.drawn = fourteenth
  s.current = dealer
  s.phase = 'discard'
}

function startTurn(s: GameState, seat: Seat): void {
  const t = drawTile(s, seat, false)
  if (t === null) return endExhausted(s)
  s.players[seat].concealed.push(t)
  s.drawn = t
  s.current = seat
  s.phase = 'discard'
  s.afterKong = false
  s.lastTile = s.wall.length === 0
  s.claim = null
}

function drawReplacement(s: GameState, seat: Seat): void {
  const t = drawTile(s, seat, true)
  if (t === null) return endExhausted(s)
  s.players[seat].concealed.push(t)
  s.drawn = t
  s.current = seat
  s.phase = 'discard'
  s.afterKong = true
  s.lastTile = s.wall.length === 0
  s.claim = null
}

// Winning

function winContext(
  s: GameState,
  seat: Seat,
  tile: StandardId,
  selfDrawn: boolean,
  source: 'discard' | 'kong' | 'self',
): WinContext {
  const p = s.players[seat]
  const concealed = selfDrawn ? [...p.concealed] : [...p.concealed, tile]
  const dealer = dealerOf(s)
  return {
    hand: { concealed: sortTiles(concealed), melds: p.melds },
    winningTile: tile,
    selfDrawn,
    seatWind: seatWind(s, seat),
    prevailingWind: prevailingOf(s),
    flowers: p.flowers,
    afterKong: selfDrawn && s.afterKong,
    lastTile: selfDrawn ? s.lastTile : s.wall.length === 0 && source === 'discard',
    robbedKong: source === 'kong',
    heavenly: selfDrawn && seat === dealer && s.discardCount === 0 && p.melds.length === 0,
    earthly: !selfDrawn && seat !== dealer && s.discardCount === 1 && p.melds.length === 0 && source === 'discard',
  }
}

function meetsMinimum(s: GameState, score: Score | null): score is Score {
  return score !== null && score.total >= s.rules.minimumFaan
}

/** The score if this seat can win on the tile, else null. */
export function winOn(s: GameState, seat: Seat, tile: StandardId, source: 'discard' | 'kong'): Score | null {
  const p = s.players[seat]
  if (!isWinning({ concealed: [...p.concealed, tile], melds: p.melds })) return null
  const score = scoreHand(winContext(s, seat, tile, false, source))
  return meetsMinimum(s, score) ? score : null
}

/** The score if the current player can declare a self-drawn win, else null. */
export function canSelfWin(s: GameState, seat: Seat): Score | null {
  if (s.phase !== 'discard' || s.current !== seat || s.drawn === null) return null
  const p = s.players[seat]
  if (!isWinning({ concealed: p.concealed, melds: p.melds })) return null
  const score = scoreHand(winContext(s, seat, s.drawn, true, 'self'))
  return meetsMinimum(s, score) ? score : null
}

export interface KongOption {
  tile: StandardId
  kind: 'concealed' | 'added'
}

/** Kongs the current player may declare now. */
export function kongOptions(s: GameState, seat: Seat): KongOption[] {
  if (s.phase !== 'discard' || s.current !== seat || s.wall.length === 0) return []
  const p = s.players[seat]
  const out: KongOption[] = []
  for (const id of new Set(p.concealed)) {
    if (count(p.concealed, id) === 4) out.push({ tile: id, kind: 'concealed' })
    else if (p.melds.some((m) => m.kind === 'pung' && m.tiles[0] === id)) out.push({ tile: id, kind: 'added' })
  }
  return out
}

function chowOptions(concealed: readonly StandardId[], tile: StandardId): Claim[] {
  const t = TILE_BY_ID[tile]
  if (t.kind !== 'suit') return []
  const at = (r: number) => (r >= 1 && r <= 9 ? suitTile(t.suit, r as Rank) : null)
  const out: Claim[] = []
  for (const [a, b] of [
    [t.rank - 2, t.rank - 1],
    [t.rank - 1, t.rank + 1],
    [t.rank + 1, t.rank + 2],
  ]) {
    const x = at(a)
    const y = at(b)
    if (x && y && concealed.includes(x) && concealed.includes(y)) out.push({ kind: 'chow', tiles: [x, y] })
  }
  return out
}

function finishWin(s: GameState, winner: Seat, from: Seat | null, ctx: WinContext): void {
  const score = scoreHand(ctx)
  assert(meetsMinimum(s, score), 'not a winning hand')
  const points = pointsFor(score.total)
  const deltas = [0, 0, 0, 0]
  for (const o of SEATS) {
    if (o === winner) continue
    const pay = from === null || o === from ? points : Math.ceil(points / 2)
    deltas[o] -= pay
    deltas[winner] += pay
  }
  for (const o of SEATS) s.players[o].score += deltas[o]
  s.result = {
    kind: 'win',
    winner,
    from,
    score,
    points,
    deltas,
    hand: ctx.hand,
    winningTile: ctx.winningTile,
    flowers: [...s.players[winner].flowers],
  }
  s.log.push({ kind: 'win', seat: winner, from, tile: ctx.winningTile, faan: score.total, points })
  s.phase = 'handEnd'
  s.claim = null
  s.lastDiscard = null
  s.drawn = null
}

function endExhausted(s: GameState): void {
  s.result = { kind: 'draw', deltas: [0, 0, 0, 0] }
  s.log.push({ kind: 'exhausted' })
  s.phase = 'handEnd'
  s.claim = null
  s.drawn = null
}

// Claims

function openClaims(s: GameState, tile: StandardId, from: Seat, source: 'discard' | 'kong'): void {
  const options: ClaimWindow['options'] = {}
  for (const o of SEATS) {
    if (o === from) continue
    const p = s.players[o]
    const opts: Claim[] = []
    if (winOn(s, o, tile, source)) opts.push({ kind: 'win' })
    if (source === 'discard' && s.wall.length > 0) {
      const n = count(p.concealed, tile)
      if (n >= 2) opts.push({ kind: 'pung' })
      if (n >= 3) opts.push({ kind: 'kong' })
      if (o === nextSeat(from)) opts.push(...chowOptions(p.concealed, tile))
    }
    if (opts.length) options[o] = opts
  }
  if (Object.keys(options).length === 0) return afterNoClaim(s, from, tile, source)
  s.phase = 'claim'
  s.claim = { tile, from, source, options, decisions: {} }
}

function afterNoClaim(s: GameState, from: Seat, tile: StandardId, source: 'discard' | 'kong'): void {
  s.claim = null
  if (source === 'kong') return completeAddedKong(s, from, tile)
  if (s.wall.length === 0) return endExhausted(s)
  startTurn(s, nextSeat(from))
}

function completeAddedKong(s: GameState, seat: Seat, tile: StandardId): void {
  const p = s.players[seat]
  const m = p.melds.find((x) => x.kind === 'pung' && x.tiles[0] === tile)
  assert(m, 'no pung to extend')
  m.kind = 'kong'
  m.tiles = [tile, tile, tile, tile]
  s.log.push({ kind: 'addedKong', seat, tile })
  drawReplacement(s, seat)
}

function claimSet(s: GameState, seat: Seat, claim: Claim): void {
  const w = s.claim!
  const p = s.players[seat]
  const discarder = s.players[w.from]
  assert(discarder.discards[discarder.discards.length - 1] === w.tile, 'claimed tile is not the last discard')
  discarder.discards.pop()
  let tiles: StandardId[]
  if (claim.kind === 'chow') {
    for (const t of claim.tiles) assert(removeOne(p.concealed, t), 'chow tile missing')
    tiles = sortTiles([...claim.tiles, w.tile])
  } else {
    const n = claim.kind === 'kong' ? 3 : 2
    for (let i = 0; i < n; i++) assert(removeOne(p.concealed, w.tile), 'pung tile missing')
    tiles = new Array<StandardId>(n + 1).fill(w.tile)
  }
  p.melds.push({ kind: claim.kind === 'chow' ? 'chow' : claim.kind === 'kong' ? 'kong' : 'pung', tiles, open: true, from: w.from, claimed: w.tile })
  s.log.push({ kind: claim.kind as 'chow' | 'pung' | 'kong', seat, tile: w.tile, from: w.from })
  s.lastDiscard = null
  s.claim = null
  if (claim.kind === 'kong') return drawReplacement(s, seat)
  s.current = seat
  s.phase = 'discard'
  s.drawn = null
  s.afterKong = false
}

function resolveClaims(s: GameState): void {
  const w = s.claim!
  const order = [1, 2, 3].map((k) => ((w.from + k) % 4) as Seat)
  const chosen = (seat: Seat) => {
    const d = w.decisions[seat]
    if (!d || d.kind === 'pass') return null
    const legal = (w.options[seat] ?? []).some(
      (o) => o.kind === d.kind && (o.kind !== 'chow' || d.kind !== 'chow' || (o.tiles[0] === d.tiles[0] && o.tiles[1] === d.tiles[1])),
    )
    return legal ? d : null
  }
  for (const o of order) {
    if (chosen(o)?.kind === 'win') {
      const ctx = winContext(s, o, w.tile, false, w.source)
      if (w.source === 'discard') s.players[w.from].discards.pop()
      return finishWin(s, o, w.from, ctx)
    }
  }
  if (w.source === 'kong') return completeAddedKong(s, w.from, w.tile)
  for (const o of order) {
    const d = chosen(o)
    if (d && (d.kind === 'pung' || d.kind === 'kong')) return claimSet(s, o, d)
  }
  for (const o of order) {
    const d = chosen(o)
    if (d && d.kind === 'chow') return claimSet(s, o, d)
  }
  afterNoClaim(s, w.from, w.tile, w.source)
}

// Actions

function discard(s: GameState, seat: Seat, tile: StandardId): void {
  assert(s.phase === 'discard' && s.current === seat, 'not your turn to discard')
  const p = s.players[seat]
  assert(removeOne(p.concealed, tile), 'tile not in hand')
  p.concealed = sortTiles(p.concealed)
  p.discards.push(tile)
  s.lastDiscard = { seat, tile }
  s.drawn = null
  s.afterKong = false
  s.discardCount++
  s.log.push({ kind: 'discard', seat, tile })
  openClaims(s, tile, seat, 'discard')
}

function selfWin(s: GameState, seat: Seat): void {
  assert(s.phase === 'discard' && s.current === seat && s.drawn !== null, 'cannot win now')
  finishWin(s, seat, null, winContext(s, seat, s.drawn, true, 'self'))
}

function declareKong(s: GameState, seat: Seat, tile: StandardId): void {
  const opt = kongOptions(s, seat).find((k) => k.tile === tile)
  assert(opt, 'no such kong')
  const p = s.players[seat]
  if (opt.kind === 'concealed') {
    for (let i = 0; i < 4; i++) removeOne(p.concealed, tile)
    p.melds.push({ kind: 'kong', tiles: [tile, tile, tile, tile], open: false })
    s.log.push({ kind: 'concealedKong', seat, tile })
    return drawReplacement(s, seat)
  }
  removeOne(p.concealed, tile)
  p.concealed = sortTiles(p.concealed)
  s.drawn = null
  openClaims(s, tile, seat, 'kong')
}

function decide(s: GameState, decisions: Partial<Record<Seat, Decision>>): void {
  assert(s.phase === 'claim' && s.claim, 'no claim window open')
  const w = s.claim
  for (const seat of SEATS) {
    const d = decisions[seat]
    if (d && w.options[seat]) w.decisions[seat] = d
  }
  const waiting = SEATS.filter((o) => w.options[o] && !w.decisions[o])
  if (waiting.length === 0) resolveClaims(s)
}

function nextHand(s: GameState): void {
  assert(s.phase === 'handEnd' && s.result, 'hand is not over')
  const dealerStays = s.result.kind === 'draw' || s.result.winner === dealerOf(s)
  if (!dealerStays) s.dealerIndex++
  if (s.dealerIndex >= s.rules.rounds * 4) {
    s.phase = 'gameEnd'
    s.claim = null
    return
  }
  s.handIndex++
  deal(s)
}

export function newGame(rules: Rules = DEFAULT_RULES, seed = 1): GameState {
  const s: GameState = {
    rules,
    seed,
    handIndex: 0,
    dealerIndex: 0,
    players: SEATS.map(() => ({ concealed: [], melds: [], flowers: [], discards: [], score: 0 })),
    wall: [],
    current: 0,
    phase: 'discard',
    drawn: null,
    lastDiscard: null,
    claim: null,
    result: null,
    log: [],
    discardCount: 0,
    afterKong: false,
    lastTile: false,
  }
  deal(s)
  return s
}

/** Apply an action and return the new state. Illegal actions throw. */
export function reduce(state: GameState, action: Action): GameState {
  if (action.type === 'newGame') return newGame(action.rules, action.seed)
  const s = structuredClone(state)
  switch (action.type) {
    case 'discard':
      discard(s, action.seat, action.tile)
      break
    case 'selfWin':
      selfWin(s, action.seat)
      break
    case 'kong':
      declareKong(s, action.seat, action.tile)
      break
    case 'decide':
      decide(s, action.decisions)
      break
    case 'nextHand':
      nextHand(s)
      break
  }
  return s
}

// Views

/** Copies of each face this seat cannot see: 4 minus own hand, open melds, discards and the claim tile. */
export function unseenCounts(s: GameState, seat: Seat): number[] {
  const seen = new Map<StandardId, number>()
  const add = (id: StandardId) => seen.set(id, (seen.get(id) ?? 0) + 1)
  for (const t of s.players[seat].concealed) add(t)
  for (const o of SEATS) {
    const p = s.players[o]
    for (const t of p.discards) add(t)
    for (const m of p.melds) if (m.open || o === seat) for (const t of m.tiles) add(t)
  }
  if (s.claim?.source === 'kong') add(s.claim.tile)
  return STANDARD_TILES.map((id) => 4 - (seen.get(id) ?? 0))
}

/** Total tiles on the table; always 144. Used by tests. */
export function tileCount(s: GameState): number {
  let n = s.wall.length
  for (const p of s.players)
    n += p.concealed.length + p.flowers.length + p.discards.length + p.melds.reduce((a, m) => a + m.tiles.length, 0)
  // A tile being added to a pung sits in limbo while others may rob it.
  if (s.claim?.source === 'kong') n++
  // A claimed winning tile lives only in the result's hand snapshot.
  if (s.result?.kind === 'win' && s.result.from !== null) n++
  return n
}
