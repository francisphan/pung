import { describe, expect, it } from 'vitest'
import {
  FULL_SET,
  STANDARD_TILES,
  TILES,
  TILE_BY_ID,
  copiesOf,
  parseTiles,
  sortTiles,
  tileGlyphText,
  tileName,
} from './tiles'

describe('tile set', () => {
  it('has 42 distinct faces and 144 physical tiles', () => {
    expect(TILES).toHaveLength(42)
    expect(STANDARD_TILES).toHaveLength(34)
    expect(FULL_SET).toHaveLength(144)
  })

  it('holds four of every standard tile and one of every bonus tile', () => {
    for (const t of TILES) {
      expect(FULL_SET.filter((id) => id === t.id)).toHaveLength(copiesOf(t.id))
    }
  })

  it('names every tile in English and shows what is printed on it', () => {
    expect(tileName('C3')).toBe('Three of characters')
    expect(tileName('D1')).toBe('One of dots')
    expect(tileName('WE')).toBe('East wind')
    expect(tileName('GD')).toBe('Green dragon')
    expect(tileName('F2')).toBe('Orchid (flower 2)')
    expect(tileGlyphText('C7')).toBe('七萬')
    expect(tileGlyphText('RD')).toBe('中')
    for (const t of TILES) expect(tileName(t.id)).not.toBe('')
  })

  it('sorts by suit, then rank, then honors', () => {
    expect(sortTiles(['WE', 'B1', 'D9', 'C2', 'RD', 'F1'])).toEqual([
      'C2',
      'D9',
      'B1',
      'WE',
      'RD',
      'F1',
    ])
  })

  it('parses ids and rejects unknown ones', () => {
    expect(parseTiles('D1 D2  D3')).toEqual(['D1', 'D2', 'D3'])
    expect(() => parseTiles('D1 X9')).toThrow(/Unknown tile/)
    expect(TILE_BY_ID.WD.kind).toBe('dragon')
  })
})
