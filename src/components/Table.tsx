import { useState } from 'react'
import { callOf, logMark } from '../calls'
import type { Guidance } from '../coach'
import type { Decision, GameState, Seat } from '../engine/game'
import { sortTiles, type StandardId } from '../engine/tiles'
import type { LogHistory } from '../log'
import { nameOf } from '../names'
import { useSeating } from '../seat'
import Actions from './Actions'
import Compass from './Compass'
import Log from './Log'
import Opponent from './Opponent'
import Rack from './Rack'
import River from './River'
import Shout, { TileShower } from './Shout'

interface Props {
  state: GameState
  log: LogHistory
  logOpen: boolean
  onToggleLog: () => void
  onDiscard: (tile: StandardId) => void
  onSelfWin: () => void
  onKong: (tile: StandardId) => void
  onDecide: (d: Decision) => void
  /** In a guided round: the coach's move for this moment. */
  guide?: Guidance | null
}

export default function Table({ state, log, logOpen, onToggleLog, onDiscard, onSelfWin, onKong, onDecide, guide = null }: Props) {
  const seating = useSeating()
  const me = seating.me
  // Play runs counter-clockwise, so the next player is on your right.
  const right = ((me + 1) % 4) as Seat
  const across = ((me + 2) % 4) as Seat
  const left = ((me + 3) % 4) as Seat
  const mine = state.players[me]
  const myTurn = state.phase === 'discard' && state.current === me
  const drawn = myTurn ? state.drawn : null
  // A pick only lives as long as the rack it was made on.
  const signature = `${state.handIndex}|${state.phase}|${drawn ?? ''}|${mine.concealed.join(',')}`
  const [pick, setPick] = useState<{ key: string; sig: string } | null>(null)
  const selected = pick && pick.sig === signature ? pick.key : null
  const setSelected = (key: string | null) => setPick(key ? { key, sig: signature } : null)
  let selectedTile: StandardId | null = null
  if (selected === 'drawn') selectedTile = drawn
  else if (selected) {
    const rest = [...mine.concealed]
    if (drawn) rest.splice(rest.indexOf(drawn), 1)
    const i = Number(selected.split(':')[0])
    selectedTile = sortTiles(rest)[i] ?? null
  }
  // A call already on the table when it opened, as after a reload, was made then; only a later one is stamped.
  const [opened] = useState(() => logMark(state))
  const call = logMark(state) === opened ? null : callOf(state)
  const callAt = (seat: Seat) => (call?.seat === seat ? call : null)
  const won = call?.kind === 'win' && state.result?.kind === 'win' ? state.result : null
  const latest = state.lastDiscard
  const river = (seat: Seat, side: 'top' | 'bottom' | 'left' | 'right') => (
    <River seat={seat} side={side} tiles={state.players[seat].discards} latest={latest?.seat === seat} />
  )

  return (
    <div className={`table${logOpen ? ' table-with-log' : ''}${won ? ' table-won' : ''}`}>
      <div className="area-top">
        <Opponent state={state} seat={across} layout="top" call={callAt(across)} />
      </div>
      <div className="area-chips">
        <Opponent state={state} seat={left} layout="chip" call={callAt(left)} />
        <Opponent state={state} seat={across} layout="chip" call={callAt(across)} />
        <Opponent state={state} seat={right} layout="chip" call={callAt(right)} />
      </div>
      <div className="area-left">
        <Opponent state={state} seat={left} layout="side" call={callAt(left)} />
      </div>
      <div className="area-mid">
        <div className="rivers">
          <div className="rivers-top">{river(across, 'top')}</div>
          <div className="rivers-left">{river(left, 'left')}</div>
          <div className="rivers-center">
            <Compass state={state} />
          </div>
          <div className="rivers-right">{river(right, 'right')}</div>
          <div className="rivers-bottom">{river(me, 'bottom')}</div>
          {/* The call bursts over the board; the set itself is laid down at the seat. */}
          <Shout call={call} by={call ? nameOf(seating, call.seat) : null} />
        </div>
      </div>
      <div className="area-right">
        <Opponent state={state} seat={right} layout="side" call={callAt(right)} />
      </div>
      <div className="area-rack">
        <Actions
          state={state}
          selected={selected}
          selectedTile={selectedTile}
          onDiscard={onDiscard}
          onSelfWin={onSelfWin}
          onKong={onKong}
          onDecide={onDecide}
          guide={guide}
        />
        <Rack
          state={state}
          selected={selected}
          onSelect={setSelected}
          onDiscard={onDiscard}
          guide={guide ? { tile: guide.action.type === 'discard' ? guide.action.tile : null } : null}
          call={callAt(me)}
        />
      </div>
      <div className="area-log">
        <Log log={log} open={logOpen} onToggle={onToggleLog} />
      </div>
      {won && <TileShower tiles={[...won.hand.concealed, ...won.hand.melds.flatMap((m) => m.tiles), ...won.flowers]} />}
    </div>
  )
}
