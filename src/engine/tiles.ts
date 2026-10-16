/**
 * The tile set. Variant-agnostic: every major form of mahjong uses these
 * 144 tiles (American sets add jokers; Riichi usually drops the bonus tiles).
 */

export type Suit = 'dots' | 'bamboo' | 'characters'
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
export type Wind = 'east' | 'south' | 'west' | 'north'
export type Dragon = 'red' | 'green' | 'white'
export type BonusIndex = 1 | 2 | 3 | 4

export type SuitId = `${'D' | 'B' | 'C'}${Rank}`
export type WindId = 'WE' | 'WS' | 'WW' | 'WN'
export type DragonId = 'RD' | 'GD' | 'WD'
export type FlowerId = `F${BonusIndex}`
export type SeasonId = `S${BonusIndex}`
/** Tiles that can form sets: suits, winds and dragons. */
export type StandardId = SuitId | WindId | DragonId
export type BonusId = FlowerId | SeasonId
export type TileId = StandardId | BonusId

export type Tile =
  | { id: SuitId; kind: 'suit'; suit: Suit; rank: Rank }
  | { id: WindId; kind: 'wind'; wind: Wind }
  | { id: DragonId; kind: 'dragon'; dragon: Dragon }
  | { id: FlowerId; kind: 'flower'; index: BonusIndex }
  | { id: SeasonId; kind: 'season'; index: BonusIndex }

export const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9]
export const SUITS: Suit[] = ['characters', 'dots', 'bamboo']
export const WINDS: Wind[] = ['east', 'south', 'west', 'north']
export const DRAGONS: Dragon[] = ['red', 'green', 'white']

const SUIT_LETTER: Record<Suit, 'D' | 'B' | 'C'> = { dots: 'D', bamboo: 'B', characters: 'C' }
const WIND_ID: Record<Wind, WindId> = { east: 'WE', south: 'WS', west: 'WW', north: 'WN' }
const DRAGON_ID: Record<Dragon, DragonId> = { red: 'RD', green: 'GD', white: 'WD' }

export function suitTile(suit: Suit, rank: Rank): SuitId {
  return `${SUIT_LETTER[suit]}${rank}`
}
export function windTile(wind: Wind): WindId {
  return WIND_ID[wind]
}
export function dragonTile(dragon: Dragon): DragonId {
  return DRAGON_ID[dragon]
}

function build(): Tile[] {
  const out: Tile[] = []
  for (const suit of SUITS)
    for (const rank of RANKS) out.push({ id: suitTile(suit, rank), kind: 'suit', suit, rank })
  for (const wind of WINDS) out.push({ id: windTile(wind), kind: 'wind', wind })
  for (const dragon of DRAGONS) out.push({ id: dragonTile(dragon), kind: 'dragon', dragon })
  for (const index of [1, 2, 3, 4] as BonusIndex[]) out.push({ id: `F${index}`, kind: 'flower', index })
  for (const index of [1, 2, 3, 4] as BonusIndex[]) out.push({ id: `S${index}`, kind: 'season', index })
  return out
}

/** Every distinct tile face, in the conventional sorting order. */
export const TILES: readonly Tile[] = build()
export const TILE_BY_ID: Record<TileId, Tile> = Object.fromEntries(
  TILES.map((t) => [t.id, t]),
) as Record<TileId, Tile>
/** The 34 faces that can be part of a hand (everything but flowers and seasons). */
export const STANDARD_TILES: readonly StandardId[] = TILES.filter(
  (t) => t.kind === 'suit' || t.kind === 'wind' || t.kind === 'dragon',
).map((t) => t.id as StandardId)

const ORDER: Record<string, number> = Object.fromEntries(TILES.map((t, i) => [t.id, i]))
export function tileOrder(id: TileId): number {
  return ORDER[id]
}
export function sortTiles<T extends TileId>(ids: readonly T[]): T[] {
  return [...ids].sort((a, b) => ORDER[a] - ORDER[b])
}

export function isStandard(id: TileId): id is StandardId {
  const k = TILE_BY_ID[id].kind
  return k === 'suit' || k === 'wind' || k === 'dragon'
}
export function isHonor(id: TileId): id is WindId | DragonId {
  const k = TILE_BY_ID[id].kind
  return k === 'wind' || k === 'dragon'
}

/** How many copies of each face a full set holds: four of each, one of each bonus. */
export function copiesOf(id: TileId): number {
  return isStandard(id) ? 4 : 1
}

/** All 144 physical tiles, listed face by face. */
export const FULL_SET: readonly TileId[] = TILES.flatMap((t) =>
  Array.from({ length: copiesOf(t.id) }, () => t.id),
)

export const CHINESE_NUMERAL: Record<Rank, string> = {
  1: '一',
  2: '二',
  3: '三',
  4: '四',
  5: '五',
  6: '六',
  7: '七',
  8: '八',
  9: '九',
}
export const WIND_CHAR: Record<Wind, string> = { east: '東', south: '南', west: '西', north: '北' }
export const WIND_LETTER: Record<Wind, string> = { east: 'E', south: 'S', west: 'W', north: 'N' }
export const DRAGON_CHAR: Record<Dragon, string> = { red: '中', green: '發', white: '' }
export const FLOWER_CHAR: Record<BonusIndex, string> = { 1: '梅', 2: '蘭', 3: '菊', 4: '竹' }
export const SEASON_CHAR: Record<BonusIndex, string> = { 1: '春', 2: '夏', 3: '秋', 4: '冬' }

const NUMBER_WORD = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
const SUIT_WORD: Record<Suit, string> = { dots: 'dots', bamboo: 'bamboo', characters: 'characters' }
const WIND_WORD: Record<Wind, string> = { east: 'East', south: 'South', west: 'West', north: 'North' }
const DRAGON_WORD: Record<Dragon, string> = { red: 'Red', green: 'Green', white: 'White' }
const FLOWER_WORD: Record<BonusIndex, string> = {
  1: 'Plum',
  2: 'Orchid',
  3: 'Chrysanthemum',
  4: 'Bamboo',
}
const SEASON_WORD: Record<BonusIndex, string> = { 1: 'Spring', 2: 'Summer', 3: 'Autumn', 4: 'Winter' }

/** Plain English name, e.g. "Three of dots", "East wind", "Red dragon". */
export function tileName(id: TileId): string {
  const t = TILE_BY_ID[id]
  switch (t.kind) {
    case 'suit':
      return `${NUMBER_WORD[t.rank]} of ${SUIT_WORD[t.suit]}`
    case 'wind':
      return `${WIND_WORD[t.wind]} wind`
    case 'dragon':
      return `${DRAGON_WORD[t.dragon]} dragon`
    case 'flower':
      return `${FLOWER_WORD[t.index]} (flower ${t.index})`
    case 'season':
      return `${SEASON_WORD[t.index]} (season ${t.index})`
  }
}

/** Short label for cramped spaces, e.g. "3 dots", "East", "Red". */
export function tileShort(id: TileId): string {
  const t = TILE_BY_ID[id]
  switch (t.kind) {
    case 'suit':
      return `${t.rank} ${SUIT_WORD[t.suit]}`
    case 'wind':
      return WIND_WORD[t.wind]
    case 'dragon':
      return `${DRAGON_WORD[t.dragon]} dragon`
    case 'flower':
      return FLOWER_WORD[t.index]
    case 'season':
      return SEASON_WORD[t.index]
  }
}

/** What is printed on the face, for alt text and the quiz. */
export function tileGlyphText(id: TileId): string {
  const t = TILE_BY_ID[id]
  switch (t.kind) {
    case 'suit':
      return t.suit === 'characters' ? `${CHINESE_NUMERAL[t.rank]}萬` : String(t.rank)
    case 'wind':
      return WIND_CHAR[t.wind]
    case 'dragon':
      return t.dragon === 'white' ? 'blank frame' : DRAGON_CHAR[t.dragon]
    case 'flower':
      return FLOWER_CHAR[t.index]
    case 'season':
      return SEASON_CHAR[t.index]
  }
}

/** Parse a space-separated list of ids, e.g. "D1 D2 D3 WE WE". */
export function parseTiles(text: string): TileId[] {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => {
      if (!(s in TILE_BY_ID)) throw new Error(`Unknown tile id: ${s}`)
      return s as TileId
    })
}
