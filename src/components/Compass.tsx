import { dealerOf, handInRound, prevailingOf, type GameState } from '../engine/game'
import { WIND_CHAR } from '../engine/tiles'
import { HUMAN } from '../hooks/useGame'
import { NAMES, WIND_NAME } from '../names'

/** The marker in the middle of the table: round wind, hand, tiles left. */
export default function Compass({ state }: { state: GameState }) {
  const wind = prevailingOf(state)
  const hand = handInRound(state)
  return (
    <div className="compass" aria-live="polite">
      <div className="compass-wind" lang="zh-Hant" aria-hidden="true">
        {WIND_CHAR[wind]}
      </div>
      <div className="compass-text">
        <div className="compass-round">{WIND_NAME[wind]} round</div>
        <div>
          Hand {hand}
          {state.rules.rounds === 1 ? '' : ` of ${state.rules.rounds * 4}`}
        </div>
        <div>{state.wall.length} in the wall</div>
        <div className="compass-dealer">
          {NAMES[dealerOf(state)]} {dealerOf(state) === HUMAN ? 'deal' : 'deals'}
        </div>
      </div>
    </div>
  )
}
