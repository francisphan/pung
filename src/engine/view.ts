/**
 * What one seat may know of the table. The same shape as GameState, so the
 * UI and the per-seat helpers (canSelfWin, kongOptions) work on it unchanged,
 * but with every tile the seat cannot see replaced by a placeholder, the seed
 * blanked, and everyone else's claim options and decisions left out. This is
 * what the table server sends to each player.
 */
import { SEATS, type ClaimWindow, type GameState, type Seat } from './game'
import type { StandardId, TileId } from './tiles'

/** Stands in for a tile the viewer cannot see. Never a real face. */
export const HIDDEN = '??' as unknown as StandardId

export function isHidden(id: TileId): boolean {
  return (id as string) === HIDDEN
}

function hidden(n: number): StandardId[] {
  return new Array<StandardId>(n).fill(HIDDEN)
}

function claimFor(w: ClaimWindow, seat: Seat): ClaimWindow {
  const options: ClaimWindow['options'] = {}
  const decisions: ClaimWindow['decisions'] = {}
  if (w.options[seat]) options[seat] = w.options[seat]
  if (w.decisions[seat]) decisions[seat] = w.decisions[seat]
  return { ...w, options, decisions }
}

export function viewFor(s: GameState, seat: Seat): GameState {
  return {
    ...s,
    seed: 0,
    wall: hidden(s.wall.length),
    players: s.players.map((p, i) => (i === seat ? p : { ...p, concealed: hidden(p.concealed.length) })),
    drawn: s.phase === 'discard' && s.current === seat ? s.drawn : null,
    claim: s.claim ? claimFor(s.claim, seat) : null,
  }
}

/** Every real tile a view reveals, for tests that check nothing leaks. */
export function revealedTiles(v: GameState): TileId[] {
  const out: TileId[] = [...v.wall]
  for (const o of SEATS) out.push(...v.players[o].concealed)
  if (v.drawn) out.push(v.drawn)
  return out.filter((t) => !isHidden(t))
}
