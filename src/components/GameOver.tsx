import type { GameState, Seat } from '../engine/game'
import { HUMAN } from '../hooks/useGame'
import { NAMES, formatPoints } from '../names'

interface Props {
  state: GameState
  onNewGame: () => void
}

export default function GameOver({ state, onNewGame }: Props) {
  const order = ([0, 1, 2, 3] as Seat[]).sort((a, b) => state.players[b].score - state.players[a].score)
  const you = order.indexOf(HUMAN)
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
              <tr key={seat} className={seat === HUMAN ? 'standings-you' : undefined}>
                <td className="num place">{i + 1}</td>
                <td>{NAMES[seat]}</td>
                <td className="num">{formatPoints(state.players[seat].score)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="card-actions">
          <button type="button" className="act act-primary" onClick={onNewGame} autoFocus>
            New game
          </button>
        </div>
      </div>
    </div>
  )
}
