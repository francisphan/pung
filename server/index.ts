/**
 * The table server: a WebSocket endpoint that keeps the rooms. Run with
 * `npm run server` after `npm run server:build`, or `npm run server:dev`.
 *
 *   PORT          port to listen on (default 8787)
 *   PUNG_ORIGINS  comma-separated page origins allowed to connect (default: any)
 */
import { createServer } from 'node:http'
import { WebSocketServer, type WebSocket } from 'ws'
import { CODE_ALPHABET, CODE_LENGTH, parseClientMessage, type ClientMessage, type ServerMessage } from '../src/net/protocol'
import { Room, RoomError, type Clock } from './room'

const PORT = Number(process.env.PORT ?? 8787)
const ORIGINS = (process.env.PUNG_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const MAX_ROOMS = 500
/** A room with nobody connected is dropped after this long. */
const ROOM_IDLE = 15 * 60_000
const SWEEP_EVERY = 15_000
const PING_EVERY = 30_000

const clock: Clock = {
  now: () => Date.now(),
  after: (ms, fn) => {
    const t = setTimeout(fn, ms)
    return () => clearTimeout(t)
  },
}

const rooms = new Map<string, Room>()
/** The live socket of each member, per room. */
const sockets = new Map<string, Map<string, WebSocket>>()

function log(...parts: unknown[]) {
  console.log(new Date().toISOString(), ...parts)
}

function newCode(): string {
  for (;;) {
    let code = ''
    for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
    if (!rooms.has(code)) return code
  }
}

function deliver(code: string) {
  return (id: string, msg: ServerMessage) => {
    const ws = sockets.get(code)?.get(id)
    if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg))
  }
}

function dropRoom(code: string, reason: string) {
  const room = rooms.get(code)
  if (!room) return
  room.close()
  rooms.delete(code)
  for (const ws of sockets.get(code)?.values() ?? []) {
    ws.send(JSON.stringify({ type: 'error', message: reason, fatal: true } satisfies ServerMessage))
    ws.close(4001, 'room closed')
  }
  sockets.delete(code)
  log(`room ${code} dropped: ${reason}`)
}

const http = createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }))
    return
  }
  res.writeHead(200, { 'content-type': 'text/plain' })
  res.end('Pung table server. Connect over WebSocket.\n')
})

const wss = new WebSocketServer({ server: http, maxPayload: 16 * 1024 })

interface Session {
  code: string
  id: string
}

wss.on('connection', (ws, req) => {
  const origin = req.headers.origin ?? ''
  if (ORIGINS.length && !ORIGINS.includes(origin)) {
    ws.close(1008, 'origin not allowed')
    return
  }
  let session: Session | null = null
  let alive = true
  ws.on('pong', () => {
    alive = true
  })
  const reply = (msg: ServerMessage) => ws.send(JSON.stringify(msg))

  /** Bind this socket to a member of a room, bumping any older socket of theirs. */
  const attach = (code: string, id: string) => {
    let socks = sockets.get(code)
    if (!socks) {
      socks = new Map()
      sockets.set(code, socks)
    }
    const old = socks.get(id)
    if (old && old !== ws) old.close(4000, 'joined elsewhere')
    socks.set(id, ws)
    session = { code, id }
  }

  /** Unbind this socket. `gone` means the member left on purpose. */
  const detach = (gone: boolean) => {
    if (!session) return
    const { code, id } = session
    session = null
    const socks = sockets.get(code)
    // Another socket of theirs took over; nothing to do.
    if (socks?.get(id) !== ws) return
    socks.delete(id)
    const room = rooms.get(code)
    if (!room) return
    if (gone) room.leave(id)
    else room.disconnect(id)
    if (room.members.size === 0) dropRoom(code, 'everyone left')
  }

  ws.on('message', (data) => {
    let msg: ClientMessage | null
    try {
      msg = parseClientMessage(JSON.parse(String(data)))
    } catch {
      msg = null
    }
    if (!msg) return reply({ type: 'error', message: 'That message made no sense.' })
    try {
      switch (msg.type) {
        case 'create': {
          detach(true)
          if (rooms.size >= MAX_ROOMS) throw new RoomError('The server has no room for another table right now.')
          const code = newCode()
          attach(code, msg.id)
          const room = new Room(code, { id: msg.id, name: msg.name }, msg.rules, msg.speed, clock, deliver(code))
          rooms.set(code, room)
          log(`room ${code} created by ${msg.name}`)
          return
        }
        case 'join': {
          if (session && session.code !== msg.code) detach(true)
          const room = rooms.get(msg.code)
          if (!room) throw new RoomError('No table has that code.')
          attach(msg.code, msg.id)
          try {
            room.join(msg.id, msg.name)
          } catch (e) {
            sockets.get(msg.code)?.delete(msg.id)
            session = null
            throw e
          }
          return
        }
        case 'leave':
          detach(true)
          return
      }
      if (!session) throw new RoomError('You are not at a table.')
      const room = rooms.get(session.code)
      if (!room) throw new RoomError('That table is gone.')
      const id = session.id
      switch (msg.type) {
        case 'sit':
          return room.sit(id, msg.seat)
        case 'bot':
          return room.setBot(id, msg.seat, msg.on)
        case 'rules':
          return room.setRules(id, msg.rules)
        case 'speed':
          return room.setSpeed(id, msg.speed)
        case 'start':
          return room.start(id)
        case 'action':
          return room.act(id, msg.action)
        case 'again':
          return room.again(id)
      }
    } catch (e) {
      if (e instanceof RoomError) {
        const fatal = msg.type === 'join' || msg.type === 'create'
        reply({ type: 'error', message: e.message, fatal })
      } else {
        log('error', e)
        reply({ type: 'error', message: 'Something went wrong at the table.' })
      }
    }
  })

  ws.on('close', () => detach(false))
  ws.on('error', () => detach(false))

  const ping = setInterval(() => {
    if (ws.readyState !== ws.OPEN) return clearInterval(ping)
    if (!alive) return ws.terminate()
    alive = false
    ws.ping()
  }, PING_EVERY)
  ws.once('close', () => clearInterval(ping))
})

setInterval(() => {
  const now = Date.now()
  for (const [code, room] of rooms) {
    room.tidy()
    if (room.members.size === 0) dropRoom(code, 'everyone left')
    else {
      const idle = room.idleSince()
      if (idle !== null && now - idle >= ROOM_IDLE) dropRoom(code, 'nobody came back')
    }
  }
}, SWEEP_EVERY).unref()

http.listen(PORT, () => log(`pung table server listening on :${PORT}`))
