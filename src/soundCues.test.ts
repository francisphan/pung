import { describe, expect, it } from 'vitest'
import { newGame, reduce } from './engine/game'
import { aiDecisions, aiTurn } from './engine/ai'
import { cuesFor, markOf } from './soundCues'

describe('sound cues', () => {
  it('stays quiet on first load and resume', () => {
    const s = newGame({ minimumFaan: 0, rounds: 1 }, 3)
    expect(cuesFor(null, s)).toEqual([])
  })
  it('clacks on a discard and slides when it is your draw again', () => {
    let s = newGame({ minimumFaan: 0, rounds: 1 }, 3)
    const prev = markOf(s)
    s = reduce(s, { type: 'discard', seat: 0, tile: s.players[0].concealed[0] })
    const cues = cuesFor(prev, s).map((c) => c.cue)
    expect(cues[0]).toBe('discard')
    // Play on until it is our turn to draw, then expect a slide.
    let m = markOf(s)
    let guard = 0
    while (!(s.phase === 'discard' && s.current === 0) && guard++ < 50) {
      m = markOf(s)
      if (s.phase === 'discard') s = reduce(s, aiTurn(s, s.current))
      else if (s.phase === 'claim') s = reduce(s, { type: 'decide', decisions: aiDecisions(s, 0) })
      else break
    }
    if (s.phase === 'discard' && s.current === 0) {
      const last = cuesFor(m, s)
      expect(last[last.length - 1].cue).toBe('draw')
    }
  })
  it('staggers several events from one step', () => {
    const s = newGame({ minimumFaan: 0, rounds: 1 }, 3)
    const t = structuredClone(s)
    t.current = 2
    t.drawn = null
    t.log.push({ kind: 'discard', seat: 1, tile: 'C1' }, { kind: 'pung', seat: 2, tile: 'C1', from: 1 })
    const cues = cuesFor(markOf(s), t)
    expect(cues.map((c) => c.cue)).toEqual(['discard', 'shout', 'claim'])
    expect(cues[1].at).toBeGreaterThan(cues[0].at)
    // The tiles clack down after the sting.
    expect(cues[2].at).toBeGreaterThan(cues[1].at)
  })
  it('slams twice for a kong and sounds the alert for a win, with the pieces after', () => {
    const s = newGame({ minimumFaan: 0, rounds: 1 }, 3)
    const t = structuredClone(s)
    t.current = 1
    t.drawn = null
    t.log.push({ kind: 'concealedKong', seat: 1, tile: 'C1' }, { kind: 'flower', seat: 1, tile: 'F1' })
    expect(cuesFor(markOf(s), t).map((c) => c.cue)).toEqual(['shoutKong', 'kong', 'flower'])
    const w = structuredClone(s)
    w.drawn = null
    w.log.push({ kind: 'win', seat: 1, from: null, tile: 'C1', faan: 3, points: 8 })
    const cues = cuesFor(markOf(s), w)
    expect(cues.map((c) => c.cue)).toEqual(['alert', 'win'])
    expect(cues[1].at).toBeGreaterThan(cues[0].at)
  })
  it('washes the tiles on a new hand', () => {
    const s = newGame({ minimumFaan: 0, rounds: 1 }, 3)
    const t = structuredClone(s)
    t.handIndex = 1
    expect(cuesFor(markOf(s), t)).toEqual([{ cue: 'deal', at: 0 }])
  })
})
