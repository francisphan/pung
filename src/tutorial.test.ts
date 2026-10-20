import { describe, expect, it } from 'vitest'
import { TUTORIAL_RULES, TUTORIAL_SEED, guide } from './coach'
import { aiClaim, aiTurn } from './engine/ai'
import { newGame, reduce, type Decision, type GameState, type Seat } from './engine/game'
import { openLesson } from './lessons'
import { SOLO } from './names'

const ME = SOLO.me

/**
 * The guided round is a fixed deal that everyone, you included, plays by the
 * coach's advice, so it always tells the same story. This pins that story:
 * change the AI or the seed and it must still teach the same things.
 */
describe('the guided round', () => {
  let s: GameState = newGame(TUTORIAL_RULES, TUTORIAL_SEED)
  const lessons: string[] = []
  const claimsInFirstHand: string[] = []
  const results: string[] = []
  let kongs = 0
  let steps = 0
  while (s.phase !== 'gameEnd' && steps++ < 4000) {
    const lesson = openLesson(s, ME, lessons)
    if (lesson) lessons.push(lesson.id)
    if (s.phase === 'discard') {
      if (s.current === ME) {
        const g = guide(s, ME, SOLO)!
        expect(g.action).toEqual(aiTurn(s, ME))
        if (g.action.type === 'kong') kongs++
      }
      s = reduce(s, aiTurn(s, s.current))
    } else if (s.phase === 'claim' && s.claim) {
      const decisions: Partial<Record<Seat, Decision>> = {}
      for (const seat of [0, 1, 2, 3] as Seat[]) {
        const opts = s.claim.options[seat]
        if (opts && !s.claim.decisions[seat]) decisions[seat] = aiClaim(s, seat, opts)
      }
      if (decisions[ME] && s.handIndex === 0) claimsInFirstHand.push(decisions[ME].kind)
      s = reduce(s, { type: 'decide', decisions })
    } else if (s.phase === 'handEnd') {
      const r = s.result!
      results.push(r.kind === 'win' ? `${r.winner}:${r.from === null ? 'self' : 'discard'}` : 'draw')
      s = reduce(s, { type: 'nextHand' })
    }
  }

  it('teaches the lessons in order', () => {
    expect(lessons).toEqual(['welcome', 'claim', 'win', 'newHand'])
  })
  it('has you pass, pung and chow in the first hand, then win it yourself', () => {
    expect(claimsInFirstHand).toContain('pass')
    expect(claimsInFirstHand).toContain('pung')
    expect(claimsInFirstHand).toContain('chow')
    expect(results[0]).toBe(`${ME}:self`)
  })
  it('lets an opponent win a hand and shows a kong', () => {
    expect(results.some((r) => r !== 'draw' && !r.startsWith(`${ME}:`))).toBe(true)
    expect(kongs).toBeGreaterThan(0)
  })
  it('ends within six hands with you in front', () => {
    expect(s.phase).toBe('gameEnd')
    expect(results.length).toBeLessThanOrEqual(6)
    expect(Math.max(...s.players.map((p) => p.score))).toBe(s.players[ME].score)
  })
})
