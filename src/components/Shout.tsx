import { useId } from 'react'
import { burstPoints } from '../burst'
import type { Call } from '../calls'
import type { TileId } from '../engine/tiles'
import Tile from './Tile'

/** What is called out, with the Cantonese on a badge, and how wide a burst the word needs. */
const CALLS = {
  chow: { cjk: '上', word: 'Chow!', spikes: 12, w: 220, h: 140 },
  pung: { cjk: '碰', word: 'Pung!', spikes: 14, w: 220, h: 140 },
  kong: { cjk: '槓', word: 'Kong!', spikes: 16, w: 220, h: 140 },
  win: { cjk: '食糊', word: 'Win!', spikes: 20, w: 250, h: 160 },
  selfDrawn: { cjk: '自摸', word: 'Self-drawn!', spikes: 22, w: 360, h: 160 },
} as const

/**
 * The call bursting over the seat that made it, the way a comic book draws a
 * blow. The status line already says it in words, so this is for the eye.
 */
export default function Shout({ call }: { call: Call | null }) {
  // Ids for the halftone pattern and its mask; one burst per seat and layout, so they must not collide.
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  if (!call) return null
  const c = call.kind === 'win' && call.own ? CALLS.selfDrawn : CALLS[call.kind]
  const points = burstPoints(c.spikes, c.w, c.h)
  return (
    <span
      key={call.id}
      className={`shout shout-${call.kind}`}
      style={{ ['--bw' as string]: c.w, ['--bh' as string]: c.h }}
      aria-hidden="true"
    >
      <svg className="burst" viewBox={`0 0 ${c.w} ${c.h}`}>
        <defs>
          <pattern id={`${id}d`} width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="1.7" />
          </pattern>
          <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0.4" stopColor="#000" />
            <stop offset="1" stopColor="#fff" />
          </linearGradient>
          <mask id={`${id}m`}>
            <rect x="-40" y="-40" width={c.w + 80} height={c.h + 80} fill={`url(#${id}g)`} />
          </mask>
        </defs>
        {call.kind === 'win' && <polygon className="burst-back" points={burstPoints(c.spikes + 4, c.w, c.h, 1.16)} />}
        <polygon className="burst-shadow" points={points} transform="translate(7 8)" />
        <polygon className="burst-fill" points={points} />
        <polygon className="burst-dots" points={points} fill={`url(#${id}d)`} mask={`url(#${id}m)`} />
      </svg>
      <span className="shout-word">{c.word}</span>
      <span className="shout-cjk" lang="zh-Hant">
        {c.cjk}
      </span>
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
