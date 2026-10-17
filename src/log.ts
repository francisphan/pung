import type { GameState, LogEntry } from './engine/game'

/** A line in the table log: something the engine recorded, or a note from the room. */
export type LogItem = { id: number; hand: number; entry: LogEntry | { kind: 'note'; text: string } }

/**
 * Everything that has happened at the table this game, hand after hand. The
 * engine keeps only the current hand's log; this accumulates it as states go
 * by, so the panel can scroll back to the first deal.
 */
export interface LogHistory {
  items: LogItem[]
  /** Hand the last recorded entries belong to. */
  hand: number
  /** Entries of that hand already recorded. */
  count: number
  nextId: number
}

export const EMPTY_LOG: LogHistory = { items: [], hand: -1, count: 0, nextId: 1 }

/** Lines kept; a long evening at one table would otherwise grow the panel without end. */
export const LOG_LIMIT = 400

function trim(items: LogItem[]): LogItem[] {
  return items.length > LOG_LIMIT ? items.slice(items.length - LOG_LIMIT) : items
}

/** Record whatever the state's log holds that has not been recorded yet. */
export function withState(h: LogHistory, s: GameState): LogHistory {
  const fresh = s.handIndex !== h.hand || s.log.length < h.count
  const from = fresh ? 0 : h.count
  if (!fresh && s.log.length === h.count) return h
  const items = [...h.items]
  let nextId = h.nextId
  for (const entry of s.log.slice(from)) items.push({ id: nextId++, hand: s.handIndex, entry })
  return { items: trim(items), hand: s.handIndex, count: s.log.length, nextId }
}

export function withNote(h: LogHistory, text: string): LogHistory {
  return { ...h, items: trim([...h.items, { id: h.nextId, hand: h.hand, entry: { kind: 'note', text } }]), nextId: h.nextId + 1 }
}
