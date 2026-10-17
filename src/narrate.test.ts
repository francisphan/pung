import { describe, expect, it } from 'vitest'
import { narrate } from './narrate'
import type { Seating } from './names'

describe('narrate', () => {
  const seating: Seating = { me: 2, names: ['Ann', 'Bo', 'Cy', 'Di'] }

  it('speaks from the seat the device plays', () => {
    expect(narrate({ kind: 'discard', seat: 2, tile: 'C5' }, seating)).toBe('You discarded Five of characters.')
    expect(narrate({ kind: 'discard', seat: 1, tile: 'C5' }, seating)).toBe('Bo discarded Five of characters.')
    expect(narrate({ kind: 'deal', dealer: 2, prevailing: 'east', hand: 1 }, seating)).toBe('New hand. You deal.')
    expect(narrate({ kind: 'deal', dealer: 0, prevailing: 'east', hand: 1 }, seating)).toBe('New hand. Ann deals.')
  })

  it('keeps "you" lower case mid-sentence', () => {
    expect(narrate({ kind: 'pung', seat: 1, tile: 'WD', from: 2 }, seating)).toBe('Bo took White dragon from you for a pung.')
    expect(narrate({ kind: 'win', seat: 0, from: 2, tile: 'D1', faan: 3, points: 16 }, seating)).toBe('Ann wins on your One of dots with 3 faan.')
    expect(narrate({ kind: 'win', seat: 2, from: null, tile: 'D1', faan: 4, points: 32 }, seating)).toBe('You win by self-draw with 4 faan.')
  })

  it('defaults to solo seating', () => {
    expect(narrate({ kind: 'chow', seat: 0, tile: 'B3', from: 3 })).toBe('You took Three of bamboo from Ling for a chow.')
  })
})
