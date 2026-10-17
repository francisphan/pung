import { peerBroker, peerIdFor, type Broker, type BrokerFactory, type DataLink } from './broker'
import type { Handlers, Link } from './link'
import type { ClientMessage, ServerMessage } from './protocol'

/**
 * A guest's link to the host's browser. Finds the host through the broker,
 * then talks to it directly. When the link drops (the host reloaded, the
 * network changed) it keeps trying to get back, and tries at once when the
 * page returns to the foreground.
 */
export class PeerLink implements Link {
  private code: string
  private h: Handlers
  private factory: BrokerFactory
  private pause: number
  private broker: Broker | null = null
  private link: DataLink | null = null
  private done = false
  private busy = false
  private ever = false
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(code: string, h: Handlers, factory: BrokerFactory = peerBroker, pause = 3000) {
    this.code = code
    this.h = h
    this.factory = factory
    this.pause = pause
    void this.run()
    document.addEventListener('visibilitychange', this.onVisible)
  }

  get isOpen(): boolean {
    return this.link !== null
  }

  send(msg: ClientMessage): boolean {
    if (!this.link) return false
    this.link.send(msg)
    return true
  }

  close(): void {
    this.done = true
    document.removeEventListener('visibilitychange', this.onVisible)
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    const link = this.link
    this.link = null
    link?.close()
    this.broker?.destroy()
    this.broker = null
  }

  private onVisible = () => {
    if (document.visibilityState === 'visible' && !this.done && !this.link && !this.busy) {
      if (this.timer) clearTimeout(this.timer)
      this.timer = null
      void this.run()
    }
  }

  private later(ms: number) {
    if (this.done) return
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = null
      void this.run()
    }, ms)
  }

  private async run(): Promise<void> {
    if (this.done || this.busy || this.link) return
    this.busy = true
    try {
      if (!this.broker) {
        const broker = await this.factory()
        try {
          await broker.open()
        } catch {
          broker.destroy()
          return this.later(this.pause)
        }
        if (this.done) return broker.destroy()
        this.broker = broker
        broker.onStatus((up) => {
          if (!up && !this.done) broker.reconnect()
        })
      }
      let link: DataLink
      try {
        link = await this.broker.connect(peerIdFor(this.code))
      } catch (e) {
        if (this.done) return
        if ((e as Error).message === 'unavailable' && !this.ever) {
          this.h.onMessage({ type: 'error', fatal: true, message: 'No table has that code.' })
          this.close()
          return
        }
        return this.later(this.pause)
      }
      if (this.done) return link.close()
      this.link = link
      this.ever = true
      link.onData((data) => {
        if (this.link !== link) return
        if (data && typeof data === 'object' && 'type' in data) this.h.onMessage(data as ServerMessage)
      })
      link.onClose(() => {
        if (this.link !== link) return
        this.link = null
        if (this.done) return
        this.h.onClose('lost')
        this.later(this.pause)
      })
      this.h.onOpen()
    } finally {
      this.busy = false
    }
  }
}
