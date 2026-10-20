import { describe, expect, it } from 'vitest'
import { aiTurn } from './ai'
import { SEATS, canSelfWin, kongOptions, newGame, reduce } from './game'
import { HIDDEN, isHidden, revealedTiles, viewFor } from './view'

describe('viewFor', () => {
  it('shows a seat its own rack and nothing else', () => {
    const s = newGame({ minimumFaan: 0, rounds: 1 }, 5)
    for (const seat of SEATS) {
      const v = viewFor(s, seat)
      expect(v.players[seat].concealed).toEqual(s.players[seat].concealed)
      for (const o of SEATS) {
        if (o === seat) continue
        expect(v.players[o].concealed).toHaveLength(s.players[o].concealed.length)
        expect(v.players[o].concealed.every(isHidden)).toBe(true)
      }
      expect(v.wall).toHaveLength(s.wall.length)
      expect(v.wall.every(isHidden)).toBe(true)
      expect(v.seed).toBe(0)
      const mine = new Set(s.players[seat].concealed)
      for (const t of revealedTiles(v)) expect(mine.has(t as never)).toBe(true)
    }
  })

  it('lays every rack face up once the hand is over', () => {
    let s = newGame({ minimumFaan: 0, rounds: 1 }, 5)
    let guard = 0
    while (s.phase !== 'handEnd' && guard++ < 2000) {
      if (s.phase === 'discard') s = reduce(s, aiTurn(s, s.current))
      else if (s.phase === 'claim') {
        const decisions: Record<number, { kind: 'pass' }> = {}
        for (const o of SEATS) if (s.claim!.options[o]) decisions[o] = { kind: 'pass' }
        s = reduce(s, { type: 'decide', decisions })
      } else break
    }
    expect(s.phase).toBe('handEnd')
    for (const seat of SEATS) {
      const v = viewFor(s, seat)
      for (const o of SEATS) expect(v.players[o].concealed).toEqual(s.players[o].concealed)
      expect(v.wall.every(isHidden)).toBe(true)
    }
  })

  it('keeps the drawn tile only for the player on turn', () => {
    const s = newGame({ minimumFaan: 0, rounds: 1 }, 5)
    expect(viewFor(s, 0).drawn).toBe(s.drawn)
    expect(viewFor(s, 1).drawn).toBeNull()
  })

  it('leaves out the other seats’ claim options', () => {
    let s = newGame({ minimumFaan: 0, rounds: 1 }, 11)
    let guard = 0
    while (s.phase !== 'claim' && guard++ < 500) {
      if (s.phase === 'discard') s = reduce(s, aiTurn(s, s.current))
      else if (s.phase === 'handEnd') s = reduce(s, { type: 'nextHand' })
      else break
    }
    expect(s.phase).toBe('claim')
    const offered = Object.keys(s.claim!.options).map(Number)
    expect(offered.length).toBeGreaterThan(0)
    for (const seat of SEATS) {
      const v = viewFor(s, seat)
      expect(Object.keys(v.claim!.options).every((k) => Number(k) === seat)).toBe(true)
      if (offered.includes(seat)) expect(v.claim!.options[seat]).toEqual(s.claim!.options[seat])
      else expect(v.claim!.options[seat]).toBeUndefined()
      expect(v.claim!.tile).toBe(s.claim!.tile)
    }
  })

  it('still answers the questions a seat may ask', () => {
    const s = newGame({ minimumFaan: 0, rounds: 1 }, 5)
    const v = viewFor(s, 0)
    expect(canSelfWin(v, 0)).toEqual(canSelfWin(s, 0))
    expect(kongOptions(v, 0)).toEqual(kongOptions(s, 0))
  })

  it('uses a placeholder that is not a tile', () => {
    expect(isHidden(HIDDEN)).toBe(true)
    expect(isHidden('WE')).toBe(false)
  })
})
