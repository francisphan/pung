import { useRef, type KeyboardEvent } from 'react'
import { dealerOf, seatWind, type GameState } from '../engine/game'
import { WIND_CHAR, sortTiles, tileName, type StandardId } from '../engine/tiles'
import { WIND_NAME, formatPoints } from '../names'
import { useSeating } from '../seat'
import { play } from '../sound'
import { Flowers, MeldRow } from './Melds'
import Tile from './Tile'

interface Props {
  state: GameState
  /** Picked tile: index into the displayed row, or 'drawn'. */
  selected: string | null
  onSelect: (key: string | null) => void
  onDiscard: (tile: StandardId) => void
}

/** Your tiles, drawn tile apart on the right. Tap to pick, tap again to throw. */
export default function Rack({ state, selected, onSelect, onDiscard }: Props) {
  const { me, names } = useSeating()
  const p = state.players[me]
  const myTurn = state.phase === 'discard' && state.current === me
  const drawn = myTurn ? state.drawn : null
  const rest = [...p.concealed]
  if (drawn) rest.splice(rest.indexOf(drawn), 1)
  const row = sortTiles(rest)
  const wind = seatWind(state, me)
  const ref = useRef<HTMLDivElement>(null)

  function tap(key: string, tile: StandardId) {
    if (!myTurn) return
    if (selected === key) onDiscard(tile)
    else {
      play('pick')
      onSelect(key)
    }
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Escape') return
    if (e.key === 'Escape') {
      onSelect(null)
      return
    }
    const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button.hand-tile') ?? [])
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (i === -1) return
    e.preventDefault()
    const j = e.key === 'ArrowLeft' ? Math.max(0, i - 1) : Math.min(buttons.length - 1, i + 1)
    buttons[j].focus()
  }

  const tileButton = (tile: StandardId, key: string) => (
    <button
      key={key}
      type="button"
      className={`hand-tile${selected === key ? ' hand-tile-picked' : ''}`}
      style={{ ['--w' as string]: 'var(--tile-hand)' }}
      aria-pressed={selected === key}
      aria-label={`${tileName(tile)}${selected === key ? ', picked. Press again to discard' : ''}`}
      disabled={!myTurn}
      onClick={() => tap(key, tile)}
    >
      <Tile id={tile} decorative />
    </button>
  )

  return (
    <section className={`you${myTurn ? ' you-active' : ''}`} aria-label={`Your hand, ${WIND_NAME[wind]}`}>
      <div className="you-row" ref={ref} onKeyDown={onKey}>
        <div className="hand" role="group" aria-label="Your tiles">
          {row.map((t, i) => tileButton(t, `${i}:${t}`))}
          {drawn && <span className="hand-gap" aria-hidden="true" />}
          {drawn && tileButton(drawn, 'drawn')}
        </div>
        <div className="you-open">
          <MeldRow melds={p.melds} size={30} />
          <Flowers flowers={p.flowers} size={24} />
        </div>
      </div>
      <footer className="you-foot">
        <span className="seat-wind" lang="zh-Hant" aria-hidden="true">
          {WIND_CHAR[wind]}
        </span>
        <span className="seat-name">{names[me] === 'You' ? 'You' : `You (${names[me]})`}</span>
        {dealerOf(state) === me && (
          <span className="dealer-mark" title="Dealer">
            <span lang="zh-Hant">莊</span>
            <span className="sr-only"> dealer</span>
          </span>
        )}
        <span className="seat-score">{formatPoints(p.score)}</span>
      </footer>
    </section>
  )
}
