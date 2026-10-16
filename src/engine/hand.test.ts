import { describe, expect, it } from 'vitest'
import { classifyMeld, decompose, findWaits, isWinning, type Hand } from './hand'
import { parseTiles, type StandardId } from './tiles'

const ids = (s: string) => parseTiles(s) as StandardId[]
const concealed = (s: string): Hand => ({ concealed: ids(s), melds: [] })

describe('melds', () => {
  it('classifies chow, pung, kong and pair', () => {
    expect(classifyMeld(ids('D1 D2 D3'))).toBe('chow')
    expect(classifyMeld(ids('D3 D1 D2'))).toBe('chow')
    expect(classifyMeld(ids('B5 B5 B5'))).toBe('pung')
    expect(classifyMeld(ids('WE WE WE WE'))).toBe('kong')
    expect(classifyMeld(ids('RD RD'))).toBe('pair')
    expect(classifyMeld(ids('D8 D9 D1'))).toBeNull()
    expect(classifyMeld(ids('D1 B2 C3'))).toBeNull()
    expect(classifyMeld(ids('WE WS WW'))).toBeNull()
  })
})

describe('winning hands', () => {
  it('recognises four sets and a pair', () => {
    expect(isWinning(concealed('D1 D2 D3 B2 B2 B2 WE WE WE D7 D7 C4 C5 C6'))).toBe(true)
    expect(isWinning(concealed('C1 C1 C1 C2 C3 C4 C5 C6 C7 C8 C9 C9 C9 C5'))).toBe(true)
  })

  it('accepts declared melds alongside concealed tiles', () => {
    const hand: Hand = {
      concealed: ids('D1 D2 D3 B2 B2 B2 WE WE WE D7 D7'),
      melds: [{ kind: 'chow', tiles: ids('C4 C5 C6'), open: true }],
    }
    expect(isWinning(hand)).toBe(true)
    const withKong: Hand = {
      concealed: ids('D1 D2 D3 B2 B2 B2 D7 D7'),
      melds: [
        { kind: 'chow', tiles: ids('C4 C5 C6'), open: true },
        { kind: 'kong', tiles: ids('WE WE WE WE'), open: true },
      ],
    }
    expect(isWinning(withKong)).toBe(true)
  })

  it('rejects hands that do not form four sets and a pair', () => {
    expect(isWinning(concealed('D1 D2 D3 B2 B2 B2 WE WE WE D7 D8 C4 C5 C6'))).toBe(false)
    expect(isWinning(concealed('D1 D2 D3 B2 B2 B2 WE WE WS D7 D7 C4 C5 C6'))).toBe(false)
    expect(isWinning(concealed('D1 D2 D3 B2 B2 B2 WE WE WE D7 D7 C4 C5'))).toBe(false)
    expect(isWinning(concealed('D1 D2 D3 D4 D5 D6 D7 D8 D9 D1 D2 D3 D4 D5'))).toBe(false)
    expect(isWinning(concealed('D9 D1 D2 B2 B2 B2 WE WE WE D7 D7 C4 C5 C6'))).toBe(false)
  })

  it('finds every arrangement when there are several', () => {
    const d = decompose(concealed('D1 D1 D1 D2 D2 D2 D3 D3 D3 D4 D4 D4 D5 D5'))
    expect(d.length).toBeGreaterThan(1)
    expect(d.every((x) => x.sets.length === 4 && x.pair.kind === 'pair')).toBe(true)
  })
})

describe('waits', () => {
  it('finds an edge wait', () => {
    expect(findWaits(concealed('D1 D2 B2 B2 B2 WE WE WE D7 D7 C4 C5 C6'))).toEqual(['D3'])
  })
  it('finds a two-sided wait', () => {
    expect(findWaits(concealed('C2 C3 C4 D3 D4 D6 D6 D6 B8 B8 B8 WS WS'))).toEqual(['D2', 'D5'])
  })
  it('finds a three-sided wait', () => {
    expect(findWaits(concealed('C2 C3 C4 D3 D4 D5 D6 D7 B8 B8 B8 WS WS'))).toEqual(['D2', 'D5', 'D8'])
  })
  it('finds a double-pair wait', () => {
    expect(findWaits(concealed('B4 B4 B4 B6 B6 C1 C2 C3 D9 D9 D9 RD RD'))).toEqual(['B6', 'RD'])
  })
  it('finds all nine waits of nine gates', () => {
    expect(findWaits(concealed('C1 C1 C1 C2 C3 C4 C5 C6 C7 C8 C9 C9 C9'))).toEqual([
      'C1',
      'C2',
      'C3',
      'C4',
      'C5',
      'C6',
      'C7',
      'C8',
      'C9',
    ])
  })
  it('respects declared melds and tiles already used up', () => {
    const hand: Hand = {
      concealed: ids('D1 D2 B2 B2 B2 WE WE WE D7 D7'),
      melds: [{ kind: 'chow', tiles: ids('C4 C5 C6'), open: true }],
    }
    expect(findWaits(hand)).toEqual(['D3'])
    expect(findWaits(concealed('WE WE WE WE D1 D2 D3'))).toEqual([])
  })
  it('returns nothing for a hand that is not one tile short', () => {
    expect(findWaits(concealed('D1 D2 D3'))).toEqual([])
  })
})
