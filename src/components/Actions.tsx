import { canSelfWin, kongOptions, type Claim, type Decision, type GameState } from '../engine/game'
import { tileName, type StandardId } from '../engine/tiles'
import { nameOf } from '../names'
import { narrate } from '../narrate'
import { useSeating } from '../seat'
import Tile from './Tile'

interface Props {
  state: GameState
  selected: string | null
  selectedTile: StandardId | null
  onDiscard: (tile: StandardId) => void
  onSelfWin: () => void
  onKong: (tile: StandardId) => void
  onDecide: (d: Decision) => void
}

/** Everything the person can do right now, with a line saying what just happened. */
export default function Actions({ state, selected, selectedTile, onDiscard, onSelfWin, onKong, onDecide }: Props) {
  const seating = useSeating()
  const { me } = seating
  const myTurn = state.phase === 'discard' && state.current === me
  const claim = state.phase === 'claim' && state.claim && state.claim.options[me] && !state.claim.decisions[me] ? state.claim : null
  const last = state.log[state.log.length - 1]
  const win = myTurn ? canSelfWin(state, me) : null
  const kongs = myTurn ? kongOptions(state, me) : []

  let status: string
  if (claim) status = `${nameOf(seating, claim.from)} ${claim.source === 'kong' ? 'is adding' : 'discarded'} ${tileName(claim.tile)}.`
  else if (myTurn) status = selected ? `Tap ${tileName(selectedTile!)} again to discard it.` : state.drawn ? 'Your turn. Pick a tile to discard.' : 'Pick a tile to discard.'
  else if (state.phase === 'discard') status = `${narrate(last, seating)} ${nameOf(seating, state.current)} is thinking.`
  else if (state.phase === 'claim') status = `${narrate(last, seating)} Waiting for the others.`
  else status = narrate(last, seating)

  const claimLabel = (c: Claim) => {
    switch (c.kind) {
      case 'chow':
        return (
          <>
            <span className="act-cjk" lang="zh-Hant" aria-hidden="true">
              上
            </span>
            Chow
            <span className="act-tiles" aria-hidden="true">
              <Tile id={c.tiles[0]} size={22} decorative />
              <Tile id={claim!.tile} size={22} decorative />
              <Tile id={c.tiles[1]} size={22} decorative />
            </span>
            <span className="sr-only">
              {' '}
              with {tileName(c.tiles[0])} and {tileName(c.tiles[1])}
            </span>
          </>
        )
      case 'pung':
        return (
          <>
            <span className="act-cjk" lang="zh-Hant" aria-hidden="true">
              碰
            </span>
            Pung
          </>
        )
      case 'kong':
        return (
          <>
            <span className="act-cjk" lang="zh-Hant" aria-hidden="true">
              槓
            </span>
            Kong
          </>
        )
      case 'win':
        return (
          <>
            <span className="act-cjk" lang="zh-Hant" aria-hidden="true">
              糊
            </span>
            Win
          </>
        )
    }
  }

  return (
    <div className="actions">
      <p className="status" role="status">
        {status}
      </p>
      <div className="act-row">
        {claim &&
          claim.options[me]!.map((c, i) => (
            <button key={i} type="button" className={`act${c.kind === 'win' ? ' act-win' : ''}`} onClick={() => onDecide(c)}>
              {claimLabel(c)}
            </button>
          ))}
        {claim && (
          <button type="button" className="act act-pass" onClick={() => onDecide({ kind: 'pass' })}>
            <span className="act-cjk" lang="zh-Hant" aria-hidden="true">
              過
            </span>
            Pass
          </button>
        )}
        {win && (
          <button type="button" className="act act-win" onClick={onSelfWin}>
            <span className="act-cjk" lang="zh-Hant" aria-hidden="true">
              糊
            </span>
            Win, {win.total} faan
          </button>
        )}
        {kongs.map((k) => (
          <button key={k.tile} type="button" className="act" onClick={() => onKong(k.tile)}>
            <span className="act-cjk" lang="zh-Hant" aria-hidden="true">
              槓
            </span>
            Kong
            <span className="act-tiles" aria-hidden="true">
              <Tile id={k.tile} size={22} decorative />
            </span>
            <span className="sr-only"> {tileName(k.tile)}</span>
          </button>
        ))}
        {myTurn && selectedTile && (
          <button type="button" className="act act-discard" onClick={() => onDiscard(selectedTile)}>
            Discard {tileName(selectedTile)}
          </button>
        )}
      </div>
    </div>
  )
}
