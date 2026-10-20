import { TILE_H, TILE_W, TileBack, TileFace } from './Tile'
import { tileName, type TileId } from '../../engine/tiles'

export const UNIT = TILE_W + 4

export type TileState = 'hilite' | 'correct' | 'wrong' | 'dim' | 'open'

export interface HandTile {
  /** Stable identity so a tile animates when its slot changes. */
  key: string
  id: TileId
  /** Horizontal position in tile widths. Fractions give gaps between groups. */
  slot: number
  raised?: boolean
  state?: TileState
  back?: boolean
}

export interface HandLabel {
  from: number
  to: number
  text: string
  state?: TileState
}

interface Props {
  tiles: HandTile[]
  /** Total width in tile widths. */
  slots: number
  labels?: HandLabel[]
  hint?: boolean
  label: string
}

/** A row of tiles that slide when their slots change. */
export default function HandRow({ tiles, slots, labels = [], hint = false, label }: Props) {
  const h = TILE_H + 12 + (labels.length ? 36 : 0)
  return (
    <svg
      className="hand-row"
      viewBox={`0 -12 ${slots * UNIT} ${h}`}
      role="img"
      aria-label={`${label}: ${tiles.map((t) => (t.back ? 'face-down tile' : tileName(t.id))).join(', ')}`}
    >
      {labels.map((l) => {
        const x1 = l.from * UNIT + 2
        const x2 = l.to * UNIT - 4
        return (
          <g key={`${l.from}-${l.text}`} className={`hand-label${l.state ? ` hand-label-${l.state}` : ''}`}>
            <line x1={x1} x2={x2} y1={TILE_H + 4} y2={TILE_H + 4} />
            <text x={(x1 + x2) / 2} y={TILE_H + 30} textAnchor="middle">
              {l.text}
            </text>
          </g>
        )
      })}
      {tiles.map((t) => (
        <g
          key={t.key}
          className={`row-tile${t.state ? ` row-tile-${t.state}` : ''}`}
          style={{ transform: `translate(${t.slot * UNIT}px, ${t.raised ? -10 : 0}px)` }}
        >
          {t.back ? <TileBack /> : <TileFace id={t.id} hint={hint} />}
        </g>
      ))}
    </svg>
  )
}
