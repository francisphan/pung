import { useState } from 'react'
import { dealerOf, type GameState, type Seat, type WinResult } from '../engine/game'
import { PATTERN_BY_ID } from '../engine/scoring'
import { tileName } from '../engine/tiles'
import { conjugate, formatDelta, formatPoints, isMe, nameOf, possessive } from '../names'
import { useSeating } from '../seat'
import { Flowers, Meld } from './Melds'
import Tile from './Tile'

interface Props {
  state: GameState
  onNext: () => void
  /** Whether this device may deal the next hand. At an online table only the host does. */
  canAdvance?: boolean
  /** Who everyone else is waiting for. */
  waitingFor?: string | null
  /** In a guided round: the coach's reading of the result. */
  note?: string
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
  // One picture for assistive tech, naming each set, since nothing inside an image is read.
  const sets = [
    ...r.hand.melds.map((m) => `${m.kind === 'kong' ? (m.open ? 'kong' : 'concealed kong') : m.kind} of ${tileName(m.tiles[0])}`),
    ...groups.map((g) => g.map(tileName).join(', ')),
  ]
  return (
    <div className="win-hand" role="img" aria-label={`Winning hand: ${sets.join('; ')}; completed by ${tileName(r.winningTile)}`}>
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
export default function Result({ state, onNext, canAdvance = true, waitingFor = null, note }: Props) {
  const seating = useSeating()
  // Step away from the card to look at the table, where every hand now lies face up.
  const [peek, setPeek] = useState(false)
  const look = () => {
    setPeek(true)
    // The table, not the log, is what there is to see.
    try {
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' })
    } catch {
      /* not every browser takes the options form */
    }
  }
  const r = state.result
  if (!r) return null
  if (peek) {
    return (
      <div className="peek" role="status">
        <span>Every hand is face up.</span>
        <button type="button" className="act act-small" onClick={() => setPeek(false)} autoFocus>
          Back to the result
        </button>
      </div>
    )
  }
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
              The wall ran out. {nameOf(seating, dealer)} {conjugate(seating, dealer, 'deal', 'deals')} again.
            </p>
          </>
        ) : (
          <>
            <h2 id="result-title" className="card-title">
              {isMe(seating, r.winner) ? 'You win' : `${nameOf(seating, r.winner)} wins`}
            </h2>
            <p className="card-sub">
              {r.from === null
                ? `Self-drawn ${tileName(r.winningTile)}.`
                : `${possessive(seating, r.from)} ${tileName(r.winningTile)} completed the hand.`}
            </p>
            <WinningHand r={r} />
            <div className="score-grid">
              <table className="patterns">
                <caption className="sr-only">Patterns in the hand and their faan</caption>
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
                  {r.from === null ? ' from each player' : `: ${nameOf(seating, r.from, true)} ${conjugate(seating, r.from, 'pay', 'pays')} in full, the others half`}
                </div>
              </div>
            </div>
          </>
        )}
        {note && (
          <p className="card-note">
            <span className="coach-tag">Coach</span>
            {note}
          </p>
        )}
        <table className="standings">
          <caption className="sr-only">Standings</caption>
          <thead>
            <tr>
              <th scope="col">Player</th>
              <th scope="col">This hand</th>
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {state.players.map((p, i) => (
              <tr key={i} className={isMe(seating, i as Seat) ? 'standings-you' : undefined}>
                <td>{nameOf(seating, i as Seat)}</td>
                <td className={`num delta ${r.deltas[i] > 0 ? 'delta-up' : r.deltas[i] < 0 ? 'delta-down' : ''}`}>{formatDelta(r.deltas[i])}</td>
                <td className="num">{formatPoints(p.score)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="card-actions">
          <button type="button" className="act" onClick={look}>
            Look at the table
          </button>
          {canAdvance ? (
            <button type="button" className="act act-primary" onClick={onNext} autoFocus>
              {nextLabel}
            </button>
          ) : (
            <p className="card-wait" role="status">
              Waiting for {waitingFor ?? 'the host'} to {lastHand ? 'close the game' : 'deal the next hand'}.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
