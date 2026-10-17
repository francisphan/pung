import type { Broker, BrokerFactory, DataLink } from '../net/broker'

/** Deliver on the next microtask, like a very fast network. */
const soon = (fn: () => void) => queueMicrotask(fn)

interface End extends DataLink {
  closed: boolean
  dataFns: ((d: unknown) => void)[]
  closeFns: (() => void)[]
}

function pair(): [DataLink, DataLink] {
  const make = (): End => ({
    closed: false,
    dataFns: [],
    closeFns: [],
    send() {},
    close() {},
    onData(fn) {
      this.dataFns.push(fn)
    },
    onClose(fn) {
      this.closeFns.push(fn)
    },
  })
  const a = make()
  const b = make()
  const wire = (from: End, to: End) => {
    from.send = (d) => {
      if (from.closed) return
      const copy = structuredClone(d)
      // Anything sent before a close still arrives, as a reliable channel flushes before closing.
      soon(() => {
        for (const fn of to.dataFns) fn(copy)
      })
    }
    from.close = () => {
      if (from.closed) return
      from.closed = true
      to.closed = true
      soon(() => {
        for (const fn of from.closeFns) fn()
        for (const fn of to.closeFns) fn()
      })
    }
  }
  wire(a, b)
  wire(b, a)
  return [a, b]
}

/** An in-memory signalling service: every broker made from the factory can find every other. */
export function fakeNetwork() {
  const registry = new Map<string, ((link: DataLink) => void)[]>()
  let seq = 0
  const factory: BrokerFactory = async () => {
    let myId = ''
    const connectionHandlers: ((link: DataLink) => void)[] = []
    /** Every link this peer took part in; destroying the peer closes them, as PeerJS does. */
    const links: DataLink[] = []
    const broker: Broker = {
      async open(id) {
        myId = id ?? `anon-${++seq}`
        if (registry.has(myId)) throw new Error('taken')
        registry.set(myId, connectionHandlers)
        return myId
      },
      onConnection(fn) {
        connectionHandlers.push((link) => {
          links.push(link)
          fn(link)
        })
      },
      async connect(id) {
        const handlers = registry.get(id)
        if (!handlers) throw new Error('unavailable')
        const [mine, theirs] = pair()
        links.push(mine)
        soon(() => {
          for (const fn of handlers) fn(theirs)
        })
        return mine
      },
      onStatus() {},
      reconnect() {},
      destroy() {
        if (registry.get(myId) === connectionHandlers) registry.delete(myId)
        for (const link of links.splice(0)) link.close()
      },
    }
    return broker
  }
  return { factory, registry }
}

/** Let queued deliveries and timers run. */
export async function flush(rounds = 6): Promise<void> {
  for (let i = 0; i < rounds; i++) await new Promise<void>((r) => setTimeout(r, 0))
}
