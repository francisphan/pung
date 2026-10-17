import type { GameState, Seat } from '../engine/game'
import { formatPoints, isMe, nameOf } from '../names'
import { useSeating } from '../seat'

interface Props {
  state: GameState
  onNewGame: () => void
  /** At an online table only the host starts the next game; others can leave. */
  canRestart?: boolean
  waitingFor?: string | null
  onLeave?: () => void
}

export default function GameOver({ state, onNewGame, canRestart = true, waitingFor = null, onLeave }: Props) {
  const seating = useSeating()
  const order = ([0, 1, 2, 3] as Seat[]).sort((a, b) => state.players[b].score - state.players[a].score)
  const you = order.indexOf(seating.me)
  const place = ['first', 'second', 'third', 'last'][you]
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="over-title">
      <div className="card">
        <h2 id="over-title" className="card-title">
          {you === 0 ? 'You finished first' : `You finished ${place}`}
        </h2>
        <p className="card-sub">
          {state.rules.rounds === 1 ? 'The East round is over.' : 'All four rounds are played.'}
        </p>
        <table className="standings standings-final">
          <tbody>
            {order.map((seat, i) => (
              <tr key={seat} className={isMe(seating, seat) ? 'standings-you' : undefined}>
                <td className="num place">{i + 1}</td>
                <td>{nameOf(seating, seat)}</td>
                <td className="num">{formatPoints(state.players[seat].score)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="card-actions">
          {onLeave && (
            <button type="button" className="act" onClick={onLeave}>
              Leave table
            </button>
          )}
          {canRestart ? (
            <button type="button" className="act act-primary" onClick={onNewGame} autoFocus>
              {onLeave ? 'Play again' : 'New game'}
            </button>
          ) : (
            <p className="card-wait" role="status">
              Waiting for {waitingFor ?? 'the host'} to start another game.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
