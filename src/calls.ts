import type { GameState, Seat } from './engine/game'
import type { StandardId } from './engine/tiles'

export type CallKind = 'chow' | 'pung' | 'kong' | 'win'

/** What a player calls out at the table: a claim, a kong, or the win. */
export interface Call {
  /** Where in this hand's log the call sits. A new call gets a new id, which restarts its animation. */
  id: string
  seat: Seat
  kind: CallKind
  tile: StandardId
  /** Nothing was taken from anyone: a concealed or added kong, or a self-drawn win. */
  own: boolean
  /** Which of the seat's melds the call made or extended, if any. */
  meld: number | null
}

/**
 * The call the latest action made, if it was one. Every action appends to the
 * log, and a claim, kong or win is followed by nothing but the flowers of a
 * replacement draw until the next action. So the last entry past any flowers
 * says what just happened, and the table reads it from the state alone.
 */
export function callOf(s: GameState): Call | null {
  let i = s.log.length - 1
  while (i >= 0 && s.log[i].kind === 'flower') i--
  if (i < 0) return null
  const e = s.log[i]
  const id = `${s.handIndex}:${i}`
  switch (e.kind) {
    case 'chow':
    case 'pung':
    case 'kong':
      return { id, seat: e.seat, kind: e.kind, tile: e.tile, own: false, meld: s.players[e.seat].melds.length - 1 }
    case 'concealedKong':
      return { id, seat: e.seat, kind: 'kong', tile: e.tile, own: true, meld: s.players[e.seat].melds.length - 1 }
    case 'addedKong': {
      const meld = s.players[e.seat].melds.findIndex((m) => m.kind === 'kong' && m.tiles[0] === e.tile)
      return { id, seat: e.seat, kind: 'kong', tile: e.tile, own: true, meld: meld === -1 ? null : meld }
    }
    case 'win':
      return { id, seat: e.seat, kind: 'win', tile: e.tile, own: e.from === null, meld: null }
    default:
      return null
  }
}

/**
 * Where a state stands in its hand. The table remembers the mark it opened
 * on, so a call already made by then, as after a reload, is not made again.
 */
export function logMark(s: GameState): string {
  return `${s.handIndex}:${s.log.length}`
}
