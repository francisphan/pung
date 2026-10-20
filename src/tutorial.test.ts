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
 * change the AI, the rules or the seed and it must still teach the same things.
 */
describe('the guided round', () => {
  let s: GameState = newGame(TUTORIAL_RULES, TUTORIAL_SEED)
  const lessons: string[] = []
  const claimsInFirstHand: string[] = []
  const claims: string[] = []
  const results: string[] = []
  let kongs = 0
  let steps = 0
  let shapeLesson: string[] = []
  while (s.phase !== 'gameEnd' && steps++ < 4000) {
    const lesson = openLesson(s, ME, lessons)
    if (lesson) {
      lessons.push(lesson.id)
      if (lesson.id === 'shape') shapeLesson = lesson.body(s, ME, SOLO)
    }
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
      if (decisions[ME]) {
        claims.push(decisions[ME].kind)
        if (s.handIndex === 0) claimsInFirstHand.push(decisions[ME].kind)
      }
      s = reduce(s, { type: 'decide', decisions })
    } else if (s.phase === 'handEnd') {
      const r = s.result!
      results.push(r.kind === 'win' ? `${r.winner}:${r.from === null ? 'self' : 'discard'}` : 'draw')
      s = reduce(s, { type: 'nextHand' })
    }
  }

  it('teaches the lessons in order', () => {
    expect(lessons).toEqual(['welcome', 'shape', 'claim', 'win', 'newHand'])
  })
  it('shows the rule of thumb on a hand with dragon pairs, then has you pung them and win', () => {
    expect(shapeLesson.join(' ')).toMatch(/two of the red dragon and two of the green dragon/)
    expect(claimsInFirstHand.filter((c) => c === 'pung')).toHaveLength(2)
    expect(claimsInFirstHand).toContain('pass')
    expect(results[0]).toBe(`${ME}:discard`)
  })
  it('has you chow later in the round', () => {
    expect(claims).toContain('chow')
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
