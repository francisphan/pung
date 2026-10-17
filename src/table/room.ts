/**
 * One table. Holds the members, who sits where, and the game itself, and
 * drives the bots. Pure apart from the clock and the outbox it is given, so
 * it can be tested with fake timers and run by any host: the table server
 * in Node, or the host player's own browser.
 */
import { aiClaim, aiTurn } from '../engine/ai'
import { IllegalAction, SEATS, newGame, reduce, type Action, type Decision, type GameState, type Rules, type Seat } from '../engine/game'
import { randomSeed } from '../engine/rng'
import { viewFor } from '../engine/view'
import { BOT_NAMES } from '../names'
import type { RoomInfo, RoomStatus, SeatInfo, ServerMessage, TableAction } from '../net/protocol'
import { BOT_DELAY } from '../pace'

export interface Clock {
  now(): number
  /** Run fn after ms. Returns a function that cancels it. */
  after(ms: number, fn: () => void): () => void
}

/** Wall-clock time and real timers, for Node and the browser alike. */
export const realClock: Clock = {
  now: () => Date.now(),
  after: (ms, fn) => {
    const t = setTimeout(fn, ms)
    return () => clearTimeout(t)
  },
}

/** Everything a table needs to be put back as it was. */
export interface RoomSnapshot {
  code: string
  host: string
  rules: Rules
  status: RoomStatus
  seats: Slot[]
  members: Member[]
  game: GameState | null
}

/** Something a member asked for that the table refuses. The message is shown to them. */
export class RoomError extends Error {}

export interface Member {
  id: string
  name: string
  seat: Seat | null
  connected: boolean
  /** When they were last seen connected. */
  lastSeen: number
}

export type Slot = { kind: 'open' } | { kind: 'bot'; name: string } | { kind: 'human'; id: string }

/** How long a missing player gets before a bot moves for them. */
export const STAND_IN_GRACE = 20_000
/** A player who drops out of the lobby loses their seat after this long. */
export const LOBBY_GRACE = 60_000

export class Room {
  status: RoomStatus = 'lobby'
  host: string
  rules: Rules
  seats: Slot[] = [{ kind: 'open' }, { kind: 'open' }, { kind: 'open' }, { kind: 'open' }]
  members = new Map<string, Member>()
  game: GameState | null = null
  readonly code: string
  /** Called after every change has been sent out; the browser host saves a snapshot here. */
  onChange: (() => void) | null = null
  private pending: (() => void) | null = null
  private clock: Clock
  private send: (id: string, msg: ServerMessage) => void
  private seed: () => number

  /** A new table. With a host, they take the first seat at once; with none, see `restore`. */
  constructor(
    code: string,
    host: { id: string; name: string } | null,
    rules: Rules,
    clock: Clock,
    send: (id: string, msg: ServerMessage) => void,
    seed: () => number = randomSeed,
  ) {
    this.code = code
    this.clock = clock
    this.send = send
    this.seed = seed
    this.host = host?.id ?? ''
    this.rules = rules
    if (host) this.join(host.id, host.name)
  }

  /** The table as it was, with everyone marked away until they come back. */
  static restore(snap: RoomSnapshot, clock: Clock, send: (id: string, msg: ServerMessage) => void, seed: () => number = randomSeed): Room {
    const r = new Room(snap.code, null, snap.rules, clock, send, seed)
    r.host = snap.host
    r.status = snap.status
    r.seats = structuredClone(snap.seats)
    r.game = structuredClone(snap.game)
    const now = clock.now()
    for (const m of snap.members) r.members.set(m.id, { ...m, connected: false, lastSeen: now })
    return r
  }

  snapshot(): RoomSnapshot {
    return structuredClone({
      code: this.code,
      host: this.host,
      rules: this.rules,
      status: this.status,
      seats: this.seats,
      members: [...this.members.values()],
      game: this.game,
    })
  }

  // Membership

  /** A member arrives, or comes back. New arrivals get a seat when there is one. */
  join(id: string, name: string): void {
    const now = this.clock.now()
    let m = this.members.get(id)
    if (m) {
      m.connected = true
      m.lastSeen = now
      m.name = name
    } else {
      const seat = this.status === 'lobby' ? (this.freeSeat('open') ?? this.freeSeat('bot')) : this.freeSeat('bot')
      if (this.status !== 'lobby' && seat === null) throw new RoomError('The table is full')
      m = { id, name, seat: null, connected: true, lastSeen: now }
      this.members.set(id, m)
      if (seat !== null) this.seatMember(m, seat)
      if (!this.members.has(this.host)) this.host = id
    }
    this.sync()
  }

  /** The connection dropped; the member keeps their seat and may come back. */
  disconnect(id: string): void {
    const m = this.members.get(id)
    if (!m) return
    m.connected = false
    m.lastSeen = this.clock.now()
    this.sync()
  }

  /** The member leaves for good. During a game a bot takes over their hand. */
  leave(id: string): void {
    const m = this.members.get(id)
    if (!m) return
    this.members.delete(id)
    if (m.seat !== null) this.seats[m.seat] = this.status === 'playing' ? { kind: 'bot', name: this.botName() } : { kind: 'open' }
    if (this.host === id) this.host = this.nextHost() ?? ''
    this.sync()
  }

  /** Drop lobby members who have been gone too long. Returns whether anything changed. */
  tidy(): boolean {
    if (this.status !== 'lobby') return false
    const now = this.clock.now()
    const gone = [...this.members.values()].filter((m) => !m.connected && now - m.lastSeen >= LOBBY_GRACE)
    for (const m of gone) this.leave(m.id)
    return gone.length > 0
  }

  /** When the last member went away, or null while anyone is connected. */
  idleSince(): number | null {
    let latest = -Infinity
    for (const m of this.members.values()) {
      if (m.connected) return null
      latest = Math.max(latest, m.lastSeen)
    }
    return latest === -Infinity ? 0 : latest
  }

  // Lobby

  sit(id: string, seat: Seat): void {
    this.requireLobby()
    const m = this.member(id)
    const slot = this.seats[seat]
    if (slot.kind === 'human') {
      if (slot.id === id) return
      throw new RoomError('That seat is taken')
    }
    this.seatMember(m, seat)
    this.sync()
  }

  setBot(id: string, seat: Seat, on: boolean): void {
    this.requireHost(id)
    this.requireLobby()
    const slot = this.seats[seat]
    if (on) {
      if (slot.kind === 'human') throw new RoomError('That seat is taken')
      if (slot.kind === 'open') this.seats[seat] = { kind: 'bot', name: this.botName() }
    } else if (slot.kind === 'bot') this.seats[seat] = { kind: 'open' }
    this.sync()
  }

  setRules(id: string, rules: Rules): void {
    this.requireHost(id)
    this.requireLobby()
    this.rules = rules
    this.sync()
  }

  /** Deal the first hand. Members still waiting get seats first; empty seats get bots. */
  start(id: string): void {
    this.requireHost(id)
    this.requireLobby()
    for (const m of this.members.values()) {
      if (m.seat !== null) continue
      const seat = this.freeSeat('open') ?? this.freeSeat('bot')
      if (seat === null) throw new RoomError(`There is no seat for ${m.name}`)
      this.seatMember(m, seat)
    }
    for (const seat of SEATS) if (this.seats[seat].kind === 'open') this.seats[seat] = { kind: 'bot', name: this.botName() }
    this.game = newGame(this.rules, this.seed())
    this.status = 'playing'
    this.sync()
  }

  /** Back to the lobby, keeping the seats. Ends a game in progress. */
  again(id: string): void {
    this.requireHost(id)
    if (this.status === 'lobby') return
    this.game = null
    this.status = 'lobby'
    this.sync()
  }

  // Play

  act(id: string, action: TableAction): void {
    if (this.status !== 'playing' || !this.game) throw new RoomError('No hand is being played')
    const m = this.member(id)
    const seat = m.seat
    if (seat === null) throw new RoomError('You are not seated')
    if (action.type === 'nextHand') {
      if (this.controller() !== id) throw new RoomError('Only the host deals the next hand')
    } else if (action.type === 'decide') {
      for (const k of Object.keys(action.decisions)) if (Number(k) !== seat) throw new RoomError('You can only decide for yourself')
    } else if (action.seat !== seat) throw new RoomError('That is not your seat')
    this.apply(action)
    this.sync()
  }

  /** Who may deal the next hand: the host, or the first present player while the host is away. */
  controller(): string | null {
    const h = this.members.get(this.host)
    if (h?.connected && h.seat !== null) return h.id
    for (const m of this.members.values()) if (m.connected && m.seat !== null) return m.id
    return null
  }

  info(forId: string): RoomInfo {
    const you = this.members.get(forId)
    return {
      code: this.code,
      status: this.status,
      host: this.host,
      rules: this.rules,
      seats: this.seats.map((slot): SeatInfo => {
        if (slot.kind !== 'human') return slot
        const m = this.members.get(slot.id)
        return { kind: 'human', id: slot.id, name: m?.name ?? '?', connected: m?.connected ?? false }
      }),
      waiting: [...this.members.values()].filter((m) => m.seat === null).map((m) => ({ id: m.id, name: m.name })),
      you: { id: forId, seat: you?.seat ?? null },
      controller: this.controller(),
    }
  }

  /** Tell everyone present what the table looks like now, then let the bots move. */
  sync(): void {
    for (const m of this.members.values()) {
      if (!m.connected) continue
      this.send(m.id, { type: 'room', room: this.info(m.id) })
      if (this.game && m.seat !== null) this.send(m.id, { type: 'state', state: viewFor(this.game, m.seat) })
    }
    this.schedule()
    this.onChange?.()
  }

  /** Stop any pending bot move; call when the room is dropped. */
  close(): void {
    this.pending?.()
    this.pending = null
  }

  // Internals

  private member(id: string): Member {
    const m = this.members.get(id)
    if (!m) throw new RoomError('You are not at this table')
    return m
  }

  private requireHost(id: string): void {
    if (id !== this.host) throw new RoomError('Only the host can do that')
  }

  private requireLobby(): void {
    if (this.status !== 'lobby') throw new RoomError('The game has already started')
  }

  private freeSeat(kind: 'open' | 'bot'): Seat | null {
    for (const seat of SEATS) if (this.seats[seat].kind === kind) return seat
    return null
  }

  private seatMember(m: Member, seat: Seat): void {
    if (m.seat !== null) this.seats[m.seat] = { kind: 'open' }
    this.seats[seat] = { kind: 'human', id: m.id }
    m.seat = seat
  }

  private nextHost(): string | null {
    for (const m of this.members.values()) if (m.connected) return m.id
    for (const m of this.members.values()) return m.id
    return null
  }

  /** The first opponent's name nobody at the table is using. */
  private botName(): string {
    const taken = new Set<string>()
    for (const slot of this.seats) if (slot.kind === 'bot') taken.add(slot.name.toLowerCase())
    for (const m of this.members.values()) taken.add(m.name.toLowerCase())
    for (const name of BOT_NAMES) if (!taken.has(name.toLowerCase())) return name
    for (let i = 4; ; i++) if (!taken.has(`bot ${i}`)) return `Bot ${i}`
  }

  private apply(action: Action): void {
    try {
      this.game = reduce(this.game!, action)
    } catch (e) {
      if (e instanceof IllegalAction) throw new RoomError(e.message)
      throw e
    }
    if (this.game.phase === 'gameEnd') this.status = 'ended'
  }

  private present(seat: Seat): boolean {
    const slot = this.seats[seat]
    return slot.kind === 'human' && !!this.members.get(slot.id)?.connected
  }

  private anyonePresent(): boolean {
    for (const m of this.members.values()) if (m.connected && m.seat !== null) return true
    return false
  }

  /** How much of a missing player's grace is left. */
  private graceLeft(seat: Seat): number {
    const slot = this.seats[seat]
    if (slot.kind !== 'human') return 0
    const m = this.members.get(slot.id)
    return m ? Math.max(0, STAND_IN_GRACE - (this.clock.now() - m.lastSeen)) : 0
  }

  /**
   * Arrange the next automatic move, if one is due: a bot's turn or claim,
   * or a stand-in for a player who has gone missing. With nobody present
   * the table simply waits.
   */
  private schedule(): void {
    this.pending?.()
    this.pending = null
    if (this.status !== 'playing' || !this.game || !this.anyonePresent()) return
    const s = this.game
    const delay = BOT_DELAY
    const later = (ms: number, fn: () => void) => {
      this.pending = this.clock.after(ms, () => {
        this.pending = null
        fn()
        this.sync()
      })
    }
    if (s.phase === 'discard') {
      const seat = s.current
      const slot = this.seats[seat]
      if (slot.kind === 'bot') later(delay, () => this.apply(aiTurn(this.game!, seat)))
      else if (slot.kind === 'human' && !this.present(seat)) later(this.graceLeft(seat), () => this.apply(aiTurn(this.game!, seat)))
      return
    }
    if (s.phase === 'claim' && s.claim) {
      const w = s.claim
      const owing = SEATS.filter((o) => w.options[o] && !w.decisions[o])
      const bots = owing.filter((o) => this.seats[o].kind === 'bot')
      const away = owing.filter((o) => this.seats[o].kind === 'human' && !this.present(o))
      const decideFor = (seats: Seat[]) => {
        const g = this.game!
        if (!g.claim) return
        const decisions: Partial<Record<Seat, Decision>> = {}
        for (const o of seats) {
          const opts = g.claim.options[o]
          if (opts && !g.claim.decisions[o]) decisions[o] = aiClaim(g, o, opts)
        }
        if (Object.keys(decisions).length) this.apply({ type: 'decide', decisions })
      }
      if (bots.length) {
        // Decide at once when a person must still answer; otherwise pause so the discard can be seen.
        const someoneThinking = owing.some((o) => this.present(o))
        later(someoneThinking ? 0 : delay * 0.9, () => decideFor(bots))
      } else if (away.length) {
        later(Math.max(...away.map((o) => this.graceLeft(o))), () => decideFor(away))
      }
    }
  }
}
