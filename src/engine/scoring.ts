/**
 * Hong Kong (Cantonese) scoring: count faan for the patterns a hand shows,
 * then turn faan into points on the "half spicy up" table.
 */
import { ORDER_OF_WINDS, flowersOfSeat } from './winds'
import { decompose, isThirteenOrphans, type Decomposition, type Hand, type Meld } from './hand'
import { TILE_BY_ID, windTile, type BonusId, type StandardId, type Wind } from './tiles'

export interface WinContext {
  /** Concealed tiles include the winning tile. */
  hand: Hand
  winningTile: StandardId
  /** Drawn from the wall by the winner, rather than claimed from a discard. */
  selfDrawn: boolean
  seatWind: Wind
  prevailingWind: Wind
  flowers: readonly BonusId[]
  /** Won on the replacement tile after declaring a kong. */
  afterKong?: boolean
  /** Won on the last tile of the wall, or on the discard that followed it. */
  lastTile?: boolean
  /** Won by claiming the tile another player was adding to a pung. */
  robbedKong?: boolean
  /** Dealer won on the deal. */
  heavenly?: boolean
  /** Non-dealer won on the dealer's first discard. */
  earthly?: boolean
}

export type PatternId =
  | 'allChows'
  | 'allPungs'
  | 'mixedOneSuit'
  | 'pureOneSuit'
  | 'dragonPung'
  | 'seatWindPung'
  | 'prevailingWindPung'
  | 'selfDrawn'
  | 'concealed'
  | 'seatFlower'
  | 'flowerSet'
  | 'noFlowers'
  | 'winOnKong'
  | 'lastTile'
  | 'robbingKong'
  | 'littleThreeDragons'
  | 'bigThreeDragons'
  | 'littleFourWinds'
  | 'bigFourWinds'
  | 'allHonors'
  | 'allTerminals'
  | 'thirteenOrphans'
  | 'nineGates'
  | 'fourKongs'
  | 'heavenly'
  | 'earthly'

export interface Pattern {
  id: PatternId
  name: string
  chinese: string
  /** Faan awarded; `limit` patterns score the limit regardless. */
  faan: number
  limit?: boolean
  description: string
}

/** Most tables cap a hand at 13 faan. */
export const LIMIT_FAAN = 13

export const PATTERNS: readonly Pattern[] = [
  { id: 'allChows', name: 'All chows', chinese: '平糊', faan: 1, description: 'Four chows and a pair that is not dragons or a wind that scores for you.' },
  { id: 'allPungs', name: 'All pungs', chinese: '對對糊', faan: 3, description: 'All four sets are pungs or kongs.' },
  { id: 'mixedOneSuit', name: 'Mixed one suit', chinese: '混一色', faan: 3, description: 'One suit plus winds or dragons.' },
  { id: 'pureOneSuit', name: 'Pure one suit', chinese: '清一色', faan: 7, description: 'Every tile from the same suit.' },
  { id: 'dragonPung', name: 'Dragon pung', chinese: '箭刻', faan: 1, description: 'A pung or kong of a dragon. Each one counts.' },
  { id: 'seatWindPung', name: 'Seat wind pung', chinese: '門風刻', faan: 1, description: 'A pung or kong of your seat wind.' },
  { id: 'prevailingWindPung', name: 'Prevailing wind pung', chinese: '圈風刻', faan: 1, description: 'A pung or kong of the round wind.' },
  { id: 'selfDrawn', name: 'Self-drawn', chinese: '自摸', faan: 1, description: 'You drew the winning tile yourself.' },
  { id: 'concealed', name: 'Concealed hand', chinese: '門前清', faan: 1, description: 'No set claimed from a discard.' },
  { id: 'seatFlower', name: 'Seat flower', chinese: '正花', faan: 1, description: 'A flower or season matching your seat. Each one counts.' },
  { id: 'flowerSet', name: 'Full set of flowers', chinese: '一台花', faan: 2, description: 'All four flowers, or all four seasons.' },
  { id: 'noFlowers', name: 'No flowers', chinese: '無花', faan: 1, description: 'Not a single flower or season.' },
  { id: 'winOnKong', name: 'Win on the kong', chinese: '槓上開花', faan: 1, description: 'Won on the replacement tile after a kong.' },
  { id: 'lastTile', name: 'Last tile', chinese: '海底撈月', faan: 1, description: 'Won on the last tile of the wall, or on the discard after it.' },
  { id: 'robbingKong', name: 'Robbing the kong', chinese: '搶槓', faan: 1, description: 'Won on the tile someone was adding to their pung.' },
  { id: 'littleThreeDragons', name: 'Little three dragons', chinese: '小三元', faan: 3, description: 'Two dragon pungs and a pair of the third. The pungs count too.' },
  { id: 'bigThreeDragons', name: 'Big three dragons', chinese: '大三元', faan: LIMIT_FAAN, limit: true, description: 'Pungs of all three dragons.' },
  { id: 'littleFourWinds', name: 'Little four winds', chinese: '小四喜', faan: LIMIT_FAAN, limit: true, description: 'Three wind pungs and a pair of the fourth.' },
  { id: 'bigFourWinds', name: 'Big four winds', chinese: '大四喜', faan: LIMIT_FAAN, limit: true, description: 'Pungs of all four winds.' },
  { id: 'allHonors', name: 'All honors', chinese: '字一色', faan: LIMIT_FAAN, limit: true, description: 'Only winds and dragons.' },
  { id: 'allTerminals', name: 'All terminals', chinese: '清么九', faan: LIMIT_FAAN, limit: true, description: 'Only ones and nines.' },
  { id: 'thirteenOrphans', name: 'Thirteen orphans', chinese: '十三么', faan: LIMIT_FAAN, limit: true, description: 'One of every terminal and honor, plus one more of any.' },
  { id: 'nineGates', name: 'Nine gates', chinese: '九蓮寶燈', faan: LIMIT_FAAN, limit: true, description: '1112345678999 of one suit, concealed, plus any tile of that suit.' },
  { id: 'fourKongs', name: 'Four kongs', chinese: '十八羅漢', faan: LIMIT_FAAN, limit: true, description: 'Four kongs and a pair.' },
  { id: 'heavenly', name: 'Heavenly hand', chinese: '天糊', faan: LIMIT_FAAN, limit: true, description: 'The dealer wins on the deal.' },
  { id: 'earthly', name: 'Earthly hand', chinese: '地糊', faan: LIMIT_FAAN, limit: true, description: 'Won on the dealer\'s first discard.' },
]

export const PATTERN_BY_ID: Record<PatternId, Pattern> = Object.fromEntries(
  PATTERNS.map((p) => [p.id, p]),
) as Record<PatternId, Pattern>

export interface ScoredPattern {
  id: PatternId
  faan: number
  times: number
}

export interface Score {
  patterns: ScoredPattern[]
  /** Total faan after the limit is applied. */
  total: number
  /** Whether a limit hand was found. */
  limit: boolean
  /** The arrangement that scored best; absent for thirteen orphans. */
  arrangement?: Decomposition
}

/** Points for a faan count on the half-spicy-up table (半辣上). */
const POINTS = [1, 2, 4, 8, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384]
export function pointsFor(faan: number): number {
  return POINTS[Math.max(0, Math.min(faan, LIMIT_FAAN))]
}

function isTriplet(m: Meld) {
  return m.kind === 'pung' || m.kind === 'kong'
}
function suitOf(id: StandardId) {
  const t = TILE_BY_ID[id]
  return t.kind === 'suit' ? t.suit : null
}
function isTerminal(id: StandardId) {
  const t = TILE_BY_ID[id]
  return t.kind === 'suit' && (t.rank === 1 || t.rank === 9)
}
function isHonorTile(id: StandardId) {
  return suitOf(id) === null
}

function isNineGates(hand: Hand): boolean {
  if (hand.melds.length > 0 || hand.concealed.length !== 14) return false
  const suit = suitOf(hand.concealed[0])
  if (!suit || hand.concealed.some((t) => suitOf(t) !== suit)) return false
  const counts = new Array<number>(10).fill(0)
  for (const t of hand.concealed) {
    const tile = TILE_BY_ID[t]
    if (tile.kind === 'suit') counts[tile.rank]++
  }
  const need = [0, 3, 1, 1, 1, 1, 1, 1, 1, 3]
  let extra = 0
  for (let r = 1; r <= 9; r++) {
    if (counts[r] < need[r]) return false
    extra += counts[r] - need[r]
  }
  return extra === 1
}

/** Patterns that depend only on the situation, not on how the tiles are arranged. */
function situational(ctx: WinContext): ScoredPattern[] {
  const out: ScoredPattern[] = []
  const add = (id: PatternId, times = 1) => out.push({ id, faan: PATTERN_BY_ID[id].faan * times, times })
  if (ctx.heavenly) add('heavenly')
  if (ctx.earthly) add('earthly')
  if (ctx.selfDrawn) add('selfDrawn')
  if (ctx.hand.melds.every((m) => !m.open)) add('concealed')
  if (ctx.afterKong) add('winOnKong')
  if (ctx.lastTile) add('lastTile')
  if (ctx.robbedKong) add('robbingKong')

  const mine = flowersOfSeat(ctx.seatWind)
  const seatFlowers = ctx.flowers.filter((f) => mine.includes(f)).length
  if (seatFlowers) add('seatFlower', seatFlowers)
  const flowers = ctx.flowers.filter((f) => f.startsWith('F')).length
  const seasons = ctx.flowers.filter((f) => f.startsWith('S')).length
  const sets = (flowers === 4 ? 1 : 0) + (seasons === 4 ? 1 : 0)
  if (sets) add('flowerSet', sets)
  if (ctx.flowers.length === 0) add('noFlowers')
  return out
}

function scoreArrangement(ctx: WinContext, sets: Meld[], pair: Meld): ScoredPattern[] {
  const out: ScoredPattern[] = []
  const add = (id: PatternId, times = 1) => out.push({ id, faan: PATTERN_BY_ID[id].faan * times, times })

  const tiles = [...sets.flatMap((s) => s.tiles), ...pair.tiles]
  const suits = new Set(tiles.map(suitOf).filter((s) => s !== null))
  const honors = tiles.filter(isHonorTile).length
  const seat = windTile(ctx.seatWind)
  const prevailing = windTile(ctx.prevailingWind)
  const pairTile = TILE_BY_ID[pair.tiles[0]]

  if (sets.every((s) => s.kind === 'chow')) {
    const scoringPair = pairTile.kind === 'dragon' || pair.tiles[0] === seat || pair.tiles[0] === prevailing
    if (!scoringPair) add('allChows')
  }
  if (sets.every(isTriplet)) add('allPungs')
  if (suits.size === 1) add(honors > 0 ? 'mixedOneSuit' : 'pureOneSuit')
  if (suits.size === 0) add('allHonors')
  if (tiles.every(isTerminal)) add('allTerminals')
  if (sets.every((s) => s.kind === 'kong')) add('fourKongs')

  const dragonPungs = sets.filter((s) => isTriplet(s) && TILE_BY_ID[s.tiles[0]].kind === 'dragon').length
  const windPungs = sets.filter((s) => isTriplet(s) && TILE_BY_ID[s.tiles[0]].kind === 'wind').length
  if (dragonPungs === 3) add('bigThreeDragons')
  else if (dragonPungs === 2 && pairTile.kind === 'dragon') add('littleThreeDragons')
  if (dragonPungs) add('dragonPung', dragonPungs)
  if (windPungs === 4) add('bigFourWinds')
  else if (windPungs === 3 && pairTile.kind === 'wind') add('littleFourWinds')
  if (sets.some((s) => isTriplet(s) && s.tiles[0] === seat)) add('seatWindPung')
  if (sets.some((s) => isTriplet(s) && s.tiles[0] === prevailing)) add('prevailingWindPung')
  return out
}

function finish(patterns: ScoredPattern[], arrangement?: Decomposition): Score {
  const limit = patterns.some((p) => PATTERN_BY_ID[p.id].limit)
  const raw = patterns.reduce((a, b) => a + b.faan, 0)
  return { patterns, total: limit ? LIMIT_FAAN : Math.min(raw, LIMIT_FAAN), limit, arrangement }
}

/** Score a complete hand, or null if it is not a win. The best arrangement counts. */
export function scoreHand(ctx: WinContext): Score | null {
  const extra = situational(ctx)
  if (isThirteenOrphans(ctx.hand)) {
    return finish([{ id: 'thirteenOrphans', faan: LIMIT_FAAN, times: 1 }, ...extra])
  }
  const options = decompose(ctx.hand)
  if (options.length === 0) return null
  let best: ScoredPattern[] | null = null
  let bestArrangement: Decomposition | undefined
  let bestTotal = -1
  for (const d of options) {
    const p = scoreArrangement(ctx, d.sets, d.pair)
    const t = p.reduce((a, b) => a + b.faan, 0)
    if (t > bestTotal) {
      best = p
      bestArrangement = d
      bestTotal = t
    }
  }
  const patterns = [...(best ?? [])]
  if (isNineGates(ctx.hand)) patterns.push({ id: 'nineGates', faan: LIMIT_FAAN, times: 1 })
  // Order: limit hands first, then by faan, then as listed.
  const all = [...patterns, ...extra].sort((a, b) => {
    const la = PATTERN_BY_ID[a.id].limit ? 1 : 0
    const lb = PATTERN_BY_ID[b.id].limit ? 1 : 0
    if (la !== lb) return lb - la
    if (a.faan !== b.faan) return b.faan - a.faan
    return PATTERNS.findIndex((p) => p.id === a.id) - PATTERNS.findIndex((p) => p.id === b.id)
  })
  return finish(all, bestArrangement)
}

export { ORDER_OF_WINDS }
