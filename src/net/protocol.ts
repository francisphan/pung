/**
 * What passes between a browser and the table server. Plain JSON, one
 * message per WebSocket frame. Shared by both sides; nothing here touches
 * the DOM or Node.
 */
import type { Action, GameState, Rules, Seat } from '../engine/game'
import { TILE_BY_ID } from '../engine/tiles'

/** Table codes avoid letters and digits that read alike: no I, O, 0 or 1. */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const CODE_LENGTH = 4
export const NAME_MAX = 16

/** Upper-case the code, drop anything that is not a letter or digit; null unless it is a well-formed code. */
export function cleanCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (code.length !== CODE_LENGTH) return null
  for (const c of code) if (!CODE_ALPHABET.includes(c)) return null
  return code
}

/** Trim and shorten a player's name; empty names become "Guest". */
export function cleanName(raw: unknown): string {
  if (typeof raw !== 'string') return 'Guest'
  const printable = Array.from(raw).filter((c) => {
    const n = c.charCodeAt(0)
    return n >= 32 && n !== 127
  })
  const name = printable.join('').trim().slice(0, NAME_MAX).trim()
  return name || 'Guest'
}

export type SeatInfo =
  | { kind: 'open' }
  | { kind: 'bot'; name: string }
  | { kind: 'human'; name: string; id: string; connected: boolean }

export type RoomStatus = 'lobby' | 'playing' | 'ended'

export interface RoomInfo {
  code: string
  status: RoomStatus
  /** Member id of the host, who sets the rules and deals. */
  host: string
  rules: Rules
  seats: SeatInfo[]
  /** Members without a seat yet; only possible in the lobby. */
  waiting: { id: string; name: string }[]
  you: { id: string; seat: Seat | null }
  /** Who may deal the next hand right now: the host, or the first present player when the host is away. */
  controller: string | null
}

export type TableAction = Exclude<Action, { type: 'newGame' }>

export type ClientMessage =
  | { type: 'create'; id: string; name: string; rules: Rules }
  | { type: 'join'; id: string; name: string; code: string }
  | { type: 'sit'; seat: Seat }
  | { type: 'bot'; seat: Seat; on: boolean }
  | { type: 'rules'; rules: Rules }
  | { type: 'start' }
  | { type: 'action'; action: TableAction }
  | { type: 'again' }
  | { type: 'leave' }

export type ServerMessage =
  | { type: 'room'; room: RoomInfo }
  /** The table as your seat sees it; see engine/view.ts. */
  | { type: 'state'; state: GameState }
  /** Something you asked for could not be done. A fatal error means you are no longer at a table. */
  | { type: 'error'; message: string; fatal?: boolean }

// Validation of what a client sends. The engine checks legality; this only checks shape.

type Obj = Record<string, unknown>
const isObj = (x: unknown): x is Obj => !!x && typeof x === 'object' && !Array.isArray(x)
const isSeat = (x: unknown): x is Seat => x === 0 || x === 1 || x === 2 || x === 3
const isTile = (x: unknown): boolean => typeof x === 'string' && x in TILE_BY_ID
const isId = (x: unknown): x is string => typeof x === 'string' && x.length > 0 && x.length <= 64

export function cleanRules(raw: unknown): Rules | null {
  if (!isObj(raw)) return null
  const { minimumFaan, rounds } = raw
  if (typeof minimumFaan !== 'number' || !Number.isInteger(minimumFaan) || minimumFaan < 0 || minimumFaan > 13) return null
  if (rounds !== 1 && rounds !== 4) return null
  return { minimumFaan, rounds }
}

function cleanDecision(raw: unknown): boolean {
  if (!isObj(raw)) return false
  switch (raw.kind) {
    case 'pass':
    case 'pung':
    case 'kong':
    case 'win':
      return true
    case 'chow':
      return Array.isArray(raw.tiles) && raw.tiles.length === 2 && raw.tiles.every(isTile)
    default:
      return false
  }
}

export function cleanAction(raw: unknown): TableAction | null {
  if (!isObj(raw)) return null
  switch (raw.type) {
    case 'discard':
    case 'kong':
      return isSeat(raw.seat) && isTile(raw.tile) ? ({ type: raw.type, seat: raw.seat, tile: raw.tile } as TableAction) : null
    case 'selfWin':
      return isSeat(raw.seat) ? { type: 'selfWin', seat: raw.seat } : null
    case 'decide': {
      if (!isObj(raw.decisions)) return null
      const decisions: Obj = {}
      for (const [k, v] of Object.entries(raw.decisions)) {
        if (!isSeat(Number(k)) || !cleanDecision(v)) return null
        decisions[k] = v
      }
      return { type: 'decide', decisions } as TableAction
    }
    case 'nextHand':
      return { type: 'nextHand' }
    default:
      return null
  }
}

/** The message if it is well formed, else null. */
export function parseClientMessage(raw: unknown): ClientMessage | null {
  if (!isObj(raw)) return null
  switch (raw.type) {
    case 'create': {
      const rules = cleanRules(raw.rules)
      return isId(raw.id) && rules ? { type: 'create', id: raw.id, name: cleanName(raw.name), rules } : null
    }
    case 'join': {
      const code = cleanCode(raw.code)
      return isId(raw.id) && code ? { type: 'join', id: raw.id, name: cleanName(raw.name), code } : null
    }
    case 'sit':
      return isSeat(raw.seat) ? { type: 'sit', seat: raw.seat } : null
    case 'bot':
      return isSeat(raw.seat) && typeof raw.on === 'boolean' ? { type: 'bot', seat: raw.seat, on: raw.on } : null
    case 'rules': {
      const rules = cleanRules(raw.rules)
      return rules ? { type: 'rules', rules } : null
    }
    case 'action': {
      const action = cleanAction(raw.action)
      return action ? { type: 'action', action } : null
    }
    case 'start':
    case 'again':
    case 'leave':
      return { type: raw.type }
    default:
      return null
  }
}
