import type { LogEntry } from './engine/game'
import { tileName } from './engine/tiles'
import { SOLO, conjugate, nameOf, possessive, type Seating } from './names'

/** One plain sentence for a log entry. */
export function narrate(e: LogEntry | undefined, seating: Seating = SOLO): string {
  if (!e) return ''
  switch (e.kind) {
    case 'deal':
      return `New hand. ${nameOf(seating, e.dealer)} ${conjugate(seating, e.dealer, 'deal', 'deals')}.`
    case 'flower':
      return `${nameOf(seating, e.seat)} drew ${tileName(e.tile)} and took a replacement.`
    case 'discard':
      return `${nameOf(seating, e.seat)} discarded ${tileName(e.tile)}.`
    case 'chow':
    case 'pung':
    case 'kong':
      return `${nameOf(seating, e.seat)} took ${tileName(e.tile)} from ${nameOf(seating, e.from, true)} for a ${e.kind}.`
    case 'concealedKong':
      return `${nameOf(seating, e.seat)} declared a concealed kong.`
    case 'addedKong':
      return `${nameOf(seating, e.seat)} added ${tileName(e.tile)} to a pung.`
    case 'win':
      return `${nameOf(seating, e.seat)} ${conjugate(seating, e.seat, 'win', 'wins')} ${
        e.from === null ? 'by self-draw' : `on ${possessive(seating, e.from, true)} ${tileName(e.tile)}`
      } with ${e.faan} faan.`
    case 'exhausted':
      return 'The wall is exhausted.'
  }
}
