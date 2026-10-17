import type { Handlers, Link } from './link'
import type { ClientMessage, ServerMessage } from './protocol'

/**
 * A WebSocket to the table server that comes back by itself: after a drop
 * it retries with growing pauses, and at once when the page returns to the
 * foreground, which is what happens when an iPad wakes up.
 */
export class Connection implements Link {
  private ws: WebSocket | null = null
  private attempts = 0
  private timer: ReturnType<typeof setTimeout> | null = null
  private done = false
  private url: string
  private h: Handlers

  constructor(url: string, h: Handlers) {
    this.url = url
    this.h = h
    this.open()
    document.addEventListener('visibilitychange', this.onVisible)
  }

  get isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  send(msg: ClientMessage): boolean {
    if (!this.isOpen) return false
    this.ws!.send(JSON.stringify(msg))
    return true
  }

  close(): void {
    this.done = true
    document.removeEventListener('visibilitychange', this.onVisible)
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    const ws = this.ws
    this.ws = null
    if (ws) {
      ws.onclose = null
      ws.close()
    }
  }

  private onVisible = () => {
    if (document.visibilityState === 'visible' && !this.done && !this.isOpen && !this.ws) this.retry(0)
  }

  private retry(ms: number) {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = null
      this.open()
    }, ms)
  }

  private open() {
    if (this.done || this.ws) return
    let ws: WebSocket
    try {
      ws = new WebSocket(this.url)
    } catch {
      this.ws = null
      this.retry(Math.min(8000, 500 * 2 ** this.attempts++))
      return
    }
    this.ws = ws
    ws.onopen = () => {
      this.attempts = 0
      this.h.onOpen()
    }
    ws.onmessage = (e) => {
      let msg: unknown
      try {
        msg = JSON.parse(String(e.data))
      } catch {
        return
      }
      if (msg && typeof msg === 'object' && 'type' in msg) this.h.onMessage(msg as ServerMessage)
    }
    ws.onclose = (e) => {
      if (this.ws !== ws) return
      this.ws = null
      if (this.done) return
      if (e.code === 4000) {
        this.done = true
        this.h.onClose('elsewhere')
        return
      }
      this.h.onClose('lost')
      if (e.code !== 4001) this.retry(Math.min(8000, 500 * 2 ** this.attempts++))
    }
    ws.onerror = () => {
      /* onclose follows */
    }
  }
}
