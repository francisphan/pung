import type { Rules } from '../engine/game'
import { newCode } from '../table/codes'
import { dispatch } from '../table/dispatch'
import { Room, RoomError, realClock, type Clock, type RoomSnapshot } from '../table/room'
import { peerBroker, peerIdFor, type Broker, type BrokerFactory, type DataLink } from './broker'
import type { Handlers, Link } from './link'
import { parseClientMessage, type ClientMessage, type ServerMessage } from './protocol'

export interface HostOptions {
  me: { id: string; name: string }
  rules: Rules
  /** Reopen a table this browser was already running. */
  snapshot?: RoomSnapshot | null
  handlers: Handlers
  /** Called after every change with the table to keep, or null when it closes. */
  onSnapshot?: (snap: RoomSnapshot | null) => void
  factory?: BrokerFactory
  clock?: Clock
  codes?: () => string
  /** How many times to try registering (8 for a new table, 40 for a reopened one), and how long to wait between tries. */
  attempts?: number
  pause?: number
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * The host player's browser as the table. It runs the room (and so the game
 * and the bots), lets guests in over data links, and is at the same time the
 * host's own link to that room.
 */
export class Host implements Link {
  room: Room | null = null
  code: string
  private o: HostOptions
  private broker: Broker | null = null
  private ready = false
  private done = false
  private byLink = new Map<DataLink, string>()
  private byId = new Map<string, DataLink>()

  constructor(o: HostOptions) {
    this.o = o
    this.code = o.snapshot?.code ?? (o.codes ?? newCode)()
  }

  get isOpen(): boolean {
    return this.ready && !this.done
  }

  /** Register with the broker so friends can find the table, then open the room. */
  async start(): Promise<void> {
    const broker = await (this.o.factory ?? peerBroker)()
    this.broker = broker
    if (this.done) return broker.destroy()
    // A reopened table may have to wait for the broker to notice the old page has gone.
    const attempts = this.o.attempts ?? (this.o.snapshot ? 40 : 8)
    const pause = this.o.pause ?? 1500
    for (let i = 0; ; i++) {
      try {
        await broker.open(peerIdFor(this.code))
        break
      } catch (e) {
        if (this.done) return broker.destroy()
        if (i + 1 >= attempts) {
          broker.destroy()
          throw e
        }
        // A fresh table just takes another code; a reopened one waits for its old registration to lapse.
        if ((e as Error).message === 'taken' && !this.o.snapshot) this.code = (this.o.codes ?? newCode)()
        else await sleep(pause)
      }
    }
    if (this.done) return broker.destroy()
    broker.onConnection((link) => this.accept(link))
    broker.onStatus((up) => {
      if (this.done) return
      if (up) this.o.handlers.onOpen()
      else {
        this.o.handlers.onClose('lost')
        broker.reconnect()
      }
    })
    const clock = this.o.clock ?? realClock
    const send = (id: string, msg: ServerMessage) => {
      if (id === this.o.me.id) this.o.handlers.onMessage(msg)
      else this.byId.get(id)?.send(msg)
    }
    this.ready = true
    if (this.o.snapshot) {
      this.room = Room.restore(this.o.snapshot, clock, send)
      this.room.onChange = () => this.o.onSnapshot?.(this.room!.snapshot())
      this.room.join(this.o.me.id, this.o.me.name)
    } else {
      const room = new Room(this.code, null, this.o.rules, clock, send)
      room.onChange = () => this.o.onSnapshot?.(room.snapshot())
      this.room = room
      room.join(this.o.me.id, this.o.me.name)
    }
    this.o.handlers.onOpen()
  }

  /** The host's own messages go straight to the room. */
  send(msg: ClientMessage): boolean {
    if (!this.room || this.done) return false
    try {
      if (msg.type === 'leave') this.closeTable()
      else if (msg.type !== 'create' && msg.type !== 'join') dispatch(this.room, this.o.me.id, msg)
    } catch (e) {
      if (!(e instanceof RoomError)) throw e
      this.o.handlers.onMessage({ type: 'error', message: e.message })
    }
    return true
  }

  /** Stop being reachable. The room, if any, is left as it is. */
  close(): void {
    this.done = true
    this.ready = false
    this.room?.close()
    this.broker?.destroy()
    this.broker = null
  }

  /** End the table for everyone. */
  closeTable(): void {
    for (const link of this.byLink.keys()) {
      try {
        link.send({ type: 'error', fatal: true, message: 'The host closed the table.' } satisfies ServerMessage)
        link.close()
      } catch {
        /* already gone */
      }
    }
    this.byLink.clear()
    this.byId.clear()
    this.o.onSnapshot?.(null)
    this.close()
  }

  private accept(link: DataLink): void {
    if (this.done) return link.close()
    link.onData((raw) => this.handle(link, raw))
    link.onClose(() => this.gone(link))
  }

  private handle(link: DataLink, raw: unknown): void {
    const msg = parseClientMessage(raw)
    if (!msg) return link.send({ type: 'error', message: 'That message made no sense.' } satisfies ServerMessage)
    const room = this.room
    if (!room) return
    try {
      if (msg.type === 'join') {
        if (msg.code !== this.code) throw new RoomError('No table has that code.')
        if (msg.id === this.o.me.id) throw new RoomError('That is the host’s own seat.')
        const old = this.byId.get(msg.id)
        if (old && old !== link) {
          this.byLink.delete(old)
          old.send({ type: 'error', fatal: true, message: 'You opened this table in another window, so this one has left it.' } satisfies ServerMessage)
          old.close()
        }
        this.byLink.set(link, msg.id)
        this.byId.set(msg.id, link)
        try {
          room.join(msg.id, msg.name)
        } catch (e) {
          this.byLink.delete(link)
          if (this.byId.get(msg.id) === link) this.byId.delete(msg.id)
          throw e
        }
        return
      }
      const id = this.byLink.get(link)
      if (!id) throw new RoomError('You are not at this table.')
      if (msg.type === 'create') throw new RoomError('This table already exists.')
      if (msg.type === 'leave') {
        this.byLink.delete(link)
        this.byId.delete(id)
        room.leave(id)
        return
      }
      dispatch(room, id, msg)
    } catch (e) {
      if (!(e instanceof RoomError)) throw e
      link.send({ type: 'error', message: e.message, fatal: msg.type === 'join' } satisfies ServerMessage)
    }
  }

  private gone(link: DataLink): void {
    const id = this.byLink.get(link)
    this.byLink.delete(link)
    if (id === undefined || this.byId.get(id) !== link) return
    this.byId.delete(id)
    this.room?.disconnect(id)
  }
}
