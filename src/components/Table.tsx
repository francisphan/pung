import { useState } from 'react'
import type { Decision, GameState } from '../engine/game'
import { sortTiles, type StandardId } from '../engine/tiles'
import { HUMAN } from '../hooks/useGame'
import Actions from './Actions'
import Compass from './Compass'
import Log from './Log'
import Opponent from './Opponent'
import Rack from './Rack'
import River from './River'

interface Props {
  state: GameState
  onDiscard: (tile: StandardId) => void
  onSelfWin: () => void
  onKong: (tile: StandardId) => void
  onDecide: (d: Decision) => void
}

/** Seats: play runs counter-clockwise, so the next player is on your right. */
const RIGHT = 1
const ACROSS = 2
const LEFT = 3

export default function Table({ state, onDiscard, onSelfWin, onKong, onDecide }: Props) {
  const me = state.players[HUMAN]
  const myTurn = state.phase === 'discard' && state.current === HUMAN
  const drawn = myTurn ? state.drawn : null
  // A pick only lives as long as the rack it was made on.
  const signature = `${state.handIndex}|${state.phase}|${drawn ?? ''}|${me.concealed.join(',')}`
  const [pick, setPick] = useState<{ key: string; sig: string } | null>(null)
  const selected = pick && pick.sig === signature ? pick.key : null
  const setSelected = (key: string | null) => setPick(key ? { key, sig: signature } : null)
  let selectedTile: StandardId | null = null
  if (selected === 'drawn') selectedTile = drawn
  else if (selected) {
    const rest = [...me.concealed]
    if (drawn) rest.splice(rest.indexOf(drawn), 1)
    const i = Number(selected.split(':')[0])
    selectedTile = sortTiles(rest)[i] ?? null
  }
  const latest = state.lastDiscard
  const river = (seat: 0 | 1 | 2 | 3, side: 'top' | 'bottom' | 'left' | 'right') => (
    <River seat={seat} side={side} tiles={state.players[seat].discards} latest={latest?.seat === seat} />
  )

  return (
    <div className="table">
      <div className="area-top">
        <Opponent state={state} seat={ACROSS} layout="top" />
      </div>
      <div className="area-chips">
        <Opponent state={state} seat={LEFT} layout="chip" />
        <Opponent state={state} seat={ACROSS} layout="chip" />
        <Opponent state={state} seat={RIGHT} layout="chip" />
      </div>
      <div className="area-left">
        <Opponent state={state} seat={LEFT} layout="side" />
      </div>
      <div className="area-mid">
        <div className="rivers">
          <div className="rivers-top">{river(ACROSS, 'top')}</div>
          <div className="rivers-left">{river(LEFT, 'left')}</div>
          <div className="rivers-center">
            <Compass state={state} />
          </div>
          <div className="rivers-right">{river(RIGHT, 'right')}</div>
          <div className="rivers-bottom">{river(HUMAN, 'bottom')}</div>
        </div>
      </div>
      <div className="area-right">
        <Opponent state={state} seat={RIGHT} layout="side" />
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
        />
        <Rack state={state} selected={selected} onSelect={setSelected} onDiscard={onDiscard} />
        <Log state={state} />
      </div>
    </div>
  )
}
