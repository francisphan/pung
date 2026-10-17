/**
 * Introductions between browsers. A broker registers a peer under an id and
 * opens data links to other peers by id; after that the data goes straight
 * between the two browsers over WebRTC. The real one is PeerJS with its
 * public signalling service; tests use an in-memory one.
 */

export interface DataLink {
  send(data: unknown): void
  close(): void
  onData(fn: (data: unknown) => void): void
  onClose(fn: () => void): void
}

export interface Broker {
  /** Register under `id`, or any free id when omitted. Resolves with the id. Rejects with Error('taken') or Error('network'). */
  open(id?: string): Promise<string>
  onConnection(fn: (link: DataLink) => void): void
  /** Open a data link to the peer registered as `id`. Rejects with Error('unavailable') when nobody has it. */
  connect(id: string): Promise<DataLink>
  /** Whether the signalling service can be reached; data links already open live on without it. */
  onStatus(fn: (up: boolean) => void): void
  reconnect(): void
  destroy(): void
}

export type BrokerFactory = () => Promise<Broker>

/** Peer ids on the signalling service, so a table code maps to one host. */
export function peerIdFor(code: string): string {
  return `pung-${code}`
}

const DEFAULT_ICE: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Open Relay (metered.ca), a free public TURN relay for the networks that will not connect directly.
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
]

/** ICE servers: VITE_PUNG_ICE (a JSON array) overrides the defaults. */
export function iceServers(): RTCIceServer[] {
  const raw = import.meta.env.VITE_PUNG_ICE as string | undefined
  if (!raw) return DEFAULT_ICE
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as RTCIceServer[]
  } catch {
    /* fall through */
  }
  return DEFAULT_ICE
}

export function webrtcSupported(): boolean {
  return typeof RTCPeerConnection !== 'undefined'
}

/** PeerJS, loaded only when a table is hosted or joined. */
export const peerBroker: BrokerFactory = async () => {
  const { Peer } = await import('peerjs')
  type P = InstanceType<typeof Peer>
  type DC = ReturnType<P['connect']>
  let peer: P | null = null
  const connectionHandlers: ((link: DataLink) => void)[] = []
  const statusHandlers: ((up: boolean) => void)[] = []

  const wrap = (c: DC): DataLink => ({
    send: (data) => {
      if (c.open) c.send(data)
    },
    close: () => c.close(),
    onData: (fn) => c.on('data', fn),
    onClose: (fn) => {
      let once = false
      const fire = () => {
        if (once) return
        once = true
        fn()
      }
      c.on('close', fire)
      c.on('error', fire)
    },
  })

  return {
    open(id) {
      return new Promise<string>((resolve, reject) => {
        const options = { debug: 0, config: { iceServers: iceServers() } }
        const p = id ? new Peer(id, options) : new Peer(options)
        peer = p
        let opened = false
        p.on('open', (assigned) => {
          if (!opened) {
            opened = true
            resolve(assigned)
          } else for (const h of statusHandlers) h(true)
        })
        p.on('error', (e) => {
          if (opened) return
          opened = true
          p.destroy()
          if (peer === p) peer = null
          reject(new Error(e.type === 'unavailable-id' ? 'taken' : 'network'))
        })
        p.on('connection', (c) => {
          c.on('open', () => {
            for (const h of connectionHandlers) h(wrap(c))
          })
        })
        p.on('disconnected', () => {
          for (const h of statusHandlers) h(false)
        })
      })
    },
    onConnection(fn) {
      connectionHandlers.push(fn)
    },
    connect(id) {
      return new Promise<DataLink>((resolve, reject) => {
        const p = peer
        if (!p || p.destroyed) return reject(new Error('network'))
        const c = p.connect(id, { reliable: true, serialization: 'json' })
        let settled = false
        const settle = (fn: () => void) => {
          if (settled) return
          settled = true
          p.off('error', onError)
          fn()
        }
        const onError = (e: { type?: string }) => {
          if (e?.type === 'peer-unavailable') settle(() => reject(new Error('unavailable')))
          else if (e?.type === 'disconnected' || e?.type === 'network' || e?.type === 'webrtc') settle(() => reject(new Error('network')))
        }
        p.on('error', onError)
        c.on('open', () => settle(() => resolve(wrap(c))))
        c.on('error', () => settle(() => reject(new Error('network'))))
        c.on('close', () => settle(() => reject(new Error('closed'))))
      })
    },
    onStatus(fn) {
      statusHandlers.push(fn)
    },
    reconnect() {
      if (peer && !peer.destroyed && peer.disconnected) peer.reconnect()
    },
    destroy() {
      peer?.destroy()
      peer = null
    },
  }
}
