import { describe, expect, it } from 'vitest'
import { isWinning } from '../../engine/hand'
import { DRAW_ORDER, FRAMES, SEATS, type Seat, type Spot } from './round'
import type { StandardId } from '../../engine/tiles'

function bySeat(spots: Spot[], seat: Seat) {
  return {
    hand: spots.filter((s) => s.zone === 'hand' && s.seat === seat),
    melds: spots.filter((s) => s.zone === 'meld' && s.seat === seat),
    discards: spots.filter((s) => s.zone === 'discard' && s.seat === seat),
  }
}

describe('scripted round', () => {
  it('draws every wall slot exactly once', () => {
    expect(new Set(DRAW_ORDER).size).toBe(144)
  })

  it('keeps all 144 tiles in every frame', () => {
    for (const f of FRAMES) {
      expect(f.spots, f.id).toHaveLength(144)
      expect(new Set(f.spots.map((s) => s.key)).size, f.id).toBe(144)
    }
  })

  it('gives every seat thirteen tiles between turns and fourteen when active', () => {
    for (const f of FRAMES.slice(3)) {
      for (const seat of SEATS) {
        const { hand, melds } = bySeat(f.spots, seat)
        const n = hand.length + melds.length
        const melded = new Set(melds.map((m) => m.group)).size
        const effective = hand.length + melded * 3
        if (f.id === 'deal' && seat === 'E') expect(effective, `${f.id} ${seat}`).toBe(14)
        else if (f.id === 'win' && seat === 'E') expect(effective, `${f.id} ${seat}`).toBe(14)
        else expect(effective, `${f.id} ${seat} (${n} tiles)`).toBe(13)
      }
    }
  })

  it('shows only East face up until tiles are discarded or claimed', () => {
    for (const f of FRAMES) {
      for (const s of f.spots) {
        if (s.zone === 'hand') expect(s.faceUp, `${f.id} ${s.key}`).toBe(s.seat === 'E')
        if (s.zone === 'discard' || s.zone === 'meld') expect(s.faceUp).toBe(true)
        if (s.zone === 'wall') expect(s.faceUp).toBe(false)
      }
    }
  })

  it('ends with a winning hand for East', () => {
    const last = FRAMES[FRAMES.length - 1]
    expect(last.winner).toBe('E')
    const { hand, melds } = bySeat(last.spots, 'E')
    const concealed = hand.map((s) => s.tile as StandardId)
    const groups = new Map<number, StandardId[]>()
    for (const m of melds) groups.set(m.group!, [...(groups.get(m.group!) ?? []), m.tile as StandardId])
    expect(
      isWinning({
        concealed,
        melds: [...groups.values()].map((tiles) => ({ kind: 'chow', tiles, open: true })),
      }),
    ).toBe(true)
    expect(new Set(hand.map((s) => s.group)).size).toBe(4)
  })

  it('claims the pung for South over East in the priority frame', () => {
    const f = FRAMES.find((x) => x.id === 'priority')!
    expect(f.callouts.find((c) => c.wins)?.seat).toBe('S')
    const south = bySeat(f.spots, 'S')
    expect(south.melds.map((m) => m.tile)).toEqual(['B7', 'B7', 'B7'])
  })
})
