import { describe, expect, it } from 'vitest'
import { isHidden } from '../engine/view'
import type { Clock, RoomSnapshot } from '../table/room'
import { fakeNetwork, flush } from '../test/fakeBroker'
import { Host } from './host'
import type { Handlers } from './link'
import { PeerLink } from './peerLink'
import type { ServerMessage } from './protocol'

/** Time that never moves, so the bots stay put. */
function stillClock(): Clock {
  return { now: () => 1_000, after: () => () => {} }
}

function box() {
  const msgs: ServerMessage[] = []
  let closes = 0
  const last = <T extends ServerMessage['type']>(type: T) => {
    for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].type === type) return msgs[i] as Extract<ServerMessage, { type: T }>
    return null
  }
  const handlers: Handlers = {
    onOpen() {},
    onMessage: (m) => {
      msgs.push(m)
    },
    onClose: () => {
      closes++
    },
  }
  return {
    msgs,
    handlers,
    last,
    closes: () => closes,
    room: () => last('room')?.room ?? null,
    state: () => last('state')?.state ?? null,
  }
}

const RULES = { minimumFaan: 0, rounds: 1 as const }

describe('a table in the host’s browser', () => {
  it('lets guests in, shows each only their own tiles, survives a reload, and closes for everyone', async () => {
    const net = fakeNetwork()
    let snap: RoomSnapshot | null = null
    const hostBox = box()
    const host = new Host({
      me: { id: 'h', name: 'Host' },
      rules: RULES,
      factory: net.factory,
      clock: stillClock(),
      codes: () => 'ABCD',
      handlers: hostBox.handlers,
      onSnapshot: (s) => {
        snap = s
      },
    })
    await host.start()
    expect(host.code).toBe('ABCD')
    expect(net.registry.has('pung-ABCD')).toBe(true)
    expect(hostBox.room()!.you.seat).toBe(0)
    expect(hostBox.room()!.host).toBe('h')

    const guestBox = box()
    const guest = new PeerLink(
      'ABCD',
      { ...guestBox.handlers, onOpen: () => guest.send({ type: 'join', id: 'g', name: 'Ann', code: 'ABCD' }) },
      net.factory,
      0,
    )
    await flush()
    expect(guestBox.room()!.you.seat).toBe(1)
    expect(hostBox.room()!.seats[1]).toMatchObject({ kind: 'human', name: 'Ann', connected: true })

    guest.send({ type: 'sit', seat: 3 })
    await flush()
    expect(guestBox.room()!.you.seat).toBe(3)
    expect(hostBox.room()!.seats[1]).toEqual({ kind: 'open' })

    guest.send({ type: 'start' })
    await flush()
    expect(guestBox.last('error')!.message).toMatch(/host/)
    expect(hostBox.room()!.status).toBe('lobby')

    host.send({ type: 'start' })
    await flush()
    const v = guestBox.state()!
    expect(v.players[3].concealed).toHaveLength(13)
    expect(v.players[3].concealed.some(isHidden)).toBe(false)
    expect(v.players[0].concealed.every(isHidden)).toBe(true)
    expect(v.wall.every(isHidden)).toBe(true)
    expect(hostBox.state()!.players[0].concealed).toHaveLength(14)
    expect(hostBox.room()!.seats.map((s) => s.kind)).toEqual(['human', 'bot', 'bot', 'human'])
    expect(snap!.status).toBe('playing')

    // A code nobody is hosting.
    const strayBox = box()
    const stray = new PeerLink('ZZZZ', strayBox.handlers, net.factory, 0)
    await flush()
    expect(strayBox.last('error')).toMatchObject({ fatal: true, message: 'No table has that code.' })
    stray.close()

    // The guest drops out and comes back to the same seat.
    guest.close()
    await flush()
    expect(hostBox.room()!.seats[3]).toMatchObject({ kind: 'human', connected: false })
    const backBox = box()
    const back = new PeerLink(
      'ABCD',
      { ...backBox.handlers, onOpen: () => back.send({ type: 'join', id: 'g', name: 'Ann', code: 'ABCD' }) },
      net.factory,
      0,
    )
    await flush()
    expect(backBox.room()!.you.seat).toBe(3)
    expect(backBox.state()!.players[3].concealed).toHaveLength(13)
    expect(hostBox.room()!.seats[3]).toMatchObject({ kind: 'human', connected: true })

    // The host's page reloads: the table comes back from its snapshot and the guest finds it again.
    host.close()
    await flush()
    expect(net.registry.has('pung-ABCD')).toBe(false)
    expect(backBox.closes()).toBeGreaterThan(0)
    const host2Box = box()
    const host2 = new Host({
      me: { id: 'h', name: 'Host' },
      rules: RULES,
      snapshot: snap,
      factory: net.factory,
      clock: stillClock(),
      handlers: host2Box.handlers,
      onSnapshot: (s) => {
        snap = s
      },
    })
    await host2.start()
    expect(host2.code).toBe('ABCD')
    expect(host2Box.room()!.status).toBe('playing')
    expect(host2Box.state()!.players[0].concealed).toHaveLength(14)
    await flush()
    expect(host2Box.room()!.seats[3]).toMatchObject({ kind: 'human', name: 'Ann', connected: true })
    expect(backBox.room()!.you.seat).toBe(3)
    expect(backBox.state()!.players[3].concealed).toHaveLength(13)

    // The host closes the table: the guest is told and the snapshot is gone.
    host2.send({ type: 'leave' })
    await flush()
    expect(backBox.last('error')).toMatchObject({ fatal: true, message: 'The host closed the table.' })
    expect(snap).toBeNull()
    expect(net.registry.has('pung-ABCD')).toBe(false)
    back.close()
  })

  it('takes another code when the first is already in use', async () => {
    const net = fakeNetwork()
    const other = await net.factory()
    await other.open('pung-AAAA')
    const codes = ['AAAA', 'BBBB']
    let i = 0
    const b = box()
    const host = new Host({
      me: { id: 'h', name: 'Host' },
      rules: RULES,
      factory: net.factory,
      clock: stillClock(),
      codes: () => codes[i++],
      pause: 0,
      handlers: b.handlers,
    })
    await host.start()
    expect(host.code).toBe('BBBB')
    expect(b.room()!.code).toBe('BBBB')
    host.close()
    other.destroy()
  })
})
