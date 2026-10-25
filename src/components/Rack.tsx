import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Call } from '../calls'
import { dealerOf, seatWind, type GameState } from '../engine/game'
import { WIND_CHAR, sortTiles, tileName, type StandardId } from '../engine/tiles'
import { WIND_NAME, formatPoints } from '../names'
import { useSeating } from '../seat'
import { play } from '../sound'
import { Flowers, MeldRow } from './Melds'
import Shout from './Shout'
import Tile from './Tile'

interface Props {
  state: GameState
  /** Picked tile: index into the displayed row, or 'drawn'. */
  selected: string | null
  onSelect: (key: string | null) => void
  onDiscard: (tile: StandardId) => void
  /** In a guided round: the one tile that may be thrown now, or none when the move is a button. */
  guide?: { tile: StandardId | null } | null
  /** A call you just made, stamped over your rack. */
  call?: Call | null
}

/** Your tiles, drawn tile apart on the right. Tap to pick, tap again to throw. */
export default function Rack({ state, selected, onSelect, onDiscard, guide = null, call = null }: Props) {
  const { me, names } = useSeating()
  const p = state.players[me]
  const myTurn = state.phase === 'discard' && state.current === me
  const drawn = myTurn ? state.drawn : null
  // Once you have won, the rack shows the whole hand, the taken tile included, and rings the tile that won.
  const over = state.phase === 'handEnd' || state.phase === 'gameEnd'
  const r = state.result
  const won = over && r?.kind === 'win' && r.winner === me ? r : null
  const rest = won ? [...won.hand.concealed] : [...p.concealed]
  if (drawn) rest.splice(rest.indexOf(drawn), 1)
  const row = sortTiles(rest)
  const winAt = won ? row.indexOf(won.winningTile) : -1
  const wind = seatWind(state, me)
  const ref = useRef<HTMLDivElement>(null)
  // The rack is one Tab stop: the tile last focused (or the first) takes the Tab, arrows move along the row.
  const [focusKey, setFocusKey] = useState<string | null>(null)
  // Whether the rack held focus when a tile was thrown, so the turn's return can give it back.
  const hadFocus = useRef(false)
  useEffect(() => {
    if (!myTurn || !hadFocus.current) return
    hadFocus.current = false
    const a = document.activeElement
    if (a === document.body || a === ref.current) ref.current?.querySelector<HTMLButtonElement>('button.hand-tile:not(:disabled)')?.focus({ preventScroll: true })
  }, [myTurn])
  // The glowing tile: the drawn one if it is the pick, else its first copy in the row.
  let lit: string | null = null
  if (guide?.tile) {
    if (drawn === guide.tile) lit = 'drawn'
    else {
      const i = row.indexOf(guide.tile)
      if (i >= 0) lit = `${i}:${guide.tile}`
    }
  }

  function tap(key: string, tile: StandardId) {
    if (!myTurn) return
    if (selected === key) {
      // The thrown tile is disabled with the turn, which would drop focus to the page; the row holds it instead.
      hadFocus.current = ref.current?.contains(document.activeElement) ?? false
      onDiscard(tile)
      if (hadFocus.current)
        requestAnimationFrame(() => {
          if (document.activeElement === document.body) ref.current?.focus({ preventScroll: true })
        })
    } else {
      play('pick')
      onSelect(key)
    }
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End' && e.key !== 'Escape') return
    if (e.key === 'Escape') {
      onSelect(null)
      return
    }
    const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button.hand-tile') ?? [])
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (i === -1) return
    e.preventDefault()
    const j = e.key === 'ArrowLeft' ? Math.max(0, i - 1) : e.key === 'ArrowRight' ? Math.min(buttons.length - 1, i + 1) : e.key === 'Home' ? 0 : buttons.length - 1
    buttons[j].focus()
  }

  // In a guided round only the lit tile can be pressed, so it must be the one Tab reaches.
  const keys = [...row.map((t, i) => `${i}:${t}`), ...(drawn ? ['drawn'] : [])]
  const stop = guide !== null ? lit : focusKey !== null && keys.includes(focusKey) ? focusKey : keys[0]
  const tileButton = (tile: StandardId, key: string, win = false) => (
    <button
      key={key}
      type="button"
      className={`hand-tile${selected === key ? ' hand-tile-picked' : ''}${lit === key ? ' hand-tile-lit' : ''}${win ? ' hand-tile-win' : ''}`}
      style={{ ['--w' as string]: 'var(--tile-hand)' }}
      aria-pressed={selected === key}
      aria-label={`${tileName(tile)}${win ? ', the winning tile' : ''}${lit === key ? ", the coach’s pick" : ''}${selected === key ? ', press again to discard' : ''}`}
      disabled={!myTurn || (guide !== null && lit !== key)}
      tabIndex={key === stop ? 0 : -1}
      onFocus={() => setFocusKey(key)}
      onClick={() => tap(key, tile)}
    >
      <Tile id={tile} decorative />
    </button>
  )

  return (
    <section className={`you${myTurn ? ' you-active' : ''}${won ? ' you-winner' : ''}`} aria-label={`Your hand, ${WIND_NAME[wind]}`}>
      <div className="you-row" ref={ref} tabIndex={-1} onKeyDown={onKey}>
        <div className="hand" role="group" aria-label="Your tiles">
          {row.map((t, i) => tileButton(t, `${i}:${t}`, i === winAt))}
          {drawn && <span className="hand-gap" aria-hidden="true" />}
          {drawn && tileButton(drawn, 'drawn')}
        </div>
        <div className="you-open">
          <MeldRow melds={p.melds} size={30} fresh={call?.meld ?? null} />
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
      </footer>
      <Shout call={call} />
    </section>
  )
}
