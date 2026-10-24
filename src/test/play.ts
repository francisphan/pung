import { aiDecisions, aiTurn } from '../engine/ai'
import { newGame, reduce, type GameState, type Rules } from '../engine/game'

/** Any complete hand wins, so hands end quickly. */
const RULES: Rules = { minimumFaan: 0, rounds: 1 }

/** Nobody is human: every seat decides at once. */
const NOBODY = -1 as never

/** One step of a table the bots play by themselves: the current player's move, every pending claim decision, or the next deal. */
export function botStep(s: GameState): GameState {
  if (s.phase === 'discard') return reduce(s, aiTurn(s, s.current))
  if (s.phase === 'claim') return reduce(s, { type: 'decide', decisions: aiDecisions(s, NOBODY) })
  if (s.phase === 'handEnd') return reduce(s, { type: 'nextHand' })
  return s
}

/** Play a seed until a state satisfies `pred`. The state before it comes too, so a test can show the change. */
export function playUntil(seed: number, pred: (s: GameState) => boolean, limit = 2000): { before: GameState; after: GameState } {
  let s = newGame(RULES, seed)
  for (let i = 0; i < limit; i++) {
    const next = botStep(s)
    if (next === s) break
    if (pred(next)) return { before: s, after: next }
    s = next
  }
  throw new Error(`seed ${seed} never got there`)
}
