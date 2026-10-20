import { TILE_BY_ID, WIND_LETTER, tileName, type TileId } from '../../engine/tiles'

/**
 * The classic faces (Cangjie6, Wikimedia Commons, CC BY-SA 4.0) live in one
 * sprite, public/tiles.svg, built in the Pung repository and copied here.
 * Each face is 210 by 255 in the sprite; drawings compose them in a 60-wide
 * box so their layout units stay small.
 */
export const TILE_W = 60
export const TILE_H = (TILE_W * 255) / 210
const SPRITE = `${import.meta.env.BASE_URL}tiles.svg`

function Hint({ id }: { id: TileId }) {
  const t = TILE_BY_ID[id]
  let text: string | null = null
  if (t.kind === 'suit') text = String(t.rank)
  if (t.kind === 'wind') text = WIND_LETTER[t.wind]
  if (!text) return null
  return (
    <g className="tile-hint-mark">
      <rect x={2.5} y={2.5} width={13} height={12} rx={2.5} className="tile-hint-bg" />
      <text x={9} y={8.6} className="tile-hint" fontSize={9} textAnchor="middle">
        {text}
      </text>
    </g>
  )
}

/** A rounded frame over the tile that CSS can stroke or tint for a state: picked, correct, wrong, open, top of a stack. */
function Ring() {
  return <rect x={1.5} y={1.5} width={TILE_W - 3} height={TILE_H - 3} rx={5} className="tile-ring" />
}

export interface TileFaceProps {
  id: TileId
  /** Show the number or wind letter in the corner. */
  hint?: boolean
}

/** The face as an SVG group in a 60 by 73 box, for use inside a larger drawing. */
export function TileFace({ id, hint = false }: TileFaceProps) {
  return (
    <g className="tile">
      <use href={`${SPRITE}#${id}`} width={TILE_W} height={TILE_H} />
      <Ring />
      {hint && <Hint id={id} />}
    </g>
  )
}

/** The back of a tile. */
export function TileBack() {
  return (
    <g className="tile tile-back">
      <use href={`${SPRITE}#BACK`} width={TILE_W} height={TILE_H} />
      <Ring />
    </g>
  )
}

export interface TileProps extends TileFaceProps {
  /** Rendered width in CSS pixels. */
  size?: number
  back?: boolean
  className?: string
  /** Hide from assistive tech when a parent already names it. */
  decorative?: boolean
}

/** A standalone tile as an inline SVG. */
export default function Tile({ id, hint, size = 60, back = false, className, decorative }: TileProps) {
  const h = (size * TILE_H) / TILE_W
  return (
    <svg
      className={`tile-svg${className ? ` ${className}` : ''}`}
      width={size}
      height={h}
      viewBox={`0 0 ${TILE_W} ${TILE_H}`}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : back ? 'Face-down tile' : tileName(id)}
    >
      {back ? <TileBack /> : <TileFace id={id} hint={hint} />}
    </svg>
  )
}
