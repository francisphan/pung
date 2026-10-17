import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import type { Decision, GameState, Rules, Seat } from '../engine/game'
import type { StandardId } from '../engine/tiles'
import { EMPTY_LOG, withNote, withState, type LogHistory } from '../log'
import { Connection } from '../net/client'
import type { ClientMessage, RoomInfo, SeatInfo, ServerMessage } from '../net/protocol'
import type { Speed } from '../pace'
import { clear, load, save } from './useGame'

const ROOM_KEY = 'pung.room.v1'
const PLAYER_KEY = 'pung.player.v1'

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
  /** Trying to get to a table, before the server has answered. */
  busy: boolean
}

type Event =
  | { type: 'busy' }
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
      return { ...o, busy: true, error: null }
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
      if (e.fatal) return { conn: o.conn, room: null, view: null, log: EMPTY_LOG, error: e.message, busy: false }
      return { ...o, error: e.message }
    case 'left':
      return { conn: 'idle', room: null, view: null, log: EMPTY_LOG, error: e.error ?? null, busy: false }
    case 'dismiss':
      return { ...o, error: null }
  }
}

/**
 * A seat at an online table. Connects when asked to host or join, remembers
 * the table across reloads, and mirrors the solo game's API so the table
 * components do not care which they are playing on.
 */
export function useRoom(url: string | null, name: string) {
  const [o, dispatch] = useReducer(step, null, (): Online => {
    const stored = url ? load<{ code: string }>(ROOM_KEY) : null
    return { conn: stored ? 'connecting' : 'idle', room: null, view: null, log: EMPTY_LOG, error: null, busy: !!stored }
  })
  const conn = useRef<Connection | null>(null)
  /** What to send as soon as the socket opens: create a table, or (re)join one. */
  const intent = useRef<ClientMessage | null>(null)
  const latest = useRef(o)
  const nameRef = useRef(name)
  useEffect(() => {
    latest.current = o
    nameRef.current = name
  })
  const id = useMemo(() => playerId(), [])

  const drop = useCallback((error?: string) => {
    conn.current?.close()
    conn.current = null
    intent.current = null
    clear(ROOM_KEY)
    dispatch({ type: 'left', error })
  }, [])

  const connect = useCallback(() => {
    if (conn.current || !url) return
    conn.current = new Connection(url, {
      onOpen() {
        dispatch({ type: 'conn', conn: 'open' })
        if (intent.current) conn.current?.send(intent.current)
      },
      onMessage(msg) {
        if (msg.type === 'room') {
          // From now on a reconnect rejoins this table rather than creating another.
          intent.current = { type: 'join', id, name: nameRef.current, code: msg.room.code }
          save(ROOM_KEY, { code: msg.room.code })
        }
        dispatch(msg)
        if (msg.type === 'error' && msg.fatal) drop(msg.message)
      },
      onClose(why) {
        if (why === 'elsewhere') drop('You opened this table in another window, so this one has left it.')
        else dispatch({ type: 'conn', conn: 'lost' })
      },
    })
  }, [url, id, drop])

  // Back at a table after a reload.
  useEffect(() => {
    const stored = url ? load<{ code: string }>(ROOM_KEY) : null
    if (stored) {
      intent.current = { type: 'join', id, name: nameRef.current, code: stored.code }
      connect()
    }
    return () => {
      conn.current?.close()
      conn.current = null
    }
  }, [url, id, connect])

  const begin = useCallback(
    (msg: ClientMessage) => {
      intent.current = msg
      dispatch({ type: 'busy' })
      dispatch({ type: 'conn', conn: conn.current?.isOpen ? 'open' : 'connecting' })
      connect()
      conn.current?.send(msg)
    },
    [connect],
  )

  const send = useCallback((msg: ClientMessage) => {
    if (!conn.current?.send(msg)) dispatch({ type: 'error', message: 'Not connected to the table right now.' })
  }, [])

  const api = useMemo(() => {
    const seat = () => latest.current.room?.you.seat ?? 0
    const action = (a: Extract<ClientMessage, { type: 'action' }>['action']) => send({ type: 'action', action: a })
    return {
      host(rules: Rules, speed: Speed) {
        begin({ type: 'create', id, name: nameRef.current, rules, speed })
      },
      join(code: string) {
        begin({ type: 'join', id, name: nameRef.current, code })
      },
      leave() {
        conn.current?.send({ type: 'leave' })
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
  }, [begin, send, drop, id])

  return { ...o, available: !!url, ...api }
}
