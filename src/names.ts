import type { Seat } from './engine/game'
import type { Wind } from './engine/tiles'

/**
 * Who sits where, from one device's point of view. Solo play puts the person
 * at East with the three opponents after them; at an online table the seat
 * and the names come from the room.
 */
export interface Seating {
  /** The seat this device plays. */
  me: Seat
  /** A display name for each seat. */
  names: readonly string[]
}

/** The opponents, in the order they fill empty seats. */
export const BOT_NAMES = ['Mei', 'Bo', 'Ling'] as const

/** Solo play: you at East, then Mei, Bo and Ling. Play runs counter-clockwise, so seat 1 is on your right. */
export const SOLO: Seating = { me: 0, names: ['You', 'Mei', 'Bo', 'Ling'] }

export function isMe(seating: Seating, seat: Seat): boolean {
  return seat === seating.me
}

/** "You" for the local player, otherwise the name. `mid` gives the lower-case form for the middle of a sentence. */
export function nameOf(seating: Seating, seat: Seat, mid = false): string {
  return isMe(seating, seat) ? (mid ? 'you' : 'You') : seating.names[seat]
}

/** "Your" or "Mei's". */
export function possessive(seating: Seating, seat: Seat, mid = false): string {
  return isMe(seating, seat) ? (mid ? 'your' : 'Your') : `${seating.names[seat]}’s`
}

/** Verb agreement: "You deal", "Mei deals". */
export function conjugate(seating: Seating, seat: Seat, you: string, they: string): string {
  return isMe(seating, seat) ? you : they
}

export const WIND_NAME: Record<Wind, string> = { east: 'East', south: 'South', west: 'West', north: 'North' }

export function formatPoints(n: number): string {
  return n.toLocaleString('en-US').replace('-', '−')
}
export function formatDelta(n: number): string {
  if (n === 0) return '0'
  return (n > 0 ? '+' : '−') + formatPoints(Math.abs(n))
}
