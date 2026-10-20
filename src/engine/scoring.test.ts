import { describe, expect, it } from 'vitest'
import type { Hand } from './hand'
import { LIMIT_FAAN, pointsFor, scoreHand, type WinContext } from './scoring'
import { parseTiles, type BonusId, type StandardId } from './tiles'

const ids = (s: string) => parseTiles(s) as StandardId[]

function ctx(concealed: string, over: Partial<WinContext> & { melds?: Hand['melds'] } = {}): WinContext {
  const { melds = [], ...rest } = over
  const tiles = ids(concealed)
  return {
    hand: { concealed: tiles, melds },
    winningTile: tiles[tiles.length - 1],
    selfDrawn: false,
    seatWind: 'south',
    prevailingWind: 'east',
    flowers: ['F1'],
    ...rest,
  }
}
const names = (c: WinContext) => scoreHand(c)!.patterns.map((p) => `${p.id}${p.times > 1 ? `x${p.times}` : ''}`)

describe('scoreHand', () => {
  it('returns null for a hand that is not a win', () => {
    expect(scoreHand(ctx('C1 C2 C3 D4 D5 D6 B7 B8 B9 WE WE WE RD GD'))).toBeNull()
  })
  it('scores all chows with a concealed hand', () => {
    const c = ctx('C1 C2 C3 D4 D5 D6 B7 B8 B9 C4 C5 C6 B2 B2')
    expect(names(c)).toEqual(['allChows', 'concealed'])
    expect(scoreHand(c)!.total).toBe(2)
  })
  it('does not give all chows when the pair would score', () => {
    expect(names(ctx('C1 C2 C3 D4 D5 D6 B7 B8 B9 C4 C5 C6 RD RD'))).toEqual(['concealed'])
    expect(names(ctx('C1 C2 C3 D4 D5 D6 B7 B8 B9 C4 C5 C6 WS WS'))).toEqual(['concealed'])
    expect(names(ctx('C1 C2 C3 D4 D5 D6 B7 B8 B9 C4 C5 C6 WW WW'))).toEqual(['allChows', 'concealed'])
  })
  it('scores value pungs, each dragon separately', () => {
    const c = ctx('C1 C2 C3 RD RD RD GD GD GD WS WS WS B2 B2', { selfDrawn: true })
    expect(names(c)).toEqual(['dragonPungx2', 'seatWindPung', 'selfDrawn', 'concealed'])
    expect(scoreHand(c)!.total).toBe(5)
    const d = ctx('B4 B4 B4 RD RD RD GD GD GD WS WS WS C2 C2', { selfDrawn: true })
    expect(names(d)).toEqual(['allPungs', 'dragonPungx2', 'seatWindPung', 'selfDrawn', 'concealed'])
    expect(scoreHand(d)!.total).toBe(8)
  })
  it('counts a wind that is both seat and prevailing twice', () => {
    const c = ctx('C1 C2 C3 D4 D5 D6 WE WE WE C4 C5 C6 B2 B2', { seatWind: 'east', prevailingWind: 'east' })
    expect(names(c)).toContain('seatWindPung')
    expect(names(c)).toContain('prevailingWindPung')
  })
  it('scores one suit', () => {
    expect(names(ctx('C1 C2 C3 C4 C5 C6 C7 C8 C9 WE WE WE C2 C2'))).toContain('mixedOneSuit')
    expect(names(ctx('C1 C2 C3 C4 C5 C6 C7 C8 C9 C5 C5 C5 C2 C2'))).toContain('pureOneSuit')
  })
  it('uses declared melds and drops the concealed bonus for open ones', () => {
    const c = ctx('C1 C2 C3 D4 D5 D6 B7 B8', {
      melds: [
        { kind: 'pung', tiles: ids('RD RD RD'), open: true },
        { kind: 'chow', tiles: ids('C4 C5 C6'), open: true },
      ],
    })
    // 8 concealed + 2 melds, winning tile B8 completes a pair? No: C1C2C3 D4D5D6 B7B8 is 3n+2 with B7 B8 not a pair.
    expect(scoreHand(c)).toBeNull()
    const d = ctx('C1 C2 C3 D4 D5 D6 B8 B8', {
      melds: [
        { kind: 'pung', tiles: ids('RD RD RD'), open: true },
        { kind: 'kong', tiles: ids('C4 C4 C4 C4'), open: false },
      ],
    })
    expect(names(d)).toEqual(['dragonPung'])
  })
  it('scores flowers', () => {
    const base = 'C1 C2 C3 D4 D5 D6 B7 B8 B9 C4 C5 C6 B2 B2'
    expect(names(ctx(base, { flowers: [] }))).toContain('noFlowers')
    expect(names(ctx(base, { seatWind: 'east', flowers: ['F1', 'S1'] }))).toContain('seatFlowerx2')
    expect(names(ctx(base, { flowers: ['F1', 'F2', 'F3', 'F4'] as BonusId[], seatWind: 'north' }))).toContain('flowerSet')
    const all = ctx(base, { flowers: ['F1', 'F2', 'F3', 'F4', 'S1', 'S2', 'S3', 'S4'] as BonusId[] })
    expect(names(all)).toContain('flowerSetx2')
  })
  it('scores situational patterns', () => {
    const base = 'C1 C2 C3 D4 D5 D6 B7 B8 B9 C4 C5 C6 B2 B2'
    expect(names(ctx(base, { afterKong: true, selfDrawn: true }))).toContain('winOnKong')
    expect(names(ctx(base, { lastTile: true }))).toContain('lastTile')
    expect(names(ctx(base, { robbedKong: true }))).toContain('robbingKong')
  })
  it('scores little and big three dragons', () => {
    const little = ctx('C1 C2 C3 RD RD RD GD GD GD D4 D5 D6 WD WD')
    expect(names(little)).toEqual(['littleThreeDragons', 'dragonPungx2', 'concealed'])
    expect(scoreHand(little)!.total).toBe(6)
    const big = ctx('C1 C2 C3 RD RD RD GD GD GD WD WD WD B2 B2')
    expect(names(big)[0]).toBe('bigThreeDragons')
    expect(scoreHand(big)!.total).toBe(LIMIT_FAAN)
    expect(scoreHand(big)!.limit).toBe(true)
  })
  it('scores the dragon hands at ten, in place of all pungs, mixed one suit and the dragon pung', () => {
    const ruby = ctx('C1 C1 C1 C4 C4 C4 C9 C9 C9 RD RD RD C2 C2')
    expect(names(ruby)).toEqual(['rubyDragon', 'concealed'])
    expect(scoreHand(ruby)!.total).toBe(11)
    expect(scoreHand(ruby)!.limit).toBe(false)
    const jade = ctx('B3 B3 B3 B5 B5 B5 B4 B4', {
      melds: [
        { kind: 'kong', tiles: ids('GD GD GD GD'), open: true },
        { kind: 'pung', tiles: ids('B8 B8 B8'), open: true },
      ],
    })
    expect(names(jade)).toEqual(['jadeDragon'])
    expect(scoreHand(jade)!.total).toBe(10)
    const pearl = ctx('D1 D1 D1 D5 D5 D5 D7 D7 D7 WD WD WD D4 D4', { selfDrawn: true })
    expect(names(pearl)).toEqual(['pearlDragon', 'selfDrawn', 'concealed'])
    expect(scoreHand(pearl)!.total).toBe(12)
  })
  it('does not give a dragon hand with a chow, the wrong dragon, a dragon pair or extra honors', () => {
    expect(names(ctx('C1 C2 C3 C4 C4 C4 C9 C9 C9 RD RD RD C2 C2'))).toEqual(['mixedOneSuit', 'dragonPung', 'concealed'])
    expect(names(ctx('B1 B1 B1 B4 B4 B4 B7 B7 B7 RD RD RD B2 B2'))).toEqual(['allPungs', 'mixedOneSuit', 'dragonPung', 'concealed'])
    expect(names(ctx('C1 C1 C1 C4 C4 C4 C9 C9 C9 C5 C5 C5 RD RD'))).toEqual(['allPungs', 'mixedOneSuit', 'concealed'])
    expect(names(ctx('C1 C1 C1 C4 C4 C4 C9 C9 C9 RD RD RD WE WE'))).toEqual(['allPungs', 'mixedOneSuit', 'dragonPung', 'concealed'])
  })
  it('scores the four winds', () => {
    expect(names(ctx('WE WE WE WS WS WS WW WW WW C1 C2 C3 WN WN'))[0]).toBe('littleFourWinds')
    expect(names(ctx('WE WE WE WS WS WS WW WW WW WN WN WN B2 B2'))[0]).toBe('bigFourWinds')
  })
  it('scores the other limit hands', () => {
    expect(names(ctx('WE WE WE WS WS WS RD RD RD GD GD GD WD WD'))).toContain('allHonors')
    expect(names(ctx('C1 C1 C1 C9 C9 C9 D1 D1 D1 B9 B9 B9 D9 D9'))).toContain('allTerminals')
    expect(names(ctx('C1 C9 D1 D9 B1 B9 WE WS WW WN RD GD WD WD'))).toContain('thirteenOrphans')
    expect(names(ctx('C1 C1 C1 C2 C3 C4 C5 C6 C7 C8 C9 C9 C9 C5'))).toContain('nineGates')
    const kongs = ctx('B2 B2', {
      melds: [
        { kind: 'kong', tiles: ids('C1 C1 C1 C1'), open: true },
        { kind: 'kong', tiles: ids('D2 D2 D2 D2'), open: true },
        { kind: 'kong', tiles: ids('B3 B3 B3 B3'), open: false },
        { kind: 'kong', tiles: ids('RD RD RD RD'), open: true },
      ],
    })
    expect(names(kongs)).toContain('fourKongs')
    expect(scoreHand(kongs)!.total).toBe(LIMIT_FAAN)
    expect(names(ctx('C1 C2 C3 D4 D5 D6 B7 B8 B9 C4 C5 C6 B2 B2', { heavenly: true }))[0]).toBe('heavenly')
    expect(names(ctx('C1 C2 C3 D4 D5 D6 B7 B8 B9 C4 C5 C6 B2 B2', { earthly: true }))[0]).toBe('earthly')
  })
  it('caps the total at the limit', () => {
    const c = ctx('C1 C1 C1 C9 C9 C9 C5 C5 C5 C7 C7 C7 C2 C2', { selfDrawn: true, flowers: [] })
    expect(scoreHand(c)!.total).toBe(LIMIT_FAAN)
  })
})

describe('pointsFor', () => {
  it('follows the half-spicy-up table', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 13].map(pointsFor)).toEqual([1, 2, 4, 8, 16, 24, 32, 48, 384])
    expect(pointsFor(20)).toBe(384)
  })
})
