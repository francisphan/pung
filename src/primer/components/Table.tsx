import { TILE_W, TileBack, TileFace } from './Tile'
import { SEAT_NAME, type Frame, type Seat, type Spot } from '../data/round'
import { tileName } from '../../engine/tiles'

const SIZE = 400
const C = 200
const ANGLE: Record<Seat, number> = { E: 0, S: -90, W: 180, N: 90 }
const WALL_SEATS: Seat[] = ['E', 'N', 'W', 'S']
const SMALL = 14 / TILE_W
const BIG = 21 / TILE_W
const PITCH_S = 15
const PITCH_B = 22

interface Placed {
  x: number
  y: number
  r: number
  s: number
}

function rotate(seat: Seat, lx: number, ly: number): Placed {
  const a = (ANGLE[seat] * Math.PI) / 180
  const dx = lx - C
  const dy = ly - C
  return {
    x: C + dx * Math.cos(a) - dy * Math.sin(a),
    y: C + dx * Math.sin(a) + dy * Math.cos(a),
    r: ANGLE[seat],
    s: 1,
  }
}

function place(spot: Spot, handCount: Record<Seat, number>): Placed {
  if (spot.zone === 'wall') {
    const stack = Math.floor(spot.index / 2)
    const layer = spot.index % 2
    const seat = WALL_SEATS[Math.floor(stack / 18)]
    const p = stack % 18
    const r = rotate(seat, 312 - 14 * p, 309 - (layer ? 3 : 0))
    return { ...r, s: SMALL }
  }
  const seat = spot.seat!
  const big = seat === 'E'
  const pitch = big ? PITCH_B : PITCH_S
  // East's hand is anchored left so it can grow; hidden hands are centred on their side.
  const x0 = big ? 20 : C - (13 * PITCH_S) / 2
  const y = big ? 357 : 362
  if (spot.zone === 'hand') {
    const gap = (spot.drawn ? 0.5 : 0) + (spot.group ?? 0) * 0.45
    const r = rotate(seat, x0 + (spot.index + gap) * pitch, y)
    return { ...r, s: big ? BIG : SMALL }
  }
  if (spot.zone === 'meld') {
    const r = rotate(seat, x0 + (handCount[seat] + 0.6 + (spot.group ?? 0) * 3.5 + spot.index) * pitch, y)
    return { ...r, s: big ? BIG : SMALL }
  }
  const r = rotate(seat, 145 + (spot.index % 6) * 15, 287 - Math.floor(spot.index / 6) * 20)
  return { ...r, s: SMALL }
}

const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
}

function Die({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <g className="tt-die" transform={`translate(${x} ${y})`}>
      <rect x={-9} y={-9} width={18} height={18} rx={3} />
      {PIPS[n].map(([px, py], i) => (
        <circle key={i} cx={px * 5} cy={py * 5} r={1.7} />
      ))}
    </g>
  )
}

const LABEL: Record<Seat, { x: number; y: number; anchor: 'start' | 'middle' | 'end' }> = {
  E: { x: 20, y: 347, anchor: 'start' },
  S: { x: 372, y: 90, anchor: 'middle' },
  W: { x: 200, y: 56, anchor: 'middle' },
  N: { x: 28, y: 90, anchor: 'middle' },
}

const CALLOUT: Record<Seat, { x: number; y: number }> = {
  E: { x: 280, y: 282 },
  S: { x: 280, y: 122 },
  W: { x: 122, y: 122 },
  N: { x: 122, y: 282 },
}

export default function Table({ frame }: { frame: Frame }) {
  const handCount: Record<Seat, number> = { E: 0, S: 0, W: 0, N: 0 }
  for (const s of frame.spots) if (s.zone === 'hand') handCount[s.seat!]++

  const east = frame.spots
    .filter((s) => s.seat === 'E' && s.zone !== 'discard')
    .sort((a, b) => (a.zone === b.zone ? a.index - b.index : a.zone === 'hand' ? -1 : 1))
  const describe = `Table. ${frame.title}. Your hand: ${east
    .map((s) => (s.tile ? tileName(s.tile) : 'unknown'))
    .join(', ')}.`

  return (
    <svg className="round-table" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={describe}>
      <rect x={0} y={0} width={SIZE} height={SIZE} className="tt-felt" />

      {frame.showSeats && (
        <g className="tt-center">
          <rect x={189} y={176} width={22} height={30} rx={3} className="tt-marker" />
          <text x={200} y={192} className="tt-marker-cjk" fontSize={17}>
            東
          </text>
          <text x={200} y={222} className="tt-caption" textAnchor="middle">
            East round
          </text>
        </g>
      )}

      {frame.dice && (
        <g>
          <Die x={176} y={150} n={frame.dice[0]} />
          <Die x={204} y={150} n={frame.dice[1]} />
          <text x={232} y={154} className="tt-caption" textAnchor="start">
            = {frame.dice[0] + frame.dice[1]}
          </text>
        </g>
      )}

      {frame.breakAt !== undefined && (
        <line x1={228} x2={228} y1={298} y2={336} className="tt-break" />
      )}

      {frame.spots.map((spot) => {
        const p = place(spot, handCount)
        return (
          <g
            key={spot.key}
            className={`tt-tile${spot.zone === 'wall' && spot.index % 2 ? ' tt-tile-top' : ''}`}
            style={{ transform: `translate(${p.x}px, ${p.y}px) rotate(${p.r}deg) scale(${p.s})` }}
          >
            {spot.faceUp && spot.tile ? <TileFace id={spot.tile} /> : <TileBack />}
          </g>
        )
      })}

      {frame.showSeats &&
        (Object.keys(LABEL) as Seat[]).map((seat) => {
          const l = LABEL[seat]
          const active = frame.active === seat
          return (
            <text
              key={seat}
              x={l.x}
              y={l.y}
              textAnchor={l.anchor}
              className={`tt-seat${active ? ' tt-seat-active' : ''}`}
            >
              {seat === 'E' ? 'You, East' : SEAT_NAME[seat]}
              {seat === 'E' && (
                <tspan className="tt-dealer" dx={8}>
                  dealer
                </tspan>
              )}
            </text>
          )
        })}

      {frame.callouts.map((c) => {
        const at = CALLOUT[c.seat]
        const w = c.text.length * 7 + 14
        return (
          <g key={c.seat} className={`tt-callout${c.wins ? ' tt-callout-wins' : ''}`} transform={`translate(${at.x} ${at.y})`}>
            <rect x={-w / 2} y={-11} width={w} height={22} rx={11} />
            <text y={4} textAnchor="middle">
              {c.text}
            </text>
          </g>
        )
      })}

    </svg>
  )
}
