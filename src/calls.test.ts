import { describe, expect, it } from 'vitest'
import { callOf, logMark } from './calls'
import { newGame } from './engine/game'
import { botStep, playUntil } from './test/play'

describe('calls', () => {
  it('has nothing to call at the deal', () => {
    expect(callOf(newGame({ minimumFaan: 0, rounds: 1 }, 3))).toBeNull()
  })

  it('names the seat, the tile and the new set after a pung', () => {
    const { before, after } = playUntil(3, (s) => s.log[s.log.length - 1]?.kind === 'pung')
    const e = after.log[after.log.length - 1]
    if (e.kind !== 'pung') throw new Error('not a pung')
    const call = callOf(after)
    expect(call).toMatchObject({ seat: e.seat, kind: 'pung', tile: e.tile, own: false, meld: after.players[e.seat].melds.length - 1 })
    expect(logMark(after)).not.toBe(logMark(before))
  })

  it('is over once the claimer discards', () => {
    const { after } = playUntil(3, (s) => s.log[s.log.length - 1]?.kind === 'pung')
    expect(callOf(botStep(after))).toBeNull()
  })

  it('still calls a kong when the replacement draw brought flowers', () => {
    const s = newGame({ minimumFaan: 0, rounds: 1 }, 3)
    s.players[1].melds.push({ kind: 'kong', tiles: ['C1', 'C1', 'C1', 'C1'], open: true, from: 0, claimed: 'C1' })
    s.log.push({ kind: 'discard', seat: 0, tile: 'C1' }, { kind: 'kong', seat: 1, tile: 'C1', from: 0 }, { kind: 'flower', seat: 1, tile: 'F1' })
    expect(callOf(s)).toMatchObject({ seat: 1, kind: 'kong', tile: 'C1', own: false, meld: 0 })
  })

  it('points an added kong at the pung it grew from', () => {
    const s = newGame({ minimumFaan: 0, rounds: 1 }, 3)
    s.players[2].melds.push(
      { kind: 'pung', tiles: ['B2', 'B2', 'B2'], open: true, from: 1, claimed: 'B2' },
      { kind: 'kong', tiles: ['D5', 'D5', 'D5', 'D5'], open: true, from: 3, claimed: 'D5' },
    )
    s.log.push({ kind: 'addedKong', seat: 2, tile: 'D5' })
    expect(callOf(s)).toMatchObject({ seat: 2, kind: 'kong', tile: 'D5', own: true, meld: 1 })
    s.log.push({ kind: 'concealedKong', seat: 2, tile: 'WE' })
    s.players[2].melds.push({ kind: 'kong', tiles: ['WE', 'WE', 'WE', 'WE'], open: false })
    expect(callOf(s)).toMatchObject({ kind: 'kong', own: true, meld: 2 })
  })

  it('calls a win, and a self-drawn one as its own', () => {
    const { after } = playUntil(3, (s) => s.phase === 'handEnd' && s.result?.kind === 'win')
    const r = after.result
    if (r?.kind !== 'win') throw new Error('not a win')
    expect(callOf(after)).toMatchObject({ seat: r.winner, kind: 'win', tile: r.winningTile, own: r.from === null, meld: null })
    const s = newGame({ minimumFaan: 0, rounds: 1 }, 3)
    s.log.push({ kind: 'win', seat: 0, from: null, tile: 'C1', faan: 1, points: 2 })
    expect(callOf(s)).toMatchObject({ kind: 'win', own: true })
  })
})
