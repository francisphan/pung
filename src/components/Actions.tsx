import { useRef } from 'react'
import type { Guidance } from '../coach'
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
  /** In a guided round: the coach's move. Only its button works, and its words replace the status line. */
  guide?: Guidance | null
}

function sameDecision(a: Decision, b: Decision): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'chow' && b.kind === 'chow') return a.tiles[0] === b.tiles[0] && a.tiles[1] === b.tiles[1]
  return true
}

/** Everything the person can do right now, with a line saying what just happened. */
export default function Actions({ state, selected, selectedTile, onDiscard, onSelfWin, onKong, onDecide, guide = null }: Props) {
  const seating = useSeating()
  const { me } = seating
  const myTurn = state.phase === 'discard' && state.current === me
  const claim = state.phase === 'claim' && state.claim && state.claim.options[me] && !state.claim.decisions[me] ? state.claim : null
  const last = state.log[state.log.length - 1]
  const win = myTurn ? canSelfWin(state, me) : null
  const kongs = myTurn ? kongOptions(state, me) : []
  // A button that goes away when pressed would drop focus to the page; the status line takes it instead.
  const statusRef = useRef<HTMLParagraphElement>(null)
  const keepFocus = () =>
    requestAnimationFrame(() => {
      if (document.activeElement === document.body) statusRef.current?.focus({ preventScroll: true })
    })

  let status: string
  let coached = false
  if (guide && !(myTurn && selected)) {
    status = guide.text
    coached = true
  } else if (claim) status = `${nameOf(seating, claim.from)} ${claim.source === 'kong' ? 'is adding' : 'discarded'} ${tileName(claim.tile)}.`
  else if (myTurn) status = selected ? `Tap ${tileName(selectedTile!)} again to discard it.` : state.drawn ? 'Your turn. Pick a tile to discard.' : 'Pick a tile to discard.'
  else if (state.phase === 'discard') status = `${narrate(last, seating)} ${nameOf(seating, state.current)} is thinking.`
  else if (state.phase === 'claim') status = `${narrate(last, seating)} Waiting for the others.`
  else status = narrate(last, seating)

  // Which button the coach points at; with a guide, every other one is off.
  const litWin = guide?.action.type === 'selfWin'
  const litKong = guide?.action.type === 'kong' ? guide.action.tile : null
  const litClaim = (d: Decision) => !!guide?.decision && sameDecision(guide.decision, d)
  const litDiscard = guide?.action.type === 'discard'
  const press = (lit: boolean) => ({ className: lit ? ' act-lit' : '', disabled: guide ? !lit : undefined })

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
            <span className="sr-only"> {tileName(claim!.tile)}</span>
          </>
        )
      case 'kong':
        return (
          <>
            <span className="act-cjk" lang="zh-Hant" aria-hidden="true">
              槓
            </span>
            Kong
            <span className="sr-only"> {tileName(claim!.tile)}</span>
          </>
        )
      case 'win':
        return (
          <>
            <span className="act-cjk" lang="zh-Hant" aria-hidden="true">
              糊
            </span>
            Win
            <span className="sr-only"> on {tileName(claim!.tile)}</span>
          </>
        )
    }
  }

  return (
    <div className="actions">
      <p className={`status${coached ? ' status-coach' : ''}`} role="status" ref={statusRef} tabIndex={-1}>
        {coached && <span className="coach-tag">Coach</span>}
        {status}
      </p>
      <div className="act-row">
        {claim &&
          claim.options[me]!.map((c, i) => {
            const p = press(litClaim(c))
            return (
              <button
                key={i}
                type="button"
                className={`act${c.kind === 'win' ? ' act-win' : ''}${p.className}`}
                disabled={p.disabled}
                onClick={() => {
                  onDecide(c)
                  keepFocus()
                }}
              >
                {claimLabel(c)}
              </button>
            )
          })}
        {claim && (
          <button
            type="button"
            className={`act act-pass${press(litClaim({ kind: 'pass' })).className}`}
            disabled={press(litClaim({ kind: 'pass' })).disabled}
            onClick={() => {
              onDecide({ kind: 'pass' })
              keepFocus()
            }}
          >
            <span className="act-cjk" lang="zh-Hant" aria-hidden="true">
              過
            </span>
            Pass
          </button>
        )}
        {win && (
          <button
            type="button"
            className={`act act-win${press(litWin).className}`}
            disabled={press(litWin).disabled}
            onClick={() => {
              onSelfWin()
              keepFocus()
            }}
          >
            <span className="act-cjk" lang="zh-Hant" aria-hidden="true">
              糊
            </span>
            Win, {win.total} faan
          </button>
        )}
        {kongs.map((k) => (
          <button
            key={k.tile}
            type="button"
            className={`act${press(litKong === k.tile).className}`}
            disabled={press(litKong === k.tile).disabled}
            onClick={() => {
              onKong(k.tile)
              keepFocus()
            }}
          >
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
          <button
            type="button"
            className={`act act-discard${press(!!litDiscard).className}`}
            disabled={press(!!litDiscard).disabled}
            onClick={() => {
              onDiscard(selectedTile)
              keepFocus()
            }}
          >
            Discard {tileName(selectedTile)}
          </button>
        )}
      </div>
    </div>
  )
}
