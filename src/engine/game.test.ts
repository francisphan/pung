import { describe, expect, it } from 'vitest'
import { aiDecisions, aiTurn } from './ai'
import {
  canSelfWin,
  dealerOf,
  kongOptions,
  newGame,
  prevailingOf,
  reduce,
  seatWind,
  tileCount,
  type GameState,
  type Seat,
} from './game'
import { FULL_SET, parseTiles, type BonusId, type StandardId, type TileId } from './tiles'

const ids = (s: string) => parseTiles(s) as StandardId[]

/**
 * Replace every rack with the given tiles (seat 0 holds 14 and is on turn) and
 * rebuild the wall from whatever is left, so the table stays consistent.
 */
function rig(
  base: GameState,
  hands: string[],
  extra: { flowers?: BonusId[][]; melds?: GameState['players'][number]['melds'][] } = {},
): GameState {
  const s = structuredClone(base)
  const used: TileId[] = []
  hands.forEach((h, i) => {
    const p = s.players[i]
    p.concealed = ids(h)
    p.flowers = extra.flowers?.[i] ?? []
    p.melds = extra.melds?.[i] ?? []
    p.discards = []
    used.push(...p.concealed, ...p.flowers, ...p.melds.flatMap((m) => m.tiles))
  })
  const remaining = [...FULL_SET]
  for (const t of used) {
    const i = remaining.indexOf(t)
    if (i === -1) throw new Error(`rigged hands use too many ${t}`)
    remaining.splice(i, 1)
  }
  s.wall = remaining
  s.drawn = s.players[0].concealed[s.players[0].concealed.length - 1]
  s.current = 0
  s.phase = 'discard'
  s.discardCount = 5
  return s
}

function checkInvariants(s: GameState) {
  expect(tileCount(s)).toBe(144)
  for (const seat of [0, 1, 2, 3] as Seat[]) {
    const p = s.players[seat]
    const n = p.concealed.length + p.melds.length * 3
    if (s.phase === 'discard' && s.current === seat) expect(n).toBe(14)
    else if (s.phase === 'claim' && s.claim?.source === 'kong' && s.claim.from === seat) expect(n).toBe(13)
    else if (s.phase !== 'handEnd' && s.phase !== 'gameEnd') expect(n).toBe(13)
    for (const t of p.concealed) expect(t.startsWith('F') || t.startsWith('S')).toBe(false)
  }
}

/** Four AIs play until the game ends. */
function playOut(s: GameState, maxSteps = 20000): GameState {
  let steps = 0
  while (s.phase !== 'gameEnd' && steps++ < maxSteps) {
    checkInvariants(s)
    if (s.phase === 'discard') s = reduce(s, aiTurn(s, s.current))
    else if (s.phase === 'claim') s = reduce(s, { type: 'decide', decisions: aiDecisions(s, 9 as Seat) })
    else if (s.phase === 'handEnd') s = reduce(s, { type: 'nextHand' })
  }
  expect(s.phase).toBe('gameEnd')
  return s
}

describe('newGame', () => {
  it('deals 13 tiles to each player and 14 to the dealer, flowers set aside', () => {
    const s = newGame({ minimumFaan: 3, rounds: 4 }, 7)
    expect(dealerOf(s)).toBe(0)
    expect(prevailingOf(s)).toBe('east')
    expect(seatWind(s, 0)).toBe('east')
    expect(seatWind(s, 1)).toBe('south')
    expect(seatWind(s, 3)).toBe('north')
    expect(s.players[0].concealed).toHaveLength(14)
    for (const seat of [1, 2, 3]) expect(s.players[seat].concealed).toHaveLength(13)
    expect(s.phase).toBe('discard')
    expect(s.current).toBe(0)
    expect(s.drawn).not.toBeNull()
    checkInvariants(s)
  })
  it('is deterministic for a seed', () => {
    const a = newGame({ minimumFaan: 3, rounds: 4 }, 42)
    const b = newGame({ minimumFaan: 3, rounds: 4 }, 42)
    expect(a).toEqual(b)
    const c = newGame({ minimumFaan: 3, rounds: 4 }, 43)
    expect(c.players[0].concealed).not.toEqual(a.players[0].concealed)
  })
})

describe('discard and claims', () => {
  it('rejects a discard out of turn or of a tile not held', () => {
    const s = newGame(undefined, 1)
    expect(() => reduce(s, { type: 'discard', seat: 1, tile: s.players[1].concealed[0] })).toThrow()
    const notHeld = ids('C1 C2 C3 C4 C5 C6 C7 C8 C9 D1 D2 D3 D4 D5 D6 D7 D8 D9 B1 B2 B3 B4 B5 B6 B7 B8 B9 WE WS WW WN RD GD WD').find(
      (t) => !s.players[0].concealed.includes(t),
    )!
    expect(() => reduce(s, { type: 'discard', seat: 0, tile: notHeld })).toThrow()
  })
  it('moves a discard to the river and passes the turn when nobody claims', () => {
    const s = rig(newGame(undefined, 1), [
      'C1 C2 C3 C4 C5 C6 C7 C8 C9 D1 D2 D3 D4 WD',
      'B1 B2 B3 B4 B5 B6 B7 B8 B9 D7 D8 WE WS',
      'B1 B2 B3 B4 B5 B6 B7 B8 B9 D7 D8 WW WN',
      'B1 B2 B3 B4 B5 B6 B7 B8 B9 D9 D9 RD GD',
    ])
    const after = reduce(s, { type: 'discard', seat: 0, tile: 'WD' })
    expect(after.players[0].discards).toEqual(['WD'])
    expect(after.lastDiscard).toEqual({ seat: 0, tile: 'WD' })
    expect(after.phase).toBe('discard')
    expect(after.current).toBe(1)
    expect(after.players[1].concealed).toHaveLength(14)
    expect(after.drawn).not.toBeNull()
  })
  it('opens a claim window and resolves a pung', () => {
    let s = rig(newGame(undefined, 1), [
      'C1 C2 C3 C4 C5 C6 C7 C8 C9 D1 D2 D3 D4 WD',
      'B1 B2 B3 B4 B5 B6 B7 B8 B9 D7 D8 WE WS',
      'B1 B2 B3 B4 B5 B6 B7 B8 B9 D7 D8 WD WD',
      'B1 B2 B3 B4 B5 B6 B7 B8 B9 D7 D8 WE WS',
    ])
    s = reduce(s, { type: 'discard', seat: 0, tile: 'WD' })
    expect(s.phase).toBe('claim')
    expect(s.claim?.options[2]).toEqual([{ kind: 'pung' }])
    expect(s.claim?.options[1]).toBeUndefined()
    s = reduce(s, { type: 'decide', decisions: { 2: { kind: 'pung' } } })
    expect(s.phase).toBe('discard')
    expect(s.current).toBe(2)
    expect(s.players[2].melds).toEqual([{ kind: 'pung', tiles: ['WD', 'WD', 'WD'], open: true, from: 0, claimed: 'WD' }])
    expect(s.players[2].concealed).toHaveLength(11)
    expect(s.players[0].discards).toEqual([])
    expect(s.drawn).toBeNull()
  })
  it('offers chows only to the next seat and lists each shape', () => {
    let s = rig(newGame(undefined, 1), [
      'C1 C2 C3 C4 C5 C6 C7 C8 C9 D1 D2 D3 D4 B5',
      'B3 B4 B6 B7 C1 C1 D7 D8 D9 WE WS WW WN',
      'B3 B4 B6 B7 C2 C2 D7 D8 D9 WE WS WW WN',
      'C3 C3 B1 B1 B1 D5 D5 D6 D6 RD GD WD WE',
    ])
    s = reduce(s, { type: 'discard', seat: 0, tile: 'B5' })
    expect(s.claim?.options[1]).toEqual([
      { kind: 'chow', tiles: ['B3', 'B4'] },
      { kind: 'chow', tiles: ['B4', 'B6'] },
      { kind: 'chow', tiles: ['B6', 'B7'] },
    ])
    expect(s.claim?.options[2]).toBeUndefined()
    s = reduce(s, { type: 'decide', decisions: { 1: { kind: 'chow', tiles: ['B4', 'B6'] } } })
    expect(s.players[1].melds[0]).toMatchObject({ kind: 'chow', tiles: ['B4', 'B5', 'B6'], open: true })
  })
  it('gives a win priority over a pung, and the pung over a chow', () => {
    let s = rig(newGame(undefined, 1), [
      'C1 C2 C3 C4 C5 C6 C7 C8 C9 D1 D2 D3 D4 B5',
      'B3 B4 B6 B7 C2 C2 D7 D8 D9 WS WW WN GD', // chow
      'B5 B5 C3 C3 D7 D8 D9 WS WW WN RD GD WD', // pung
      'B3 B4 C1 C1 C1 D4 D5 D6 WE WE WE RD RD', // win: prevailing wind, concealed, no flowers
    ])
    s = reduce(s, { type: 'discard', seat: 0, tile: 'B5' })
    expect(Object.keys(s.claim!.options).sort()).toEqual(['1', '2', '3'])
    expect(s.claim!.options[3]).toEqual([{ kind: 'win' }])
    s = reduce(s, {
      type: 'decide',
      decisions: { 1: { kind: 'chow', tiles: ['B3', 'B4'] }, 2: { kind: 'pung' }, 3: { kind: 'pass' } },
    })
    expect(s.current).toBe(2)
    expect(s.players[2].melds[0].kind).toBe('pung')
  })
  it('the win wins over pung and chow', () => {
    let s = rig(newGame(undefined, 1), [
      'C1 C2 C3 C4 C5 C6 C7 C8 C9 D1 D2 D3 D4 B5',
      'B3 B4 B6 B7 C2 C2 D7 D8 D9 WS WW WN GD',
      'B5 B5 C3 C3 D7 D8 D9 WS WW WN RD GD WD',
      'B3 B4 C1 C1 C1 D4 D5 D6 WE WE WE RD RD',
    ])
    s = reduce(s, { type: 'discard', seat: 0, tile: 'B5' })
    s = reduce(s, {
      type: 'decide',
      decisions: { 1: { kind: 'chow', tiles: ['B3', 'B4'] }, 2: { kind: 'pung' }, 3: { kind: 'win' } },
    })
    expect(s.phase).toBe('handEnd')
    if (s.result?.kind !== 'win') throw new Error()
    expect(s.result.winner).toBe(3)
    expect(s.result.score.patterns.map((p) => p.id)).toEqual(['prevailingWindPung', 'concealed', 'noFlowers'])
    checkInvariants(s)
  })
  it('lets a player win on a discard and settles points', () => {
    let s = rig(
      newGame({ minimumFaan: 1, rounds: 4 }, 1),
      [
        'C1 C2 C3 C4 C5 C6 C7 C8 C9 D1 D2 D3 D4 B5',
        'B1 B1 B1 B2 B2 B2 B9 B9 B9 WE WS WW WN',
        'B3 B4 C1 C2 C3 D4 D5 D6 D7 D8 D9 RD RD', // dragon pair stops all chows; concealed only
        'GD GD GD WD WD WD C7 C7 C7 D1 D1 D2 D2',
      ],
      { flowers: [[], [], ['F1'], []] },
    )
    s = reduce(s, { type: 'discard', seat: 0, tile: 'B5' })
    expect(s.claim?.options[2]).toEqual([{ kind: 'win' }])
    s = reduce(s, { type: 'decide', decisions: { 2: { kind: 'win' } } })
    expect(s.phase).toBe('handEnd')
    expect(s.result?.kind).toBe('win')
    if (s.result?.kind !== 'win') throw new Error()
    expect(s.result.winner).toBe(2)
    expect(s.result.from).toBe(0)
    expect(s.result.score.total).toBe(1) // pair of RD stops all chows; concealed only (F1 is not South's flower)
    expect(s.result.points).toBe(2)
    expect(s.result.deltas).toEqual([-2, -1, 4, -1])
    expect(s.players.map((p) => p.score)).toEqual([-2, -1, 4, -1])
    expect(s.players[0].discards).toEqual([])
    checkInvariants(s)
  })
  it('refuses a win below the minimum', () => {
    let s = rig(
      newGame({ minimumFaan: 3, rounds: 4 }, 1),
      [
        'C1 C2 C3 C4 C5 C6 C7 C8 C9 D1 D2 D3 D4 B5',
        'B1 B1 B1 B2 B2 B2 B9 B9 B9 WE WS WW WN',
        'B3 B4 C1 C2 C3 D4 D5 D6 D7 D8 D9 RD RD',
        'GD GD GD WD WD WD C7 C7 C7 D1 D1 D2 D2',
      ],
      { flowers: [[], [], ['F1'], []] },
    )
    s = reduce(s, { type: 'discard', seat: 0, tile: 'B5' })
    expect(s.phase).toBe('discard')
    expect(s.current).toBe(1)
  })
})

describe('self-draw and kongs', () => {
  it('declares a self-drawn win with the right flags', () => {
    let s = rig(newGame({ minimumFaan: 1, rounds: 4 }, 1), [
      'B3 B4 B5 C1 C2 C3 D4 D5 D6 D7 D8 D9 B2 B2',
      'B1 B1 B1 B6 B6 B6 B9 B9 B9 WE WS WW WN',
      'C4 C4 C4 C5 C5 C5 C7 C7 C7 D1 D1 D2 D2',
      'GD GD GD WD WD WD C8 C8 C8 D3 D3 RD RD',
    ])
    s.discardCount = 0
    expect(canSelfWin(s, 0)?.patterns.map((p) => p.id)).toEqual(['heavenly', 'allChows', 'selfDrawn', 'concealed', 'noFlowers'])
    s = reduce(s, { type: 'selfWin', seat: 0 })
    expect(s.phase).toBe('handEnd')
    if (s.result?.kind !== 'win') throw new Error()
    expect(s.result.points).toBe(384)
    expect(s.result.deltas).toEqual([1152, -384, -384, -384])
  })
  it('declares a concealed kong and draws a replacement from the back', () => {
    let s = rig(newGame(undefined, 1), [
      'B3 B4 B5 C1 C2 C3 D4 D5 D6 D7 WE WE WE WE',
      'B1 B1 B1 B6 B6 B6 B9 B9 B9 WS WS WW WN',
      'C4 C4 C4 C5 C5 C5 C7 C7 C7 D1 D1 D2 D2',
      'GD GD GD WD WD WD C8 C8 C8 D3 D3 RD RD',
    ])
    expect(kongOptions(s, 0)).toEqual([{ tile: 'WE', kind: 'concealed' }])
    const back = s.wall[s.wall.length - 1]
    s = reduce(s, { type: 'kong', seat: 0, tile: 'WE' })
    expect(s.players[0].melds).toEqual([{ kind: 'kong', tiles: ['WE', 'WE', 'WE', 'WE'], open: false }])
    expect(s.players[0].concealed).toHaveLength(11)
    expect(s.afterKong).toBe(true)
    expect(s.phase).toBe('discard')
    if (back.startsWith('F') || back.startsWith('S')) expect(s.players[0].flowers).toContain(back)
    else expect(s.drawn).toBe(back)
    checkInvariants(s)
  })
  it('adds to an open pung, which can be robbed for a win', () => {
    let s = rig(
      newGame({ minimumFaan: 1, rounds: 4 }, 1),
      [
        'B3 B4 B5 C1 C2 C3 D4 D5 D6 WE D7',
        'B1 B1 B1 B6 B6 B6 B9 B9 B9 WS WS WW WN',
        'B3 B4 B5 C1 C2 C3 D4 D5 D6 GD GD WW WS', // not a win on D7
        'B3 B4 B5 C1 C2 C3 D8 D9 WE WE WE RD RD', // D7 completes the chow
      ],
      { melds: [[{ kind: 'pung', tiles: ['D7', 'D7', 'D7'], open: true, from: 1, claimed: 'D7' }], [], [], []] },
    )
    expect(kongOptions(s, 0)).toEqual([{ tile: 'D7', kind: 'added' }])
    s = reduce(s, { type: 'kong', seat: 0, tile: 'D7' })
    expect(s.phase).toBe('claim')
    expect(s.claim?.source).toBe('kong')
    expect(s.claim?.options[3]).toEqual([{ kind: 'win' }])
    checkInvariants(s)
    s = reduce(s, { type: 'decide', decisions: { 3: { kind: 'win' } } })
    if (s.result?.kind !== 'win') throw new Error()
    expect(s.result.winner).toBe(3)
    expect(s.result.score.patterns.map((p) => p.id)).toContain('robbingKong')
    expect(s.players[0].melds[0].kind).toBe('pung')
    checkInvariants(s)
  })
  it('completes the added kong when nobody robs it', () => {
    let s = rig(
      newGame(undefined, 1),
      [
        'B3 B4 B5 C1 C2 C3 D4 D5 D6 WE D7',
        'B1 B1 B1 B6 B6 B6 B9 B9 B9 WS WS WW WN',
        'C4 C4 C4 C5 C5 C5 C7 C7 C7 D1 D1 D2 D2',
        'GD GD GD WD WD WD C8 C8 C8 D3 D3 WE WE',
      ],
      { melds: [[{ kind: 'pung', tiles: ['D7', 'D7', 'D7'], open: true, from: 1, claimed: 'D7' }], [], [], []] },
    )
    s = reduce(s, { type: 'kong', seat: 0, tile: 'D7' })
    expect(s.phase).toBe('discard')
    expect(s.current).toBe(0)
    expect(s.players[0].melds[0]).toMatchObject({ kind: 'kong', tiles: ['D7', 'D7', 'D7', 'D7'] })
    expect(s.afterKong).toBe(true)
    checkInvariants(s)
  })
})

describe('rounds', () => {
  it('rotates the dealer after a non-dealer win and keeps them after a draw', () => {
    let s = structuredClone(newGame({ minimumFaan: 1, rounds: 1 }, 1))
    s.result = { kind: 'draw', deltas: [0, 0, 0, 0] }
    s.phase = 'handEnd'
    s = reduce(s, { type: 'nextHand' })
    expect(dealerOf(s)).toBe(0)
    expect(s.handIndex).toBe(1)
    s = structuredClone(s)
    s.phase = 'handEnd'
    s.result = {
      kind: 'win',
      winner: 2,
      from: null,
      score: { patterns: [], total: 1, limit: false },
      points: 2,
      deltas: [-2, -2, 6, -2],
      hand: { concealed: [], melds: [] },
      winningTile: 'C1',
      flowers: [],
    }
    s = reduce(s, { type: 'nextHand' })
    expect(dealerOf(s)).toBe(1)
    expect(seatWind(s, 1)).toBe('east')
    expect(seatWind(s, 0)).toBe('north')
  })
})

describe('full games between four AIs', () => {
  it('play to the end without breaking any invariant', { timeout: 60000 }, () => {
    const outcomes = { wins: 0, draws: 0, hands: 0 }
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      let s = newGame({ minimumFaan: 3, rounds: 1 }, seed)
      let guard = 0
      while (s.phase !== 'gameEnd' && guard++ < 5000) {
        checkInvariants(s)
        if (s.phase === 'discard') s = reduce(s, aiTurn(s, s.current))
        else if (s.phase === 'claim') s = reduce(s, { type: 'decide', decisions: aiDecisions(s, 9 as Seat) })
        else if (s.phase === 'handEnd') {
          outcomes.hands++
          if (s.result?.kind === 'win') outcomes.wins++
          else outcomes.draws++
          s = reduce(s, { type: 'nextHand' })
        }
      }
      expect(s.phase).toBe('gameEnd')
      expect(s.players.reduce((a, p) => a + p.score, 0)).toBe(0)
    }
    expect(outcomes.hands).toBeGreaterThanOrEqual(24)
    // The AI should actually win hands, not just run the wall down.
    expect(outcomes.wins).toBeGreaterThan(0)
    console.log('AI outcomes', outcomes)
  })
  it('finishes a full four-round game', { timeout: 60000 }, () => {
    const s = playOut(newGame({ minimumFaan: 3, rounds: 4 }, 99))
    expect(s.dealerIndex).toBe(16)
  })
})
