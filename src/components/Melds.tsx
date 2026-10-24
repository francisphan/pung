import type { GameMeld, Seat } from '../engine/game'
import { tileName, type BonusId } from '../engine/tiles'
import { nameOf } from '../names'
import { useSeating } from '../seat'
import Tile from './Tile'

/** One declared set. The claimed tile lies on its side; a concealed kong hides its ends. */
export function Meld({
  meld,
  size,
  seat,
  fresh = false,
}: {
  meld: GameMeld
  size: number
  seat?: Seat
  /** Just made or extended: the tiles are laid down one after another, the taken one last. */
  fresh?: boolean
}) {
  const seating = useSeating()
  const kindName = meld.kind === 'kong' ? (meld.open ? 'kong' : 'concealed kong') : meld.kind
  const label = `${kindName} of ${tileName(meld.tiles[0])}${meld.from !== undefined ? `, claimed from ${nameOf(seating, meld.from)}` : ''}`
  const claimedAt = meld.open && meld.claimed ? meld.tiles.indexOf(meld.claimed) : -1
  // Order of arrival: the tiles from the hand first, then the one taken from the river.
  const arrival = (i: number) => (i === claimedAt ? meld.tiles.length - 1 : claimedAt >= 0 && i > claimedAt ? i - 1 : i)
  return (
    <span className={`meld${fresh ? ' meld-fresh' : ''}`} role="img" aria-label={seat !== undefined ? `${nameOf(seating, seat)}: ${label}` : label}>
      {meld.tiles.map((t, i) => {
        const style = fresh ? { ['--i' as string]: arrival(i) } : undefined
        if (!meld.open && meld.kind === 'kong' && (i === 0 || i === 3)) {
          return <Tile key={i} id={t} size={size} back style={style} decorative />
        }
        return <Tile key={i} id={t} size={size} turned={i === claimedAt} style={style} decorative />
      })}
    </span>
  )
}

export function MeldRow({
  melds,
  size,
  seat,
  fresh = null,
}: {
  melds: readonly GameMeld[]
  size: number
  seat?: Seat
  /** Index of a meld just made or extended, if any. */
  fresh?: number | null
}) {
  if (melds.length === 0) return null
  return (
    <div className="melds">
      {melds.map((m, i) => (
        <Meld key={i} meld={m} size={size} seat={seat} fresh={i === fresh} />
      ))}
    </div>
  )
}

export function Flowers({ flowers, size }: { flowers: readonly BonusId[]; size: number }) {
  if (flowers.length === 0) return null
  return (
    <div className="flowers" role="img" aria-label={`Flowers: ${flowers.map(tileName).join(', ')}`}>
      {flowers.map((f, i) => (
        <Tile key={i} id={f} size={size} decorative />
      ))}
    </div>
  )
}
