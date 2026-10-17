import type { ClientMessage, ServerMessage } from './protocol'

/** What a seat's React state needs from whatever carries its messages. */
export interface Handlers {
  onOpen(): void
  onMessage(msg: ServerMessage): void
  /** The carrier dropped. `elsewhere` means the same player opened the table in another window; do not retry. */
  onClose(why: 'lost' | 'elsewhere'): void
}

/**
 * A way to the table: a WebSocket to the table server, a WebRTC link to the
 * host's browser, or, for the host, the table running right here.
 */
export interface Link {
  readonly isOpen: boolean
  send(msg: ClientMessage): boolean
  close(): void
}
