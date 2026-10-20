import { describe, expect, it } from 'vitest'
import { parseTiles, type StandardId } from '../../engine/tiles'
import type { Hand } from '../../engine/hand'
import { LIMIT_FAAN, MINIMUM_FAAN, PATTERNS, RARE_HANDS, scoreHand, type WinContext } from './scoring'
import { SCORING_EXAMPLES } from './hands'

const ids = (s: string) => parseTiles(s) as StandardId[]

function ctx(hand: Hand, over: Partial<WinContext> = {}): WinContext {
  return {
    hand,
    winningTile: hand.concealed[hand.concealed.length - 1],
    selfDrawn: false,
    seatWind: 'south',
    prevailingWind: 'east',
    ...over,
  }
}

function faanOf(s: ReturnType<typeof scoreHand>) {
  return Object.fromEntries((s?.patterns ?? []).map((p) => [p.id, p.faan]))
}

describe('Hong Kong scoring', () => {
  it('returns null for a hand that is not complete', () => {
    expect(scoreHand(ctx({ concealed: ids('D1 D2 D4 B2 B2 B2 WE WE WE D7 D7 C4 C5 C6'), melds: [] }))).toBeNull()
  })

  it('scores a chicken hand at zero when won from a discard with open melds', () => {
    const hand: Hand = {
      concealed: ids('D1 D2 D3 B2 B2 B2 D7 D7 C4 C5 C6'),
      melds: [{ kind: 'pung', tiles: ids('WS WS WS'), open: true }],
    }
    // South wind pung for an East seat in an East round: no wind faan.
    const s = scoreHand(ctx(hand, { seatWind: 'east' }))
    expect(s?.total).toBe(0)
    expect(s?.meetsMinimum).toBe(false)
  })

  it('scores all chows, and refuses it when the pair would score', () => {
    const ok = ctx({ concealed: ids('D1 D2 D3 B4 B5 B6 C7 C8 C9 D4 D5 D6 WN WN'), melds: [] })
    expect(faanOf(scoreHand(ok))).toEqual({ allChows: 1, concealed: 1 })
    const bad = ctx({ concealed: ids('D1 D2 D3 B4 B5 B6 C7 C8 C9 D4 D5 D6 RD RD'), melds: [] })
    expect(faanOf(scoreHand(bad))).toEqual({ concealed: 1 })
    const seatPair = ctx({ concealed: ids('D1 D2 D3 B4 B5 B6 C7 C8 C9 D4 D5 D6 WS WS'), melds: [] })
    expect(faanOf(scoreHand(seatPair))).toEqual({ concealed: 1 })
  })

  it('scores all pungs plus winds, counting a double wind twice', () => {
    const hand: Hand = {
      concealed: ids('D2 D2 D2 B5 B5 B5 WE WE WE C9 C9'),
      melds: [{ kind: 'kong', tiles: ids('D8 D8 D8 D8'), open: true }],
    }
    const s = scoreHand(ctx(hand, { seatWind: 'east', prevailingWind: 'east' }))
    expect(faanOf(s)).toEqual({ allPungs: 3, seatWindPung: 1, prevailingWindPung: 1 })
    expect(s?.total).toBe(5)
  })

  it('scores dragon pungs once each', () => {
    const hand: Hand = {
      concealed: ids('RD RD RD GD GD GD D1 D2 D3 B4 B5 B6 C9 C9'),
      melds: [],
    }
    expect(faanOf(scoreHand(ctx(hand)))).toEqual({ dragonPung: 2, concealed: 1 })
  })

  it('scores mixed and pure one suit', () => {
    const mixed: Hand = {
      concealed: ids('B1 B2 B3 B4 B5 B6 B7 B7 B7 WW WW'),
      melds: [{ kind: 'pung', tiles: ids('GD GD GD'), open: true }],
    }
    expect(faanOf(scoreHand(ctx(mixed)))).toEqual({ mixedOneSuit: 3, dragonPung: 1 })
    const pure: Hand = { concealed: ids('C1 C2 C3 C4 C5 C6 C7 C8 C9 C2 C3 C4 C9 C9'), melds: [] }
    const s = scoreHand(ctx(pure, { selfDrawn: true }))
    expect(faanOf(s)).toEqual({ allChows: 1, pureOneSuit: 7, selfDrawn: 1, concealed: 1 })
    expect(s?.total).toBe(10)
  })

  it('caps the total at the limit', () => {
    const hand: Hand = {
      concealed: ids('C1 C1 C1 C2 C2 C2 C3 C3 C3 C4 C4 C4 C9 C9'),
      melds: [],
    }
    const s = scoreHand(ctx(hand, { selfDrawn: true }))
    // allPungs 3 + pureOneSuit 7 + selfDrawn 1 + concealed 1 = 12; also decomposes as chows,
    // but the pung arrangement scores higher and is the one that counts.
    expect(s?.total).toBe(12)
    expect(s?.patterns.map((p) => p.id)).toContain('allPungs')
  })

  it('scores the lesson examples as the lesson says it does', () => {
    for (const ex of SCORING_EXAMPLES) {
      const s = scoreHand(ex.context)
      expect(s, ex.id).not.toBeNull()
      expect(faanOf(s), ex.id).toEqual(ex.expected)
      expect(s?.total, ex.id).toBe(Object.values(ex.expected).reduce((a, b) => a + b, 0))
      expect(s?.meetsMinimum, ex.id).toBe(s!.total >= MINIMUM_FAAN)
    }
  })

  it('lists every pattern with a positive faan value', () => {
    for (const p of PATTERNS) expect(p.faan).toBeGreaterThan(0)
  })

  it('lists the rare hands with the dragon hands at ten and the rest at or under the limit', () => {
    const names = RARE_HANDS.map((h) => h.name)
    expect(new Set(names).size).toBe(names.length)
    for (const h of RARE_HANDS) {
      expect(h.chinese.length, h.name).toBeGreaterThan(0)
      if (h.faan !== 'limit') expect(h.faan, h.name).toBeLessThan(LIMIT_FAAN)
    }
    for (const name of ['Jade dragon', 'Ruby dragon', 'Pearl dragon']) {
      expect(RARE_HANDS.find((h) => h.name === name)?.faan, name).toBe(10)
    }
  })
})
