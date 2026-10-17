import { TILE_BY_ID, tileName, type TileId } from '../engine/tiles'

/**
 * One tile, drawn from the sprite in public/tiles.svg: the classic faces by
 * Cangjie6 (Wikimedia Commons, CC BY-SA 4.0), each 210 wide and 255 tall
 * including the tile's edge, plus a BACK symbol.
 */
export const TILE_W = 210
export const TILE_H = 255
const SPRITE = `${import.meta.env.BASE_URL}tiles.svg`

export interface TileProps {
  id: TileId
  /** Rendered width in CSS pixels (of an upright tile). */
  size?: number
  back?: boolean
  /** Laid on its side, as a claimed tile is in a meld. */
  turned?: boolean
  className?: string
  /** Hide from assistive tech when a parent already names it. */
  decorative?: boolean
}

/** A standalone tile as an inline SVG. */
export default function Tile({ id, size = 60, back: faceDown = false, turned = false, className, decorative }: TileProps) {
  // A tile this device may not see (see engine/view.ts) is drawn face down.
  const back = faceDown || !(id in TILE_BY_ID)
  const h = (size * TILE_H) / TILE_W
  const label = back ? 'Face-down tile' : tileName(id)
  const body = <use href={`${SPRITE}#${back ? 'BACK' : id}`} width={TILE_W} height={TILE_H} />
  return (
    <svg
      className={`tile-svg${className ? ` ${className}` : ''}`}
      width={turned ? h : size}
      height={turned ? size : h}
      viewBox={turned ? `0 0 ${TILE_H} ${TILE_W}` : `0 0 ${TILE_W} ${TILE_H}`}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label}
    >
      {turned ? <g transform={`translate(${TILE_H} 0) rotate(90)`}>{body}</g> : body}
    </svg>
  )
}
