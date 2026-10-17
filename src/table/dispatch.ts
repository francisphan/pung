import type { ClientMessage } from '../net/protocol'
import type { Room } from './room'

/** What a member who is already at the table may ask of it. Create, join and leave are the transport's business. */
export type TableMessage = Exclude<ClientMessage, { type: 'create' | 'join' | 'leave' }>

export function dispatch(room: Room, id: string, msg: TableMessage): void {
  switch (msg.type) {
    case 'sit':
      return room.sit(id, msg.seat)
    case 'bot':
      return room.setBot(id, msg.seat, msg.on)
    case 'rules':
      return room.setRules(id, msg.rules)
    case 'start':
      return room.start(id)
    case 'action':
      return room.act(id, msg.action)
    case 'again':
      return room.again(id)
  }
}
