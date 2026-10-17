import type { Seat } from '../engine/game'
import { tileName, type StandardId } from '../engine/tiles'
import { nameOf, possessive } from '../names'
import { useSeating } from '../seat'
import Tile from './Tile'

interface Props {
  seat: Seat
  tiles: readonly StandardId[]
  /** The tile just thrown, which others may still claim. */
  latest: boolean
  side: 'top' | 'bottom' | 'left' | 'right'
}

/** A player's discards, oldest first. */
export default function River({ seat, tiles, latest, side }: Props) {
  const seating = useSeating()
  return (
    <div
      className={`river river-${side}`}
      role="img"
      aria-label={
        tiles.length
          ? `${possessive(seating, seat)} discards: ${tiles.map(tileName).join(', ')}`
          : `${nameOf(seating, seat)} ${seat === seating.me ? 'have' : 'has'} not discarded yet`
      }
    >
      {tiles.map((t, i) => (
        <span key={i} className={`river-tile${latest && i === tiles.length - 1 ? ' river-latest' : ''}`}>
          <Tile id={t} size={30} decorative />
        </span>
      ))}
    </div>
  )
}
