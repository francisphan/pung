import type { Seat } from './engine/game'
import type { Wind } from './engine/tiles'

/** Who sits where. Play runs counter-clockwise, so seat 1 is on your right. */
export const NAMES: Record<Seat, string> = { 0: 'You', 1: 'Mei', 2: 'Bo', 3: 'Ling' }
export const POSSESSIVE: Record<Seat, string> = { 0: 'Your', 1: "Mei's", 2: "Bo's", 3: "Ling's" }

export const WIND_NAME: Record<Wind, string> = { east: 'East', south: 'South', west: 'West', north: 'North' }

export function formatPoints(n: number): string {
  return n.toLocaleString('en-US').replace('-', '\u2212')
}
export function formatDelta(n: number): string {
  if (n === 0) return '0'
  return (n > 0 ? '+' : '−') + formatPoints(Math.abs(n))
}
