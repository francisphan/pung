import type { Rules } from './engine/game'
import type { Speed } from './pace'

/** Short words for the rules, for players who cannot change them. */
export function describeRules(rules: Rules, speed: Speed): string {
  const min = rules.minimumFaan === 0 ? 'any hand wins' : `${rules.minimumFaan} faan to win`
  const length = rules.rounds === 1 ? 'the East round only' : 'four rounds'
  return `${min[0].toUpperCase()}${min.slice(1)}, ${length}, ${speed} opponents.`
}
