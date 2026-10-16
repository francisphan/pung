import type { LogEntry } from './engine/game'
import { tileName } from './engine/tiles'
import { HUMAN } from './hooks/useGame'
import { NAMES } from './names'

/** One plain sentence for a log entry. */
export function narrate(e: LogEntry | undefined): string {
  if (!e) return ''
  switch (e.kind) {
    case 'deal':
      return `New hand. ${NAMES[e.dealer]} ${e.dealer === HUMAN ? 'deal' : 'deals'}.`
    case 'flower':
      return `${NAMES[e.seat]} drew ${tileName(e.tile)} and took a replacement.`
    case 'discard':
      return `${NAMES[e.seat]} discarded ${tileName(e.tile)}.`
    case 'chow':
    case 'pung':
    case 'kong':
      return `${NAMES[e.seat]} took ${tileName(e.tile)} from ${NAMES[e.from]} for a ${e.kind}.`
    case 'concealedKong':
      return `${NAMES[e.seat]} declared a concealed kong.`
    case 'addedKong':
      return `${NAMES[e.seat]} added ${tileName(e.tile)} to a pung.`
    case 'win':
      return `${NAMES[e.seat]} ${e.seat === HUMAN ? 'win' : 'wins'} with ${e.faan} faan.`
    case 'exhausted':
      return 'The wall is exhausted.'
  }
}
