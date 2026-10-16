import { dealerOf, type GameState, type WinResult } from '../engine/game'
import { PATTERN_BY_ID } from '../engine/scoring'
import { tileName } from '../engine/tiles'
import { HUMAN } from '../hooks/useGame'
import { NAMES, POSSESSIVE, formatDelta, formatPoints } from '../names'
import { Flowers, Meld } from './Melds'
import Tile from './Tile'

interface Props {
  state: GameState
  onNext: () => void
}

function WinningHand({ r }: { r: WinResult }) {
  // Concealed tiles grouped into the sets that scored; thirteen orphans just lie in order.
  const groups = r.score.arrangement
    ? [...r.score.arrangement.sets.filter((s) => !r.hand.melds.includes(s)), r.score.arrangement.pair].map((g) => g.tiles)
    : [r.hand.concealed]
  // Ring the first copy of the winning tile among the concealed tiles.
  const flat = groups.flat()
  const winAt = flat.indexOf(r.winningTile)
  let offset = 0
  const starts = groups.map((g) => {
    const s = offset
    offset += g.length
    return s
  })
  return (
    <div className="win-hand" role="img" aria-label={`Winning hand, completed by ${tileName(r.winningTile)}`}>
      {r.hand.melds.map((m, i) => (
        <Meld key={`m${i}`} meld={m} size={38} />
      ))}
      {groups.map((g, i) => (
        <span key={`g${i}`} className="meld">
          {g.map((t, j) => (
            <span key={j} className={starts[i] + j === winAt ? 'win-tile' : undefined}>
              <Tile id={t} size={38} decorative />
            </span>
          ))}
        </span>
      ))}
      <Flowers flowers={r.flowers} size={26} />
    </div>
  )
}

/** The card shown when a hand ends. */
export default function Result({ state, onNext }: Props) {
  const r = state.result
  if (!r) return null
  const dealer = dealerOf(state)
  const dealerStays = r.kind === 'draw' || r.winner === dealer
  const lastHand = !dealerStays && state.dealerIndex + 1 >= state.rules.rounds * 4
  const nextLabel = lastHand ? 'See final scores' : 'Next hand'

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="result-title">
      <div className="card">
        {r.kind === 'draw' ? (
          <>
            <h2 id="result-title" className="card-title">
              Nobody wins
            </h2>
            <p className="card-sub">
              The wall ran out. {NAMES[dealer]} {dealer === HUMAN ? 'deal' : 'deals'} again.
            </p>
          </>
        ) : (
          <>
            <h2 id="result-title" className="card-title">
              {r.winner === HUMAN ? 'You win' : `${NAMES[r.winner]} wins`}
            </h2>
            <p className="card-sub">
              {r.from === null
                ? `Self-drawn ${tileName(r.winningTile)}.`
                : `${POSSESSIVE[r.from]} ${tileName(r.winningTile)} completed the hand.`}
            </p>
            <WinningHand r={r} />
            <div className="score-grid">
              <table className="patterns">
                <tbody>
                  {r.score.patterns.map((p) => {
                    const def = PATTERN_BY_ID[p.id]
                    return (
                      <tr key={p.id}>
                        <td>
                          {def.name}
                          {p.times > 1 ? ` ×${p.times}` : ''}
                        </td>
                        <td className="cjk" lang="zh-Hant">
                          {def.chinese}
                        </td>
                        <td className="num">{def.limit ? 'limit' : p.faan}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="total">
                <div className="total-faan">{r.score.total}</div>
                <div className="total-label">{r.score.limit ? 'faan, the limit' : 'faan'}</div>
                <div className="total-points">
                  {formatPoints(r.points)} points
                  {r.from === null ? ' from each player' : `, ${NAMES[r.from]} pays in full`}
                </div>
              </div>
            </div>
          </>
        )}
        <table className="standings">
          <tbody>
            {state.players.map((p, i) => (
              <tr key={i} className={i === HUMAN ? 'standings-you' : undefined}>
                <td>{NAMES[i as 0 | 1 | 2 | 3]}</td>
                <td className={`num delta ${r.deltas[i] > 0 ? 'delta-up' : r.deltas[i] < 0 ? 'delta-down' : ''}`}>{formatDelta(r.deltas[i])}</td>
                <td className="num">{formatPoints(p.score)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="card-actions">
          <button type="button" className="act act-primary" onClick={onNext} autoFocus>
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
