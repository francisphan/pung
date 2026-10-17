import { describe, expect, it } from 'vitest'
import { newGame, reduce } from './engine/game'
import { EMPTY_LOG, withNote, withState } from './log'

describe('log history', () => {
  it('records each state once and keeps earlier hands', () => {
    let s = newGame({ minimumFaan: 0, rounds: 1 }, 3)
    let h = withState(EMPTY_LOG, s)
    expect(h.items.map((i) => i.entry.kind)).toEqual(s.log.map((e) => e.kind))
    expect(h.items[0].entry.kind).toBe('deal')
    const n = h.items.length
    s = reduce(s, { type: 'discard', seat: 0, tile: s.players[0].concealed[0] })
    h = withState(h, s)
    expect(h.items[n].entry.kind).toBe('discard')
    expect(h.items.length).toBe(s.log.length)
    // The same state again adds nothing.
    expect(withState(h, s)).toBe(h)
    // A new hand starts a fresh engine log but the history keeps going.
    const t = structuredClone(s)
    t.handIndex = 1
    t.log = [{ kind: 'deal', dealer: 1, prevailing: 'east', hand: 2 }]
    const before = h.items.length
    h = withState(h, t)
    expect(h.items.length).toBe(before + 1)
    expect(h.items[before].hand).toBe(1)
    expect(h.items[before].entry.kind).toBe('deal')
    expect(new Set(h.items.map((i) => i.id)).size).toBe(h.items.length)
  })

  it('takes notes from the room', () => {
    const h = withNote(EMPTY_LOG, 'Bo sat down at South.')
    expect(h.items).toEqual([{ id: 1, hand: -1, entry: { kind: 'note', text: 'Bo sat down at South.' } }])
  })
})

describe('log limit', () => {
  it('keeps only the most recent lines', async () => {
    const { LOG_LIMIT } = await import('./log')
    let h = EMPTY_LOG
    for (let i = 0; i < LOG_LIMIT + 25; i++) h = withNote(h, `note ${i}`)
    expect(h.items).toHaveLength(LOG_LIMIT)
    expect(h.items[0].entry).toEqual({ kind: 'note', text: 'note 25' })
  })
})
