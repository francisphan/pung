import { useContext, type ReactNode } from 'react'
import { TileStyleContext } from '../tileStyle'
import {
  CHINESE_NUMERAL,
  DRAGON_CHAR,
  FLOWER_CHAR,
  SEASON_CHAR,
  TILE_BY_ID,
  WIND_CHAR,
  WIND_LETTER,
  tileName,
  type Rank,
  type TileId,
} from '../engine/tiles'

/** Line-art tile face is 60 wide and 80 tall; the extra 4 is the visible edge below it. */
export const TILE_W = 60
export const TILE_H = 84

/** The classic faces are 210 wide and 255 tall, including the tile's edge. */
export const CLASSIC_W = 210
export const CLASSIC_H = 255
const SPRITE = `${import.meta.env.BASE_URL}tiles.svg`

type Ink = 'ink' | 'red' | 'green' | 'blue'

function Dot({ cx, cy, r, ink }: { cx: number; cy: number; r: number; ink: Ink }) {
  return (
    <g className={`ink-${ink}`}>
      <circle cx={cx} cy={cy} r={r} className="ink-fill" />
      <circle cx={cx} cy={cy} r={r * 0.62} className="bone-fill" />
      <circle cx={cx} cy={cy} r={r * 0.3} className="ink-fill" />
    </g>
  )
}

function Stick({ cx, cy, len, ink }: { cx: number; cy: number; len: number; ink: Ink }) {
  const w = 7
  return (
    <g className={`ink-${ink}`}>
      <rect x={cx - w / 2} y={cy - len / 2} width={w} height={len} rx={3} className="ink-fill" />
      <line x1={cx - w / 2} x2={cx + w / 2} y1={cy - len / 6} y2={cy - len / 6} className="bone-line" />
      <line x1={cx - w / 2} x2={cx + w / 2} y1={cy + len / 6} y2={cy + len / 6} className="bone-line" />
    </g>
  )
}

function Bird() {
  return (
    <g>
      <Stick cx={30} cy={60} len={26} ink="green" />
      <g className="ink-green">
        <path d="M 30 38 m -13 0 a 13 9 0 1 0 26 0 a 13 9 0 1 0 -26 0" className="ink-fill" />
        <path d="M 18 40 L 6 52 L 14 50 L 10 58 L 22 44 Z" className="ink-fill" />
        <circle cx={41} cy={29} r={6.5} className="ink-fill" />
        <path d="M 22 36 q 8 -2 14 4" className="bone-line" />
      </g>
      <g className="ink-red">
        <path d="M 46 27 L 55 29 L 46 32 Z" className="ink-fill" />
      </g>
      <circle cx={42} cy={28} r={1.5} className="bone-fill" />
    </g>
  )
}

const DOTS: Record<Rank, ReactNode> = {
  1: (
    <g>
      <Dot cx={30} cy={40} r={19} ink="green" />
      <circle cx={30} cy={40} r={9} className="ink-red ink-fill" />
      <circle cx={30} cy={40} r={3.5} className="bone-fill" />
    </g>
  ),
  2: (
    <g>
      <Dot cx={30} cy={23} r={10} ink="green" />
      <Dot cx={30} cy={57} r={10} ink="blue" />
    </g>
  ),
  3: (
    <g>
      <Dot cx={15} cy={19} r={8.5} ink="blue" />
      <Dot cx={30} cy={40} r={8.5} ink="red" />
      <Dot cx={45} cy={61} r={8.5} ink="green" />
    </g>
  ),
  4: (
    <g>
      <Dot cx={17} cy={23} r={9} ink="blue" />
      <Dot cx={43} cy={23} r={9} ink="green" />
      <Dot cx={17} cy={57} r={9} ink="green" />
      <Dot cx={43} cy={57} r={9} ink="blue" />
    </g>
  ),
  5: (
    <g>
      <Dot cx={15} cy={20} r={7.5} ink="blue" />
      <Dot cx={45} cy={20} r={7.5} ink="blue" />
      <Dot cx={30} cy={40} r={7.5} ink="red" />
      <Dot cx={15} cy={60} r={7.5} ink="blue" />
      <Dot cx={45} cy={60} r={7.5} ink="blue" />
    </g>
  ),
  6: (
    <g>
      <Dot cx={18} cy={19} r={7.5} ink="green" />
      <Dot cx={42} cy={19} r={7.5} ink="green" />
      <Dot cx={18} cy={40} r={7.5} ink="red" />
      <Dot cx={42} cy={40} r={7.5} ink="red" />
      <Dot cx={18} cy={61} r={7.5} ink="red" />
      <Dot cx={42} cy={61} r={7.5} ink="red" />
    </g>
  ),
  7: (
    <g>
      <Dot cx={14} cy={15} r={6.5} ink="green" />
      <Dot cx={30} cy={21} r={6.5} ink="green" />
      <Dot cx={46} cy={27} r={6.5} ink="green" />
      <Dot cx={18} cy={46} r={6.5} ink="red" />
      <Dot cx={42} cy={46} r={6.5} ink="red" />
      <Dot cx={18} cy={64} r={6.5} ink="red" />
      <Dot cx={42} cy={64} r={6.5} ink="red" />
    </g>
  ),
  8: (
    <g>
      {[14, 31, 48, 65].map((y) => (
        <g key={y}>
          <Dot cx={18} cy={y} r={6.5} ink="blue" />
          <Dot cx={42} cy={y} r={6.5} ink="blue" />
        </g>
      ))}
    </g>
  ),
  9: (
    <g>
      {([
        [18, 'green'],
        [40, 'red'],
        [62, 'blue'],
      ] as [number, Ink][]).map(([y, ink]) => (
        <g key={y}>
          <Dot cx={14} cy={y} r={6.5} ink={ink} />
          <Dot cx={30} cy={y} r={6.5} ink={ink} />
          <Dot cx={46} cy={y} r={6.5} ink={ink} />
        </g>
      ))}
    </g>
  ),
}

const BAMBOO: Record<Rank, ReactNode> = {
  1: <Bird />,
  2: (
    <g>
      <Stick cx={30} cy={23} len={26} ink="green" />
      <Stick cx={30} cy={57} len={26} ink="blue" />
    </g>
  ),
  3: (
    <g>
      <Stick cx={30} cy={22} len={24} ink="blue" />
      <Stick cx={17} cy={57} len={24} ink="green" />
      <Stick cx={43} cy={57} len={24} ink="green" />
    </g>
  ),
  4: (
    <g>
      <Stick cx={17} cy={23} len={26} ink="green" />
      <Stick cx={43} cy={23} len={26} ink="blue" />
      <Stick cx={17} cy={57} len={26} ink="blue" />
      <Stick cx={43} cy={57} len={26} ink="green" />
    </g>
  ),
  5: (
    <g>
      <Stick cx={15} cy={21} len={22} ink="green" />
      <Stick cx={45} cy={21} len={22} ink="green" />
      <Stick cx={30} cy={40} len={24} ink="red" />
      <Stick cx={15} cy={59} len={22} ink="green" />
      <Stick cx={45} cy={59} len={22} ink="green" />
    </g>
  ),
  6: (
    <g>
      {[15, 30, 45].map((x) => (
        <g key={x}>
          <Stick cx={x} cy={23} len={26} ink="green" />
          <Stick cx={x} cy={57} len={26} ink="blue" />
        </g>
      ))}
    </g>
  ),
  7: (
    <g>
      <Stick cx={30} cy={14} len={16} ink="red" />
      {[15, 30, 45].map((x) => (
        <g key={x}>
          <Stick cx={x} cy={38} len={20} ink="green" />
          <Stick cx={x} cy={62} len={20} ink="blue" />
        </g>
      ))}
    </g>
  ),
  8: (
    <g>
      {[15, 30, 45].map((x) => (
        <Stick key={`t${x}`} cx={x} cy={16} len={18} ink="green" />
      ))}
      <Stick cx={22} cy={40} len={18} ink="red" />
      <Stick cx={38} cy={40} len={18} ink="red" />
      {[15, 30, 45].map((x) => (
        <Stick key={`b${x}`} cx={x} cy={64} len={18} ink="blue" />
      ))}
    </g>
  ),
  9: (
    <g>
      {([
        [16, 'green'],
        [40, 'red'],
        [64, 'blue'],
      ] as [number, Ink][]).map(([y, ink]) => (
        <g key={y}>
          <Stick cx={15} cy={y} len={18} ink={ink} />
          <Stick cx={30} cy={y} len={18} ink={ink} />
          <Stick cx={45} cy={y} len={18} ink={ink} />
        </g>
      ))}
    </g>
  ),
}

function Glyph({ id }: { id: TileId }) {
  const t = TILE_BY_ID[id]
  switch (t.kind) {
    case 'suit':
      if (t.suit === 'dots') return DOTS[t.rank]
      if (t.suit === 'bamboo') return BAMBOO[t.rank]
      return (
        <g>
          <text x={30} y={25} className="tile-cjk ink-ink" fontSize={27}>
            {CHINESE_NUMERAL[t.rank]}
          </text>
          <text x={30} y={58} className="tile-cjk ink-red" fontSize={27}>
            萬
          </text>
        </g>
      )
    case 'wind':
      return (
        <text x={30} y={41} className="tile-cjk ink-ink" fontSize={40}>
          {WIND_CHAR[t.wind]}
        </text>
      )
    case 'dragon':
      if (t.dragon === 'white')
        return (
          <g className="ink-blue">
            <rect x={13} y={12} width={34} height={56} rx={2} className="ink-line" strokeWidth={4} />
            <rect x={19.5} y={18.5} width={21} height={43} rx={1} className="ink-line" strokeWidth={1.5} />
          </g>
        )
      return (
        <text x={30} y={41} className={`tile-cjk ${t.dragon === 'red' ? 'ink-red' : 'ink-green'}`} fontSize={40}>
          {DRAGON_CHAR[t.dragon]}
        </text>
      )
    case 'flower':
      return (
        <g>
          <text x={30} y={35} className="tile-cjk ink-green" fontSize={30}>
            {FLOWER_CHAR[t.index]}
          </text>
          <text x={30} y={65} className="tile-num ink-red" fontSize={15}>
            {t.index}
          </text>
        </g>
      )
    case 'season':
      return (
        <g>
          <text x={30} y={35} className="tile-cjk ink-red" fontSize={30}>
            {SEASON_CHAR[t.index]}
          </text>
          <text x={30} y={65} className="tile-num ink-green" fontSize={15}>
            {t.index}
          </text>
        </g>
      )
  }
}

function Hint({ id }: { id: TileId }) {
  const t = TILE_BY_ID[id]
  let text: string | null = null
  if (t.kind === 'suit') text = String(t.rank)
  if (t.kind === 'wind') text = WIND_LETTER[t.wind]
  if (!text) return null
  return (
    <text x={7} y={9} className="tile-hint" fontSize={10} textAnchor="start">
      {text}
    </text>
  )
}

export interface TileFaceProps {
  id: TileId
  /** Show the number or wind letter in the corner. */
  hint?: boolean
}

/** The face as an SVG group in a 60 by 84 box, for use inside a larger drawing. */
export function TileFace({ id, hint = false }: TileFaceProps) {
  return (
    <g className="tile">
      <rect x={1} y={4} width={58} height={79} rx={6} className="tile-edge" />
      <rect x={1} y={1} width={58} height={78} rx={6} className="tile-bone" />
      <Glyph id={id} />
      {hint && <Hint id={id} />}
    </g>
  )
}

/** The back of a tile, bamboo side up. */
export function TileBack() {
  return (
    <g className="tile tile-back">
      <rect x={1} y={4} width={58} height={79} rx={6} className="tile-back-edge" />
      <rect x={1} y={1} width={58} height={78} rx={6} className="tile-back-face" />
      <line x1={8} y1={28} x2={52} y2={28} className="tile-grain" />
      <line x1={8} y1={52} x2={52} y2={52} className="tile-grain" />
    </g>
  )
}

export interface TileProps extends TileFaceProps {
  /** Rendered width in CSS pixels (of an upright tile). */
  size?: number
  back?: boolean
  /** Laid on its side, as a claimed tile is in a meld. */
  turned?: boolean
  className?: string
  /** Hide from assistive tech when a parent already names it. */
  decorative?: boolean
}

/** A standalone tile as an inline SVG, in whichever style the table is set to. */
export default function Tile({ id, hint, size = 60, back = false, turned = false, className, decorative }: TileProps) {
  const style = useContext(TileStyleContext)
  const classic = style === 'classic'
  const w0 = classic ? CLASSIC_W : TILE_W
  const h0 = classic ? CLASSIC_H : TILE_H
  const h = (size * h0) / w0
  const label = back ? 'Face-down tile' : tileName(id)
  const body = classic ? (
    <use href={`${SPRITE}#${back ? 'BACK' : id}`} width={w0} height={h0} />
  ) : back ? (
    <TileBack />
  ) : (
    <TileFace id={id} hint={hint} />
  )
  return (
    <svg
      className={`tile-svg tile-${style}${className ? ` ${className}` : ''}`}
      width={turned ? h : size}
      height={turned ? size : h}
      viewBox={turned ? `0 0 ${h0} ${w0}` : `0 0 ${w0} ${h0}`}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label}
    >
      {turned ? <g transform={`translate(${h0} 0) rotate(90)`}>{body}</g> : body}
    </svg>
  )
}
