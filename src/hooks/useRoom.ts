import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import type { Decision, GameState, Rules, Seat } from '../engine/game'
import type { StandardId } from '../engine/tiles'
import { EMPTY_LOG, withNote, withState, type LogHistory } from '../log'
import { webrtcSupported } from '../net/broker'
import { Connection } from '../net/client'
import { Host } from '../net/host'
import type { Handlers, Link } from '../net/link'
import { PeerLink } from '../net/peerLink'
import type { ClientMessage, RoomInfo, SeatInfo, ServerMessage } from '../net/protocol'
import type { Speed } from '../pace'
import type { RoomSnapshot } from '../table/room'
import { clear, load, save } from './useGame'

const ROOM_KEY = 'pung.room.v1'
const TABLE_KEY = 'pung.table.v1'
const PLAYER_KEY = 'pung.player.v1'

type Role = 'host' | 'guest'
interface Stored {
  code: string
  role: Role
}

/** A random id this browser keeps, so a reload or a dropped connection finds its seat again. */
function playerId(): string {
  const stored = load<string>(PLAYER_KEY)
  if (stored) return stored
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  const id = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  save(PLAYER_KEY, id)
  return id
}

export type ConnStatus = 'idle' | 'connecting' | 'open' | 'lost'

export interface Online {
  conn: ConnStatus
  room: RoomInfo | null
  /** The table as your seat sees it. */
  view: GameState | null
  log: LogHistory
  error: string | null
  /** Trying to get to a table, before it has answered. */
  busy: boolean
  /** This browser is running the table. */
  hosting: boolean
}

type Event =
  | { type: 'busy'; hosting: boolean }
  | { type: 'conn'; conn: ConnStatus }
  | { type: 'left'; error?: string }
  | { type: 'dismiss' }
  | ServerMessage

const WIND_OF_SEAT = ['East', 'South', 'West', 'North']

/** Lines for the log about who came and went. */
function notes(prev: RoomInfo | null, next: RoomInfo): string[] {
  const out: string[] = []
  const was = (seat: number): SeatInfo => prev?.seats[seat] ?? { kind: 'open' }
  next.seats.forEach((now, seat) => {
    const before = was(seat)
    const mine = now.kind === 'human' && now.id === next.you.id
    if (now.kind === 'human') {
      const who = mine ? 'You' : now.name
      if (before.kind !== 'human' || before.id !== now.id) out.push(`${who} sat down at ${WIND_OF_SEAT[seat]}.`)
      else if (before.connected && !now.connected) out.push(`${now.name} lost their connection.`)
      else if (!before.connected && now.connected) out.push(`${now.name} is back.`)
    } else if (before.kind === 'human') {
      const left = before.id === next.you.id ? 'You' : before.name
      out.push(now.kind === 'bot' ? `${left} left; ${now.name} plays the seat.` : `${left} stood up.`)
    } else if (now.kind === 'bot' && before.kind !== 'bot') out.push(`${now.name} (a bot) takes ${WIND_OF_SEAT[seat]}.`)
  })
  if (prev && prev.status !== 'lobby' && next.status === 'lobby') out.push('Back to the lobby.')
  if (prev && prev.host !== next.host) {
    const host = next.seats.find((s) => s.kind === 'human' && s.id === next.host)
    if (host && host.kind === 'human') out.push(`${host.id === next.you.id ? 'You are' : `${host.name} is`} the host now.`)
  }
  return out
}

function step(o: Online, e: Event): Online {
  switch (e.type) {
    case 'busy':
      return { ...o, busy: true, error: null, hosting: e.hosting }
    case 'conn':
      return { ...o, conn: e.conn }
    case 'room': {
      let log = o.log
      for (const text of notes(o.room, e.room)) log = withNote(log, text)
      return { ...o, room: e.room, log, busy: false, error: null, view: e.room.status === 'lobby' ? null : o.view }
    }
    case 'state':
      return { ...o, view: e.state, log: withState(o.log, e.state) }
    case 'error':
      if (e.fatal) return { conn: o.conn, room: null, view: null, log: EMPTY_LOG, error: e.message, busy: false, hosting: false }
      return { ...o, error: e.message }
    case 'left':
      return { conn: 'idle', room: null, view: null, log: EMPTY_LOG, error: e.error ?? null, busy: false, hosting: false }
    case 'dismiss':
      return { ...o, error: null }
  }
}

/**
 * A seat at an online table. Hosting runs the table in this browser and
 * lets friends in over WebRTC; joining links to the host's browser. With a
 * table server configured, both go through the server instead. Either way
 * the API mirrors the solo game's, so the table components do not care.
 */
export function useRoom(serverUrl: string | null, name: string) {
  const available = !!serverUrl || webrtcSupported()
  const [o, dispatch] = useReducer(step, null, (): Online => {
    const stored = available ? load<Stored>(ROOM_KEY) : null
    return {
      conn: stored ? 'connecting' : 'idle',
      room: null,
      view: null,
      log: EMPTY_LOG,
      error: null,
      busy: !!stored,
      hosting: stored?.role === 'host' && !serverUrl,
    }
  })
  const link = useRef<Link | null>(null)
  /** What to send as soon as the link opens: create a table, or (re)join one. */
  const intent = useRef<ClientMessage | null>(null)
  const role = useRef<Role>('guest')
  const latest = useRef(o)
  const nameRef = useRef(name)
  useEffect(() => {
    latest.current = o
    nameRef.current = name
  })
  const id = useMemo(() => playerId(), [])

  const drop = useCallback((error?: string) => {
    link.current?.close()
    link.current = null
    intent.current = null
    clear(ROOM_KEY)
    dispatch({ type: 'left', error })
  }, [])

  const handlers = useMemo<Handlers>(
    () => ({
      onOpen() {
        dispatch({ type: 'conn', conn: 'open' })
        if (intent.current) link.current?.send(intent.current)
      },
      onMessage(msg) {
        if (msg.type === 'room') {
          // From now on a reconnect rejoins this table rather than creating another.
          intent.current = { type: 'join', id, name: nameRef.current, code: msg.room.code }
          save(ROOM_KEY, { code: msg.room.code, role: role.current } satisfies Stored)
        }
        dispatch(msg)
        if (msg.type === 'error' && msg.fatal) drop(msg.message)
      },
      onClose(why) {
        if (why === 'elsewhere') drop('You opened this table in another window, so this one has left it.')
        else dispatch({ type: 'conn', conn: 'lost' })
      },
    }),
    [id, drop],
  )

  /** Open the right kind of link for the role. */
  const open = useCallback(
    (what: { role: 'guest'; code: string } | { role: 'host'; rules: Rules; speed: Speed; snapshot?: RoomSnapshot | null }) => {
      link.current?.close()
      role.current = what.role
      if (serverUrl) {
        link.current = new Connection(serverUrl, handlers)
        return
      }
      if (what.role === 'guest') {
        link.current = new PeerLink(what.code, handlers)
        return
      }
      const host = new Host({
        me: { id, name: nameRef.current },
        rules: what.rules,
        speed: what.speed,
        snapshot: what.snapshot ?? null,
        handlers,
        onSnapshot: (snap) => {
          if (snap) save(TABLE_KEY, snap)
          else clear(TABLE_KEY)
        },
      })
      link.current = host
      host.start().catch(() => {
        if (link.current === host) drop('Could not open a table: the matchmaking service could not be reached.')
      })
    },
    [serverUrl, handlers, id, drop],
  )

  // Back at a table after a reload.
  useEffect(() => {
    const stored = available ? load<Stored>(ROOM_KEY) : null
    if (stored) {
      if (serverUrl || stored.role === 'guest') {
        intent.current = { type: 'join', id, name: nameRef.current, code: stored.code }
        open({ role: 'guest', code: stored.code })
      } else {
        const snapshot = load<RoomSnapshot>(TABLE_KEY)
        if (snapshot && snapshot.code === stored.code) open({ role: 'host', rules: snapshot.rules, speed: snapshot.speed, snapshot })
        else drop()
      }
    }
    return () => {
      link.current?.close()
      link.current = null
    }
  }, [available, serverUrl, id, open, drop])

  const send = useCallback((msg: ClientMessage) => {
    if (!link.current?.send(msg)) dispatch({ type: 'error', message: 'Not connected to the table right now.' })
  }, [])

  const api = useMemo(() => {
    const seat = () => latest.current.room?.you.seat ?? 0
    const action = (a: Extract<ClientMessage, { type: 'action' }>['action']) => send({ type: 'action', action: a })
    return {
      host(rules: Rules, speed: Speed) {
        const viaServer = !!serverUrl
        intent.current = viaServer ? { type: 'create', id, name: nameRef.current, rules, speed } : null
        dispatch({ type: 'busy', hosting: !viaServer })
        dispatch({ type: 'conn', conn: 'connecting' })
        open({ role: 'host', rules, speed })
        if (intent.current) link.current?.send(intent.current)
      },
      join(code: string) {
        intent.current = { type: 'join', id, name: nameRef.current, code }
        dispatch({ type: 'busy', hosting: false })
        dispatch({ type: 'conn', conn: 'connecting' })
        open({ role: 'guest', code })
        link.current?.send(intent.current)
      },
      leave() {
        link.current?.send({ type: 'leave' })
        clear(TABLE_KEY)
        drop()
      },
      dismiss() {
        dispatch({ type: 'dismiss' })
      },
      sit(seat: Seat) {
        send({ type: 'sit', seat })
      },
      setBot(seat: Seat, on: boolean) {
        send({ type: 'bot', seat, on })
      },
      setRules(rules: Rules) {
        send({ type: 'rules', rules })
      },
      setSpeed(speed: Speed) {
        send({ type: 'speed', speed })
      },
      start() {
        send({ type: 'start' })
      },
      again() {
        send({ type: 'again' })
      },
      discard(tile: StandardId) {
        action({ type: 'discard', seat: seat(), tile })
      },
      selfWin() {
        action({ type: 'selfWin', seat: seat() })
      },
      kong(tile: StandardId) {
        action({ type: 'kong', seat: seat(), tile })
      },
      decide(d: Decision) {
        action({ type: 'decide', decisions: { [seat()]: d } })
      },
      nextHand() {
        action({ type: 'nextHand' })
      },
    }
  }, [open, send, drop, id, serverUrl])

  return { ...o, available, viaServer: !!serverUrl, ...api }
}
