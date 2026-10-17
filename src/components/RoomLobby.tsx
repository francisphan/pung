import { useState } from 'react'
import type { Rules, Seat } from '../engine/game'
import { WIND_CHAR, WINDS } from '../engine/tiles'
import type { ConnStatus } from '../hooks/useRoom'
import { WIND_NAME } from '../names'
import type { RoomInfo, SeatInfo } from '../net/protocol'
import { joinLink } from '../net/joinLink'
import { describeRules } from '../rulesText'
import { RuleChoices } from './Choice'

interface Props {
  room: RoomInfo
  conn: ConnStatus
  error: string | null
  /** This browser runs the table, rather than a server. */
  hosting: boolean
  onSit: (seat: Seat) => void
  onBot: (seat: Seat, on: boolean) => void
  onRules: (rules: Rules) => void
  onStart: () => void
  onLeave: () => void
  onDismiss: () => void
}

function SeatCard({
  seat,
  info,
  room,
  onSit,
  onBot,
}: {
  seat: Seat
  info: SeatInfo
  room: RoomInfo
  onSit: () => void
  onBot: (on: boolean) => void
}) {
  const wind = WINDS[seat]
  const mine = info.kind === 'human' && info.id === room.you.id
  const isHost = room.host === room.you.id
  const label = `${WIND_NAME[wind]} seat`
  return (
    <div className={`seat-card${mine ? ' seat-card-mine' : ''}`} aria-label={label}>
      <div className="seat-card-wind">
        <span lang="zh-Hant" aria-hidden="true">
          {WIND_CHAR[wind]}
        </span>
        {WIND_NAME[wind]}
        {seat === 0 && <span className="seat-card-note">deals first</span>}
      </div>
      {info.kind === 'open' && <div className="seat-card-who seat-card-who-open">Open seat</div>}
      {info.kind === 'bot' && (
        <div className="seat-card-who">
          {info.name} <span className="seat-card-note">bot</span>
        </div>
      )}
      {info.kind === 'human' && (
        <div className="seat-card-who">
          {info.name}
          {mine && <span className="seat-card-note">you</span>}
          {info.id === room.host && <span className="seat-card-note">host</span>}
          {!info.connected && <span className="seat-card-note">away</span>}
        </div>
      )}
      <div className="seat-card-actions">
        {!mine && info.kind !== 'human' && (
          <button type="button" className="act act-small" onClick={onSit}>
            Sit here
          </button>
        )}
        {isHost && info.kind === 'open' && (
          <button type="button" className="act act-small act-pass" onClick={() => onBot(true)}>
            Add a bot
          </button>
        )}
        {isHost && info.kind === 'bot' && (
          <button type="button" className="act act-small act-pass" onClick={() => onBot(false)}>
            Remove bot
          </button>
        )}
      </div>
    </div>
  )
}

/** Waiting for friends: the code to share, the seats to choose, and the rules the host sets. */
export default function RoomLobby({ room, conn, error, hosting, onSit, onBot, onRules, onStart, onLeave, onDismiss }: Props) {
  const isHost = room.host === room.you.id
  const host = room.seats.find((s) => s.kind === 'human' && s.id === room.host)
  const hostName = host?.kind === 'human' ? host.name : 'the host'
  const [copied, setCopied] = useState(false)
  const humans = room.seats.filter((s) => s.kind === 'human').length

  async function copy() {
    try {
      await navigator.clipboard.writeText(joinLink(room.code))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy this link', joinLink(room.code))
    }
  }

  return (
    <div className="lobby room">
      {conn === 'lost' && (
        <p className="banner" role="status">
          Connection lost. Trying to get back to the table…
        </p>
      )}
      {error && (
        <p className="banner" role="alert">
          {error}{' '}
          <button type="button" className="link-btn" onClick={onDismiss}>
            Dismiss
          </button>
        </p>
      )}
      <div className="room-code">
        <span className="room-code-label">Table code</span>
        <span className="room-code-value" aria-label={`Table code ${room.code.split('').join(' ')}`}>
          {room.code}
        </span>
        <button type="button" className="link-btn" onClick={copy}>
          {copied ? 'Link copied' : 'Copy link'}
        </button>
      </div>
      <p className="lobby-copy">
        {isHost
          ? 'Friends join with the code or the link. Tap a seat to move; any seat still open gets a bot when you deal.'
          : `Tap an open seat to take it. ${hostName} sets the rules and deals.`}
      </p>

      <div className="seats" role="group" aria-label="Seats">
        {room.seats.map((info, i) => (
          <SeatCard key={i} seat={i as Seat} info={info} room={room} onSit={() => onSit(i as Seat)} onBot={(on) => onBot(i as Seat, on)} />
        ))}
      </div>
      {room.waiting.length > 0 && (
        <p className="room-waiting">
          Waiting for a seat: {room.waiting.map((m) => (m.id === room.you.id ? 'you' : m.name)).join(', ')}.
        </p>
      )}

      {isHost ? (
        <RuleChoices rules={room.rules} onChange={onRules} />
      ) : (
        <p className="room-rules">{describeRules(room.rules)}</p>
      )}

      <div className="lobby-actions">
        {isHost ? (
          <button type="button" className="act act-primary" onClick={onStart} disabled={conn !== 'open'}>
            Deal
          </button>
        ) : (
          <p className="room-wait" role="status">
            Waiting for {hostName} to deal.
          </p>
        )}
        <button type="button" className="act" onClick={onLeave}>
          Leave table
        </button>
      </div>
      {isHost && humans === 1 && <p className="lobby-foot">Nobody else is here yet. Deal now and the bots fill the other seats.</p>}
      {hosting && (
        <p className="lobby-foot">
          Your browser is running this table. Keep this page open while you play; closing it closes the table for
          everyone.
        </p>
      )}
    </div>
  )
}
