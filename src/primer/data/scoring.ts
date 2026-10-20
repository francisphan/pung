/**
 * Hong Kong (Cantonese) scoring: count faan for the patterns a hand shows.
 * Only the beginner patterns are modelled. Limit hands are listed in the
 * lesson copy but not scored here.
 */
import { decompose, type Hand, type Meld } from '../../engine/hand'
import { TILE_BY_ID, windTile, type StandardId, type Wind } from '../../engine/tiles'

export interface WinContext {
  hand: Hand
  /** The tile that completed the hand. */
  winningTile: StandardId
  /** Drawn from the wall by the winner, rather than claimed from a discard. */
  selfDrawn: boolean
  seatWind: Wind
  prevailingWind: Wind
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

export interface Pattern {
  id: PatternId
  name: string
  chinese: string
  faan: number
  /** Plain description used in the lesson and the exercise checklist. */
  description: string
  /** Where common rule sets disagree, say what this app does. */
  note?: string
}

export const PATTERNS: readonly Pattern[] = [
  {
    id: 'allChows',
    name: 'All chows',
    chinese: '平糊',
    faan: 1,
    description:
      'All four sets are chows, and the pair is not dragons or a wind that would score for you.',
    note: 'Many tables also require a two-sided wait. We do not.',
  },
  {
    id: 'allPungs',
    name: 'All pungs',
    chinese: '對對糊',
    faan: 3,
    description: 'All four sets are pungs or kongs.',
  },
  {
    id: 'mixedOneSuit',
    name: 'Mixed one suit',
    chinese: '混一色',
    faan: 3,
    description: 'Only one suit, plus at least one wind or dragon.',
  },
  {
    id: 'pureOneSuit',
    name: 'Pure one suit',
    chinese: '清一色',
    faan: 7,
    description: 'Every tile is from the same suit, no winds or dragons at all.',
    note: 'Some tables score this 6.',
  },
  {
    id: 'dragonPung',
    name: 'Dragon pung',
    chinese: '箭刻',
    faan: 1,
    description: 'A pung or kong of any dragon. Each one counts.',
  },
  {
    id: 'seatWindPung',
    name: 'Seat wind pung',
    chinese: '門風刻',
    faan: 1,
    description: 'A pung or kong of your own seat wind.',
  },
  {
    id: 'prevailingWindPung',
    name: 'Prevailing wind pung',
    chinese: '圈風刻',
    faan: 1,
    description: 'A pung or kong of the wind of the current round. If it is also your seat wind, both count.',
  },
  {
    id: 'selfDrawn',
    name: 'Self-drawn',
    chinese: '自摸',
    faan: 1,
    description: 'You drew the winning tile yourself rather than claiming a discard.',
  },
  {
    id: 'concealed',
    name: 'Concealed hand',
    chinese: '門前清',
    faan: 1,
    description: 'You never claimed a discard for a set, so nothing is face up (a concealed kong is fine).',
  },
]

export const PATTERN_BY_ID: Record<PatternId, Pattern> = Object.fromEntries(
  PATTERNS.map((p) => [p.id, p]),
) as Record<PatternId, Pattern>

/** Minimum faan to declare a win. Many tables play 3; some play 1 or 0. */
export const MINIMUM_FAAN = 3
/** Most tables cap a hand at 13 faan; some at 10. */
export const LIMIT_FAAN = 13

export interface RareHand {
  name: string
  chinese: string
  /** A fixed value, or the limit itself. */
  faan: number | 'limit'
  description: string
}

/**
 * The named hands, worth a fixed amount instead of a count. Listed for the
 * lesson; the drill above scores only the common patterns.
 */
export const RARE_HANDS: readonly RareHand[] = [
  {
    name: 'Little three dragons',
    chinese: '小三元',
    faan: 5,
    description: 'Two dragon pungs and a pair of the third dragon: three for the shape, plus one for each pung.',
  },
  {
    name: 'Jade dragon',
    chinese: '翡翠龍',
    faan: 10,
    description: 'Three pungs of bamboo, a pung of the green dragon and a pair of bamboo.',
  },
  {
    name: 'Ruby dragon',
    chinese: '紅寶石龍',
    faan: 10,
    description: 'Three pungs of characters, a pung of the red dragon and a pair of characters.',
  },
  {
    name: 'Pearl dragon',
    chinese: '珍珠龍',
    faan: 10,
    description: 'Three pungs of dots, a pung of the white dragon and a pair of dots.',
  },
  { name: 'Big three dragons', chinese: '大三元', faan: 'limit', description: 'Pungs of all three dragons.' },
  {
    name: 'Little four winds',
    chinese: '小四喜',
    faan: 'limit',
    description: 'Pungs of three winds and a pair of the fourth.',
  },
  { name: 'Big four winds', chinese: '大四喜', faan: 'limit', description: 'Pungs of all four winds.' },
  { name: 'All honors', chinese: '字一色', faan: 'limit', description: 'Nothing but winds and dragons.' },
  { name: 'All terminals', chinese: '清么九', faan: 'limit', description: 'Nothing but ones and nines.' },
  {
    name: 'Thirteen orphans',
    chinese: '十三么',
    faan: 'limit',
    description: 'One of each one, nine, wind and dragon, plus a second copy of any of them.',
  },
  {
    name: 'Nine gates',
    chinese: '九蓮寶燈',
    faan: 'limit',
    description: '1112345678999 of one suit, concealed, plus any tile of that suit.',
  },
  { name: 'Four kongs', chinese: '十八羅漢', faan: 'limit', description: 'Four kongs and a pair.' },
  { name: 'Heavenly hand', chinese: '天糊', faan: 'limit', description: 'The dealer wins on the deal.' },
  { name: 'Earthly hand', chinese: '地糊', faan: 'limit', description: 'A win on the dealer’s first discard.' },
]

export interface ScoredPattern {
  id: PatternId
  faan: number
  /** How many times the pattern occurs, e.g. two dragon pungs. */
  times: number
}

export interface Score {
  patterns: ScoredPattern[]
  /** Total faan after the limit is applied. */
  total: number
  meetsMinimum: boolean
}

function isTriplet(m: Meld) {
  return m.kind === 'pung' || m.kind === 'kong'
}

function suitOf(id: StandardId) {
  const t = TILE_BY_ID[id]
  return t.kind === 'suit' ? t.suit : null
}

function scoreArrangement(ctx: WinContext, sets: Meld[], pair: Meld): ScoredPattern[] {
  const out: ScoredPattern[] = []
  const add = (id: PatternId, times = 1) =>
    out.push({ id, faan: PATTERN_BY_ID[id].faan * times, times })

  const tiles = [...sets.flatMap((s) => s.tiles), ...pair.tiles]
  const suits = new Set(tiles.map(suitOf).filter((s) => s !== null))
  const honors = tiles.filter((t) => suitOf(t) === null).length
  const seat = windTile(ctx.seatWind)
  const prevailing = windTile(ctx.prevailingWind)

  if (sets.every((s) => s.kind === 'chow')) {
    const p = TILE_BY_ID[pair.tiles[0]]
    const scoringPair =
      p.kind === 'dragon' || pair.tiles[0] === seat || pair.tiles[0] === prevailing
    if (!scoringPair) add('allChows')
  }
  if (sets.every(isTriplet)) add('allPungs')
  if (suits.size === 1) add(honors > 0 ? 'mixedOneSuit' : 'pureOneSuit')

  const dragonPungs = sets.filter(
    (s) => isTriplet(s) && TILE_BY_ID[s.tiles[0]].kind === 'dragon',
  ).length
  if (dragonPungs) add('dragonPung', dragonPungs)
  if (sets.some((s) => isTriplet(s) && s.tiles[0] === seat)) add('seatWindPung')
  if (sets.some((s) => isTriplet(s) && s.tiles[0] === prevailing)) add('prevailingWindPung')

  if (ctx.selfDrawn) add('selfDrawn')
  if (ctx.hand.melds.every((m) => !m.open)) add('concealed')
  return out
}

/** Score a complete hand. With several possible arrangements, the best one counts. */
export function scoreHand(ctx: WinContext): Score | null {
  const options = decompose(ctx.hand)
  if (options.length === 0) return null
  let best: ScoredPattern[] | null = null
  let bestTotal = -1
  for (const d of options) {
    const p = scoreArrangement(ctx, d.sets, d.pair)
    const t = p.reduce((a, b) => a + b.faan, 0)
    if (t > bestTotal) {
      best = p
      bestTotal = t
    }
  }
  const total = Math.min(bestTotal, LIMIT_FAAN)
  return { patterns: best ?? [], total, meetsMinimum: total >= MINIMUM_FAAN }
}
