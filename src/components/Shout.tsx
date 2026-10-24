import type { Call } from '../calls'
import type { TileId } from '../engine/tiles'
import Tile from './Tile'

/** What is called out, the way it is said at a Hong Kong table, with the English under it. */
const CALLS = {
  chow: { cjk: '上', word: 'Chow!' },
  pung: { cjk: '碰', word: 'Pung!' },
  kong: { cjk: '槓', word: 'Kong!' },
  win: { cjk: '食糊', word: 'Win!' },
  selfDrawn: { cjk: '自摸', word: 'Self-drawn!' },
} as const

/**
 * The call stamped over the seat that made it, like a seal pressed on the
 * felt. The status line already says it in words, so this is for the eye.
 */
export default function Shout({ call }: { call: Call | null }) {
  if (!call) return null
  const text = call.kind === 'win' && call.own ? CALLS.selfDrawn : CALLS[call.kind]
  return (
    <span key={call.id} className={`shout shout-${call.kind}`} aria-hidden="true">
      <span className="shout-seal" lang="zh-Hant">
        {text.cjk}
      </span>
      <span className="shout-word">{text.word}</span>
    </span>
  )
}

/** How many tiles fall in a shower. */
export const SHOWER_SIZE = 30

/** For a win: the winning hand showers down over the table. Each piece's path is fixed by its place, so a shower always looks the same. */
export function TileShower({ tiles }: { tiles: readonly TileId[] }) {
  if (tiles.length === 0) return null
  const pieces = Array.from({ length: SHOWER_SIZE }, (_, i) => tiles[(i * 7) % tiles.length])
  return (
    <div className="shower" aria-hidden="true">
      {pieces.map((t, i) => (
        <span
          key={i}
          className="shower-tile"
          style={{
            ['--x' as string]: `${(i * 37 + 3) % 100}%`,
            ['--d' as string]: `${(i % 7) * 90}ms`,
            ['--t' as string]: `${1500 + (i % 5) * 170}ms`,
            ['--r' as string]: `${(i * 131) % 360}deg`,
            ['--dx' as string]: `${((i * 53) % 120) - 60}px`,
          }}
        >
          <Tile id={t} size={i % 3 === 0 ? 20 : 15} decorative />
        </span>
      ))}
    </div>
  )
}
