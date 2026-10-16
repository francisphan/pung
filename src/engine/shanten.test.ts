import { describe, expect, it } from 'vitest'
import { acceptance, shanten, toCounts } from './shanten'
import { parseTiles, type StandardId } from './tiles'

const ids = (s: string) => parseTiles(s) as StandardId[]
const full = new Array(34).fill(4)

describe('shanten', () => {
  it('is -1 for a complete hand', () => {
    expect(shanten(ids('C1 C2 C3 D4 D5 D6 B7 B8 B9 WE WE WE RD RD'), 0)).toBe(-1)
    expect(shanten(ids('C1 C2 C3 D4 D5 D6 RD RD'), 2)).toBe(-1)
  })
  it('is 0 for a ready hand', () => {
    expect(shanten(ids('C1 C2 C3 D4 D5 D6 B7 B8 B9 WE WE WE RD'), 0)).toBe(0)
    expect(shanten(ids('C1 C2 C3 D4 D5 D6 B7 B8 WE WE WE RD RD'), 0)).toBe(0)
  })
  it('counts partial sets', () => {
    // three sets, a pair and two loose tiles: one away
    expect(shanten(ids('C1 C2 C3 D4 D5 D6 B7 B8 B9 WE WE RD GD'), 0)).toBe(1)
    // two sets, two partials, a pair: 8 - 4 - 2 - 1 = 1
    expect(shanten(ids('C1 C2 C3 D4 D5 D6 B7 B8 C5 C6 WE WE RD'), 0)).toBe(1)
  })
  it('handles thirteen orphans', () => {
    expect(shanten(ids('C1 C9 D1 D9 B1 B9 WE WS WW WN RD GD WD'), 0)).toBe(0)
    expect(shanten(ids('C1 C9 D1 D9 B1 B9 WE WS WW WN RD GD GD'), 0)).toBe(0)
    expect(shanten(ids('C1 C9 D1 D9 B1 B9 WE WS WW WN RD GD C5'), 0)).toBe(1)
    expect(shanten(ids('C1 C9 D1 D9 B1 B9 WE WS WW WN RD GD WD WD'), 0)).toBe(-1)
  })
  it('scores a hand of singles as far away', () => {
    expect(shanten(ids('C1 C4 C7 D2 D5 D8 B3 B6 B9 WE WS WW RD'), 0)).toBe(7)
    expect(shanten(ids('C2 C5 C8 D2 D5 D8 B3 B6 B4 WE WS WW RD'), 1)).toBe(5)
  })
  it('respects declared sets', () => {
    // ten concealed with one pung declared: three sets needed from these
    expect(shanten(ids('C1 C2 C3 D4 D5 D6 B7 B8 B9 RD'), 1)).toBe(0)
  })
})

describe('acceptance', () => {
  it('lists the waits of a ready hand', () => {
    const a = acceptance(ids('C1 C2 C3 D4 D5 D6 B7 B8 WE WE WE RD RD'), 0, full)
    expect(a.shanten).toBe(0)
    expect(a.tiles.map((t) => t.id).sort()).toEqual(['B6', 'B9'])
    expect(a.count).toBe(8)
  })
  it('ignores faces with no unseen copies', () => {
    const unseen = [...full]
    unseen[toCounts(['B6']).indexOf(1)] = 0
    const a = acceptance(ids('C1 C2 C3 D4 D5 D6 B7 B8 WE WE WE RD RD'), 0, unseen)
    expect(a.tiles.map((t) => t.id)).toEqual(['B9'])
  })
  it('is fast enough for the AI', () => {
    const t0 = performance.now()
    for (let i = 0; i < 200; i++) acceptance(ids('C1 C2 C4 C5 C7 D2 D3 D5 B4 B5 B6 WE RD'), 0, full)
    expect(performance.now() - t0).toBeLessThan(2000)
  })
})
