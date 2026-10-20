import { describe, expect, it } from 'vitest'
import { distractors, makeQuestion } from './quiz'
import { TILES } from '../../engine/tiles'

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

describe('name that tile', () => {
  it('offers four distinct options including the answer', () => {
    const rng = seeded(7)
    for (let i = 0; i < 200; i++) {
      const q = makeQuestion(rng)
      expect(q.options).toHaveLength(4)
      expect(new Set(q.options).size).toBe(4)
      expect(q.options).toContain(q.tile)
    }
  })

  it('never repeats the tile it is told to avoid', () => {
    const rng = seeded(3)
    for (let i = 0; i < 100; i++) expect(makeQuestion(rng, 'RD').tile).not.toBe('RD')
  })

  it('confuses a suit tile with its rank in other suits and its neighbours', () => {
    expect(distractors('D5')).toEqual(['C5', 'D3', 'D4', 'D6', 'D7', 'B5'])
    expect(distractors('WE')).toEqual(['WS', 'WW', 'WN', 'RD', 'GD', 'WD'])
    for (const t of TILES) expect(distractors(t.id).length).toBeGreaterThanOrEqual(3)
  })
})
