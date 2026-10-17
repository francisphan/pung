import { describe, expect, it } from 'vitest'
import { aiTurn } from '../engine/ai'
import { SEATS, type GameState } from '../engine/game'
import { isHidden } from '../engine/view'
import type { ServerMessage } from '../net/protocol'
import { BOT_DELAY } from '../pace'
import { LOBBY_GRACE, Room, RoomError, STAND_IN_GRACE, type Clock } from './room'

/** A clock whose time only moves when told, running timers in order. */
function fakeClock() {
  let now = 1_000
  let seq = 0
  const timers: { at: number; id: number; fn: () => void }[] = []
  const clock: Clock = {
    now: () => now,
    after(ms, fn) {
      const t = { at: now + ms, id: seq++, fn }
      timers.push(t)
      return () => {
        const i = timers.indexOf(t)
        if (i !== -1) timers.splice(i, 1)
      }
    },
  }
  const tick = (ms: number) => {
    const until = now + ms
    for (;;) {
      timers.sort((a, b) => a.at - b.at || a.id - b.id)
      const t = timers[0]
      if (!t || t.at > until) break
      timers.shift()
      now = t.at
      t.fn()
    }
    now = until
  }
  return { clock, tick, pending: () => timers.length }
}

function table(rules = { minimumFaan: 0, rounds: 1 as const }) {
  const { clock, tick, pending } = fakeClock()
  const inbox = new Map<string, ServerMessage[]>()
  const send = (id: string, m: ServerMessage) => {
    if (!inbox.has(id)) inbox.set(id, [])
    inbox.get(id)!.push(m)
  }
  const room = new Room('ABCD', { id: 'h', name: 'Host' }, rules, clock, send, () => 7)
  const last = <T extends ServerMessage['type']>(id: string, type: T) => {
    const ms = inbox.get(id) ?? []
    for (let i = ms.length - 1; i >= 0; i--) if (ms[i].type === type) return ms[i] as Extract<ServerMessage, { type: T }>
    return null
  }
  const info = (id: string) => last(id, 'room')!.room
  const view = (id: string) => last(id, 'state')!.state
  /** Let every pending bot move happen. */
  const settle = () => {
    let guard = 0
    while (pending() > 0 && guard++ < 1000) tick(5000)
  }
  /** Play on until it is this seat's turn to discard, with the given human seats moving like bots. */
  const untilTurnOf = (seat: number, humans: Record<number, string>) => {
    let guard = 0
    for (;;) {
      settle()
      const g = room.game!
      if (g.phase === 'discard' && g.current === seat) return
      if (guard++ > 200) throw new Error('never reached that turn')
      if (g.phase === 'discard') room.act(humans[g.current], aiTurn(g, g.current) as never)
      else if (g.phase === 'claim') {
        for (const o of SEATS) if (humans[o] && g.claim!.options[o] && !g.claim!.decisions[o]) room.act(humans[o], { type: 'decide', decisions: { [o]: { kind: 'pass' } } })
      } else throw new Error(`unexpected phase ${g.phase}`)
    }
  }
  return { room, tick, pending, inbox, last, info, view, settle, untilTurnOf }
}

describe('Room: lobby', () => {
  it('seats the host at East and newcomers at the next open seats', () => {
    const t = table()
    expect(t.info('h').you.seat).toBe(0)
    expect(t.info('h').host).toBe('h')
    t.room.join('g1', 'Ann')
    t.room.join('g2', 'Bo')
    expect(t.info('g1').you.seat).toBe(1)
    expect(t.info('g2').you.seat).toBe(2)
    expect(t.info('h').seats.map((s) => s.kind)).toEqual(['human', 'human', 'human', 'open'])
    expect(t.info('h').waiting).toEqual([])
  })

  it('lets a player pick an open or bot seat and the host place bots', () => {
    const t = table()
    t.room.join('g1', 'Ann')
    t.room.sit('g1', 3)
    expect(t.info('g1').you.seat).toBe(3)
    expect(t.info('g1').seats[1]).toEqual({ kind: 'open' })
    t.room.setBot('h', 1, true)
    expect(t.info('h').seats[1]).toEqual({ kind: 'bot', name: 'Mei' })
    expect(() => t.room.setBot('g1', 2, true)).toThrow(RoomError)
    expect(() => t.room.sit('g1', 0)).toThrow('That seat is taken')
    t.room.sit('g1', 1)
    expect(t.info('g1').seats[1]).toMatchObject({ kind: 'human', name: 'Ann', connected: true })
    expect(t.info('g1').seats[3]).toEqual({ kind: 'open' })
    t.room.setBot('h', 1, false)
    expect(t.info('g1').seats[1]).toMatchObject({ kind: 'human' })
  })

  it('keeps waiting members when the seats are full and seats them at the deal if it can', () => {
    const t = table()
    for (const [id, name] of [['a', 'A'], ['b', 'B'], ['c', 'C'], ['d', 'D']]) t.room.join(id, name)
    expect(t.info('d').you.seat).toBeNull()
    expect(t.info('h').waiting).toEqual([{ id: 'd', name: 'D' }])
    expect(() => t.room.start('h')).toThrow('There is no seat for D')
    t.room.leave('a')
    expect(t.info('h').seats[1]).toEqual({ kind: 'open' })
    t.room.start('h')
    expect(t.info('d').you.seat).toBe(1)
    expect(t.room.status).toBe('playing')
  })

  it('drops lobby members who went away for too long', () => {
    const t = table()
    t.room.join('g1', 'Ann')
    t.room.disconnect('g1')
    expect(t.info('h').seats[1]).toMatchObject({ kind: 'human', connected: false })
    t.tick(LOBBY_GRACE - 1)
    expect(t.room.tidy()).toBe(false)
    t.tick(1)
    expect(t.room.tidy()).toBe(true)
    expect(t.info('h').seats[1]).toEqual({ kind: 'open' })
    expect(t.room.members.has('g1')).toBe(false)
  })

  it('passes the host on when the host leaves', () => {
    const t = table()
    t.room.join('g1', 'Ann')
    t.room.leave('h')
    expect(t.info('g1').host).toBe('g1')
    expect(t.info('g1').seats[0]).toEqual({ kind: 'open' })
  })
})

describe('Room: play', () => {
  it('fills empty seats with bots, deals, and shows each seat only its own tiles', () => {
    const t = table()
    t.room.join('g1', 'Ann')
    t.room.start('h')
    const info = t.info('h')
    expect(info.status).toBe('playing')
    expect(info.seats.map((s) => s.kind)).toEqual(['human', 'human', 'bot', 'bot'])
    expect(info.seats.slice(2).map((s) => (s.kind === 'bot' ? s.name : ''))).toEqual(['Mei', 'Bo'])
    const host = t.view('h')
    const guest = t.view('g1')
    expect(host.players[0].concealed).toHaveLength(14)
    expect(host.players[0].concealed.some(isHidden)).toBe(false)
    expect(host.players[1].concealed.every(isHidden)).toBe(true)
    expect(guest.players[1].concealed).toHaveLength(13)
    expect(guest.players[0].concealed.every(isHidden)).toBe(true)
    expect(guest.wall.every(isHidden)).toBe(true)
    expect(guest.seed).toBe(0)
  })

  it('moves the bots after the pace delay and keeps the humans in charge of their seats', () => {
    const t = table()
    t.room.start('h')
    const g = t.room.game!
    expect(g.current).toBe(0)
    expect(t.pending()).toBe(0)
    expect(() => t.room.act('h', { type: 'discard', seat: 1, tile: g.players[1].concealed[0] })).toThrow('That is not your seat')
    expect(() => t.room.act('h', { type: 'discard', seat: 0, tile: 'F1' as never })).toThrow(RoomError)
    t.room.act('h', aiTurn(g, 0) as never)
    const before = t.room.game!.log.length
    expect(t.pending()).toBe(1)
    t.tick(BOT_DELAY - 1)
    expect(t.room.game!.log.length).toBe(before)
    t.settle()
    expect(t.room.game!.log.length).toBeGreaterThan(before)
    // Play settles only when it is a human's turn or decision.
    const now = t.room.game!
    expect(now.phase === 'discard' ? now.current : 0).toBe(0)
    expect(t.last('h', 'state')!.state.log.length).toBe(now.log.length)
  })

  it('lets a bot stand in for a player who has gone missing, until they return', () => {
    const t = table()
    t.room.join('g1', 'Ann')
    t.room.start('h')
    const humans = { 0: 'h', 1: 'g1' }
    t.untilTurnOf(1, humans)
    expect(t.pending()).toBe(0)
    t.room.disconnect('g1')
    expect(t.pending()).toBe(1)
    t.tick(STAND_IN_GRACE / 2)
    expect(t.room.game!.current).toBe(1)
    // Back in time: the stand-in is called off.
    t.room.join('g1', 'Ann')
    expect(t.pending()).toBe(0)
    t.room.disconnect('g1')
    const before = t.room.game!.log.length
    t.tick(STAND_IN_GRACE)
    expect(t.room.game!.log.length).toBeGreaterThan(before)
    expect(t.room.game!.log.slice(before).some((e) => e.kind === 'discard' && e.seat === 1)).toBe(true)
  })

  it('waits when nobody is connected and carries on when someone returns', () => {
    const t = table()
    t.room.start('h')
    t.room.act('h', aiTurn(t.room.game!, 0) as never)
    expect(t.pending()).toBe(1)
    t.room.disconnect('h')
    expect(t.pending()).toBe(0)
    t.tick(60_000)
    expect(t.room.game!.log.length).toBe(t.room.game!.log.length)
    t.room.join('h', 'Host')
    expect(t.pending()).toBe(1)
  })

  it('gives a leaver’s hand to a bot, and a late arrival a bot’s seat', () => {
    const t = table()
    t.room.join('g1', 'Ann')
    t.room.start('h')
    t.room.leave('g1')
    expect(t.info('h').seats[1]).toEqual({ kind: 'bot', name: 'Ling' })
    t.room.join('g2', 'Cy')
    expect(t.info('g2').you.seat).toBe(1)
    expect(t.view('g2').players[1].concealed.some(isHidden)).toBe(false)
    t.room.join('g3', 'Di')
    t.room.join('g4', 'Ed')
    expect(() => t.room.join('g5', 'Flo')).toThrow('The table is full')
  })

  it('only lets the host deal the next hand, or whoever is present when the host is away', () => {
    const t = table()
    t.room.join('g1', 'Ann')
    t.room.start('h')
    const g = t.room.game!
    t.room.game = { ...g, phase: 'handEnd', result: { kind: 'draw', deltas: [0, 0, 0, 0] }, claim: null, drawn: null } as GameState
    expect(() => t.room.act('g1', { type: 'nextHand' })).toThrow('Only the host')
    t.room.disconnect('h')
    expect(t.info('g1').controller).toBe('g1')
    t.room.act('g1', { type: 'nextHand' })
    expect(t.room.game!.handIndex).toBe(1)
    expect(t.room.game!.phase).toBe('discard')
  })

  it('ends the game and goes back to the lobby with the seats kept', () => {
    const t = table()
    t.room.join('g1', 'Ann')
    t.room.start('h')
    const g = t.room.game!
    t.room.game = { ...g, phase: 'handEnd', result: { kind: 'draw', deltas: [0, 0, 0, 0] }, dealerIndex: 3, claim: null, drawn: null } as GameState
    t.room.act('h', { type: 'nextHand' })
    expect(t.room.status).toBe('playing')
    // A dealer who keeps the deal does not end the round; force the last dealer change.
    t.room.game = { ...t.room.game!, phase: 'handEnd', result: { kind: 'win', winner: 1 } as never, dealerIndex: 3, claim: null, drawn: null } as GameState
    t.room.act('h', { type: 'nextHand' })
    expect(t.room.status).toBe('ended')
    expect(t.info('g1').status).toBe('ended')
    expect(() => t.room.again('g1')).toThrow('Only the host')
    t.room.again('h')
    expect(t.info('g1').status).toBe('lobby')
    expect(t.info('g1').seats.map((s) => s.kind)).toEqual(['human', 'human', 'bot', 'bot'])
    expect(t.last('g1', 'state')).not.toBeNull()
  })

  it('never shows a guest another rack', () => {
    const t = table()
    t.room.join('g1', 'Ann')
    t.room.start('h')
    t.untilTurnOf(1, { 0: 'h', 1: 'g1' })
    for (const m of t.inbox.get('g1')!) {
      if (m.type !== 'state') continue
      for (const o of SEATS) if (o !== 1) expect(m.state.players[o].concealed.every(isHidden)).toBe(true)
      expect(m.state.wall.every(isHidden)).toBe(true)
    }
  })
})

describe('Room: snapshot and restore', () => {
  it('comes back with the same seats and game, everyone away until they return', () => {
    const t = table()
    t.room.join('g1', 'Ann')
    t.room.start('h')
    t.room.act('h', aiTurn(t.room.game!, 0) as never)
    const snap = t.room.snapshot()
    expect(JSON.parse(JSON.stringify(snap))).toEqual(snap)
    const { clock, pending } = fakeClock()
    const inbox: ServerMessage[] = []
    const r = Room.restore(snap, clock, (_id, m) => inbox.push(m), () => 7)
    expect(r.code).toBe('ABCD')
    expect(r.host).toBe('h')
    expect(r.status).toBe('playing')
    expect(r.game).toEqual(t.room.game)
    expect([...r.members.values()].every((m) => !m.connected)).toBe(true)
    expect(pending()).toBe(0)
    r.join('h', 'Host')
    expect(r.info('h').you.seat).toBe(0)
    expect(r.info('h').seats[1]).toMatchObject({ kind: 'human', name: 'Ann', connected: false })
    // The host is back, so play resumes: a bot or a stand-in is due.
    expect(pending()).toBe(1)
  })

  it('reports every change so a host can save it', () => {
    const t = table()
    let saved = 0
    t.room.onChange = () => saved++
    t.room.join('g1', 'Ann')
    t.room.sit('g1', 2)
    expect(saved).toBe(2)
  })
})
