import type { GameState } from '../engine/game'
import { narrate } from '../narrate'

/** Everything that happened this hand, newest first. */
export default function Log({ state }: { state: GameState }) {
  const entries = [...state.log].reverse()
  return (
    <details className="log">
      <summary>This hand</summary>
      <ol reversed>
        {entries.map((e, i) => (
          <li key={entries.length - i}>{narrate(e)}</li>
        ))}
      </ol>
    </details>
  )
}
