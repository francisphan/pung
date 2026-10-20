/** Pre-built hands used by the lessons. */
import type { Hand, Meld } from '../../engine/hand'
import { parseTiles, type StandardId } from '../../engine/tiles'
import type { PatternId, WinContext } from './scoring'

const ids = (s: string) => parseTiles(s) as StandardId[]
const open = (kind: Meld['kind'], s: string): Meld => ({ kind, tiles: ids(s), open: true })

/** A complete hand shown in "Sets and a winning hand", grouped the way it wins. */
export const ANATOMY_HAND: Meld[] = [
  { kind: 'chow', tiles: ids('C4 C5 C6') },
  { kind: 'chow', tiles: ids('D1 D2 D3') },
  { kind: 'pung', tiles: ids('D7 D7 D7') },
  { kind: 'pung', tiles: ids('B2 B2 B2') },
  { kind: 'pair', tiles: ids('WE WE') },
]

export const MELD_EXAMPLES: { kind: Meld['kind']; title: string; tiles: StandardId[]; blurb: string }[] = [
  {
    kind: 'chow',
    title: 'Chow',
    tiles: ids('B4 B5 B6'),
    blurb: 'Three tiles in a row from one suit. Winds and dragons have no order, so they never make chows.',
  },
  {
    kind: 'pung',
    title: 'Pung',
    tiles: ids('WW WW WW'),
    blurb: 'Three identical tiles. Any tile can make a pung, winds and dragons included.',
  },
  {
    kind: 'kong',
    title: 'Kong',
    tiles: ids('RD RD RD RD'),
    blurb: 'All four copies of a tile. It counts as one set, so you draw a replacement tile to stay at the right count.',
  },
  {
    kind: 'pair',
    title: 'Pair',
    tiles: ids('D9 D9'),
    blurb: 'Two identical tiles. Every winning hand needs exactly one. Some people call them the eyes.',
  },
]

export interface WaitPuzzle {
  id: string
  title: string
  hand: Hand
  /** Tiles offered to the learner, correct ones included. */
  choices: StandardId[]
  hint: string
}

export const WAIT_PUZZLES: WaitPuzzle[] = [
  {
    id: 'edge',
    title: 'One way in',
    hand: { concealed: ids('D1 D2 B2 B2 B2 WE WE WE D7 D7 C4 C5 C6'), melds: [] },
    choices: ids('D3 D4 D9 WE C3'),
    hint: 'Three sets and the pair are already there. Which tiles are still loose?',
  },
  {
    id: 'two-sided',
    title: 'Two ways in',
    hand: { concealed: ids('C2 C3 C4 D3 D4 D6 D6 D6 B8 B8 B8 WS WS'), melds: [] },
    choices: ids('D2 D5 D7 B8 C5'),
    hint: 'A three-and-four can grow in either direction.',
  },
  {
    id: 'pairs',
    title: 'Two pairs, one wins',
    hand: { concealed: ids('B4 B4 B4 B6 B6 C1 C2 C3 D9 D9 D9 RD RD'), melds: [] },
    choices: ids('B5 B6 RD GD D9'),
    hint: 'Two pairs and three sets. One pair must turn into a pung.',
  },
  {
    id: 'gates',
    title: 'Nine gates',
    hand: { concealed: ids('C1 C1 C1 C2 C3 C4 C5 C6 C7 C8 C9 C9 C9'), melds: [] },
    choices: ids('C1 C2 C3 C4 C5 C6 C7 C8 C9'),
    hint: 'A famous hand. Try every tile in the suit.',
  },
]

export interface ScoringExample {
  id: string
  title: string
  context: WinContext
  /** The faan the lesson expects, per pattern, after multiplying repeats. */
  expected: Partial<Record<PatternId, number>>
  lesson: string
}

export const SCORING_EXAMPLES: ScoringExample[] = [
  {
    id: 'chicken',
    title: 'Mixed bag',
    context: {
      hand: {
        concealed: ids('D1 D2 D3 B2 B2 B2 C7 C7 B6 B7 B8'),
        melds: [open('pung', 'WS WS WS')],
      },
      winningTile: 'B8',
      selfDrawn: false,
      seatWind: 'west',
      prevailingWind: 'east',
    },
    expected: {},
    lesson:
      'Four sets and a pair, but nothing special about them: chows and pungs mixed, three suits, a pung of a wind that is neither yours nor the round’s, one set claimed face up. This is a chicken hand, worth zero. At a three-faan table you could not even declare it.',
  },
  {
    id: 'ping-wu',
    title: 'Quiet and concealed',
    context: {
      hand: { concealed: ids('C1 C2 C3 D4 D5 D6 B7 B8 B9 D2 D3 D4 B5 B5'), melds: [] },
      winningTile: 'D4',
      selfDrawn: true,
      seatWind: 'north',
      prevailingWind: 'east',
    },
    expected: { allChows: 1, selfDrawn: 1, concealed: 1 },
    lesson:
      'Every set is a chow and the pair is a plain five of bamboo, so it is all chows. Nothing was claimed, so the hand is concealed, and the last tile came from the wall. Three small things add up to the minimum.',
  },
  {
    id: 'pungs',
    title: 'Three of everything',
    context: {
      hand: {
        concealed: ids('D5 D5 D5 C9 C9 C9 B1 B1'),
        melds: [open('pung', 'B3 B3 B3'), open('pung', 'WN WN WN')],
      },
      winningTile: 'B1',
      selfDrawn: false,
      seatWind: 'south',
      prevailingWind: 'east',
    },
    expected: { allPungs: 3 },
    lesson:
      'All four sets are pungs, which is worth three on its own. The north wind pung does not score because you are sitting South in an East round. Two sets were claimed, so the hand is not concealed.',
  },
  {
    id: 'mixed',
    title: 'One suit and a dragon',
    context: {
      hand: {
        concealed: ids('B1 B2 B3 B4 B5 B6 B7 B7 B7 WE WE'),
        melds: [open('pung', 'GD GD GD')],
      },
      winningTile: 'B6',
      selfDrawn: false,
      seatWind: 'south',
      prevailingWind: 'east',
    },
    expected: { mixedOneSuit: 3, dragonPung: 1 },
    lesson:
      'Bamboo only, plus winds and dragons: mixed one suit. The green dragon pung adds one. The East pair is only a pair, and pairs of winds never score on their own.',
  },
  {
    id: 'winds',
    title: 'The dealer’s wind',
    context: {
      hand: {
        concealed: ids('D2 D2 D2 C5 C5 C5 B8 B8 B8 D9 D9'),
        melds: [open('pung', 'WE WE WE')],
      },
      winningTile: 'D9',
      selfDrawn: false,
      seatWind: 'east',
      prevailingWind: 'east',
    },
    expected: { allPungs: 3, seatWindPung: 1, prevailingWindPung: 1 },
    lesson:
      'All pungs again, and this time the wind pung is East while you sit East in the East round. That is your seat wind and the prevailing wind at once, so it counts for both.',
  },
  {
    id: 'pure',
    title: 'Nothing but characters',
    context: {
      hand: { concealed: ids('C1 C2 C3 C4 C5 C6 C7 C8 C9 C2 C3 C4 C9 C9'), melds: [] },
      winningTile: 'C3',
      selfDrawn: true,
      seatWind: 'west',
      prevailingWind: 'south',
    },
    expected: { allChows: 1, pureOneSuit: 7, selfDrawn: 1, concealed: 1 },
    lesson:
      'Only one suit and no honors at all: pure one suit, the big one. It is also all chows, concealed, and self-drawn. Ten faan is a very good hand; most tables cap a hand at thirteen.',
  },
]
