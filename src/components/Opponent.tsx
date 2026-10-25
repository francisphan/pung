import type { Call } from '../calls'
import { dealerOf, seatWind, type GameState, type Seat } from '../engine/game'
import { WIND_CHAR, sortTiles } from '../engine/tiles'
import { isHidden } from '../engine/view'
import { WIND_NAME, formatPoints, nameOf } from '../names'
import { useSeating } from '../seat'
import { Flowers, MeldRow } from './Melds'
import Tile from './Tile'

interface Props {
  state: GameState
  seat: Seat
  /** Across the table, along a side, or a compact chip on small screens. */
  layout: 'top' | 'side' | 'chip'
  /** A call this seat just made, stamped over it. */
  call?: Call | null
}

export default function Opponent({ state, seat, layout, call = null }: Props) {
  const seating = useSeating()
  const name = nameOf(seating, seat)
  const p = state.players[seat]
  const wind = seatWind(state, seat)
  const dealer = dealerOf(state) === seat
  const active = state.phase === 'discard' && state.current === seat
  // Once the hand is over every rack lies face up; the winner's shows the winning tile too.
  const over = state.phase === 'handEnd' || state.phase === 'gameEnd'
  const r = state.result
  const won = over && r?.kind === 'win' && r.winner === seat ? r : null
  const shown = won ? sortTiles(won.hand.concealed) : p.concealed
  const revealed = over && shown.length > 0 && shown.every((t) => !isHidden(t))
  const winAt = won ? shown.indexOf(won.winningTile) : -1
  const n = shown.length
  const rack = revealed
    ? shown.map((t, i) => (
        <Tile
          key={i}
          id={t}
          turned={layout === 'side'}
          size={layout === 'top' ? 30 : layout === 'side' ? 26 : 20}
          className={i === winAt ? 'tile-win' : undefined}
          style={{ ['--i' as string]: i }}
          decorative
        />
      ))
    : Array.from({ length: n }, (_, i) => <Tile key={i} id="WE" back turned={layout === 'side'} size={layout === 'top' ? 28 : 24} decorative />)
  return (
    <section
      className={`seat seat-${layout}${active ? ' seat-active' : ''}${revealed ? ' seat-revealed' : ''}${won ? ' seat-winner' : ''}`}
      aria-label={`${name}, ${WIND_NAME[wind]}`}
    >
      <header className="seat-head">
        <span className="seat-wind" lang="zh-Hant" aria-hidden="true">
          {WIND_CHAR[wind]}
        </span>
        <span className="seat-name">{name}</span>
        {dealer && (
          <span className="dealer-mark" title="Dealer">
            <span lang="zh-Hant" aria-hidden="true">
              莊
            </span>
            <span className="sr-only"> dealer</span>
          </span>
        )}
        <span className="seat-score">
          {formatPoints(p.score)}
          <span className="sr-only"> points</span>
        </span>
      </header>
      {layout === 'chip' && !revealed ? (
        <div className="seat-count">{n} in hand</div>
      ) : (
        <div className={layout === 'chip' ? 'seat-reveal' : 'seat-rack'} role="img" aria-label={revealed ? `${n} tiles, face up` : `${n} tiles in hand`}>
          {rack}
        </div>
      )}
      <div className="seat-open">
        <MeldRow melds={p.melds} size={layout === 'chip' ? 20 : 26} seat={seat} fresh={call?.meld ?? null} />
        <Flowers flowers={p.flowers} size={layout === 'chip' ? 18 : 22} />
      </div>
    </section>
  )
}
