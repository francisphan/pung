import { useEffect, useState } from 'react'
import type { GameState } from '../engine/game'

/** How long the table celebrates a win before the result card comes up, in milliseconds. */
export const CELEBRATION_MS = 1500

/**
 * True for a moment after a hand is won: the call, the shower of tiles and
 * the racks turning face up play out before the result card covers them. A
 * hand found already over, as after a reload, gets its card at once.
 */
export function useCelebration(state: GameState | null, ms = CELEBRATION_MS): boolean {
  const won = state !== null && state.phase === 'handEnd' && state.result?.kind === 'win'
  const key = won ? `${state.seed}:${state.handIndex}` : null
  // The win being celebrated and whether its moment has passed. One already on the table at mount has.
  const [cur, setCur] = useState({ key, done: true })
  if (cur.key !== key) setCur({ key, done: false })
  useEffect(() => {
    if (!key) return
    const t = setTimeout(() => setCur((c) => (c.key === key ? { key, done: true } : c)), ms)
    return () => clearTimeout(t)
  }, [key, ms])
  return key !== null && cur.key === key && !cur.done
}
