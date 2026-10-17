import { useEffect, useRef, type ReactNode } from 'react'
import type { Seat } from '../engine/game'
import { tileName, type TileId } from '../engine/tiles'
import type { LogHistory, LogItem } from '../log'
import { WIND_NAME, conjugate, formatPoints, isMe, nameOf, possessive, type Seating } from '../names'
import { useSeating } from '../seat'
import Tile from './Tile'

interface Props {
  log: LogHistory
  open: boolean
  onToggle: () => void
}

function Line({ entry, seating }: { entry: LogItem['entry']; seating: Seating }) {
  const who = (seat: Seat) => <b className={isMe(seating, seat) ? 'log-you' : 'log-name'}>{nameOf(seating, seat)}</b>
  const tile = (id: TileId) => (
    <>
      <span className="log-tile" aria-hidden="true">
        <Tile id={id} size={17} decorative />
      </span>
      {tileName(id)}
    </>
  )
  switch (entry.kind) {
    case 'note':
      return <>{entry.text}</>
    case 'deal':
      return (
        <>
          Hand {entry.hand}, {WIND_NAME[entry.prevailing]} round. {who(entry.dealer)} {conjugate(seating, entry.dealer, 'deal', 'deals')}.
        </>
      )
    case 'flower':
      return (
        <>
          {who(entry.seat)} drew {tile(entry.tile)} and took a replacement.
        </>
      )
    case 'discard':
      return (
        <>
          {who(entry.seat)} discarded {tile(entry.tile)}.
        </>
      )
    case 'chow':
    case 'pung':
    case 'kong':
      return (
        <>
          {who(entry.seat)} {entry.kind} on {possessive(seating, entry.from, true)} {tile(entry.tile)}.
        </>
      )
    case 'concealedKong':
      return (
        <>
          {who(entry.seat)} declared a concealed kong of {tile(entry.tile)}.
        </>
      )
    case 'addedKong':
      return (
        <>
          {who(entry.seat)} added {tile(entry.tile)} to a pung.
        </>
      )
    case 'win':
      return (
        <>
          {who(entry.seat)} {conjugate(seating, entry.seat, 'win', 'wins')}{' '}
          {entry.from === null ? <>by self-draw on {tile(entry.tile)}</> : <>on {possessive(seating, entry.from, true)} {tile(entry.tile)}</>}: {entry.faan}{' '}
          faan, {formatPoints(entry.points)} points.
        </>
      )
    case 'exhausted':
      return <>The wall is exhausted. Nobody wins.</>
  }
}

/**
 * Everything that has happened at the table, oldest first, with the newest
 * line kept in view unless the reader has scrolled back.
 */
export default function Log({ log, open, onToggle }: Props) {
  const seating = useSeating()
  const list = useRef<HTMLOListElement>(null)
  const stick = useRef(true)
  const count = log.items.length

  useEffect(() => {
    const el = list.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [count, open])

  const onScroll = () => {
    const el = list.current
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24
  }

  const lines: ReactNode[] = log.items.map((item) => {
    const kind = item.entry.kind
    const mine = 'seat' in item.entry && isMe(seating, item.entry.seat)
    return (
      <li key={item.id} className={`log-line log-${kind}${mine ? ' log-mine' : ''}`}>
        <Line entry={item.entry} seating={seating} />
      </li>
    )
  })

  return (
    <section className={`log${open ? ' log-open' : ''}`} aria-label="Table log">
      <header className="log-head">
        <h2 className="log-title">Log</h2>
        <button type="button" className="link-btn" aria-expanded={open} aria-controls="table-log" onClick={onToggle}>
          {open ? 'Hide' : 'Show'}
        </button>
      </header>
      {open && (
        <ol id="table-log" className="log-list" ref={list} onScroll={onScroll}>
          {lines.length ? lines : <li className="log-line log-note">Nothing has happened yet.</li>}
        </ol>
      )}
    </section>
  )
}
