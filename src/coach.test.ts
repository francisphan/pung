import { describe, expect, it } from 'vitest'
import { gameOverNote, guide, resultNote, TUTORIAL_RULES, TUTORIAL_SEED } from './coach'
import { aiClaim, aiTurn } from './engine/ai'
import { newGame, reduce, type Decision, type GameState, type Seat } from './engine/game'
import { LESSONS, openLesson } from './lessons'
import { SOLO } from './names'

const ME = SOLO.me

/** Everyone, you included, follows the coach. Stops at the first state the predicate accepts. */
function playUntil(s: GameState, stop: (s: GameState) => boolean, limit = 4000): GameState {
  for (let i = 0; i < limit && !stop(s); i++) {
    if (s.phase === 'discard') s = reduce(s, aiTurn(s, s.current))
    else if (s.phase === 'claim' && s.claim) {
      const decisions: Partial<Record<Seat, Decision>> = {}
      for (const seat of [0, 1, 2, 3] as Seat[]) {
        const opts = s.claim.options[seat]
        if (opts && !s.claim.decisions[seat]) decisions[seat] = aiClaim(s, seat, opts)
      }
      s = reduce(s, { type: 'decide', decisions })
    } else if (s.phase === 'handEnd') s = reduce(s, { type: 'nextHand' })
    else break
  }
  return s
}

describe('guide', () => {
  it('points at a tile to throw on your turn and says why', () => {
    const s = newGame(TUTORIAL_RULES, TUTORIAL_SEED)
    const g = guide(s, ME, SOLO)!
    expect(g.action.type).toBe('discard')
    expect(g.tile).not.toBeNull()
    expect(s.players[ME].concealed).toContain(g.tile)
    expect(g.text).toMatch(/^Throw the /)
    expect(g.text).toMatch(/Tap it to pick it up/)
  })
  it('says nothing when it is not your move', () => {
    let s = newGame(TUTORIAL_RULES, TUTORIAL_SEED)
    s = reduce(s, aiTurn(s, ME))
    const waiting = playUntil(s, (x) => x.phase === 'discard' && x.current !== ME)
    expect(guide(waiting, ME, SOLO)).toBeNull()
  })
  it('names the claim button to tap, or pass with a reason', () => {
    let seen = 0
    for (let seed = 1; seed <= 40 && seen < 3; seed++) {
      const s = playUntil(newGame(TUTORIAL_RULES, seed), (x) => !!x.claim?.options[ME] && !x.claim.decisions[ME])
      if (!s.claim) continue
      seen++
      const g = guide(s, ME, SOLO)!
      expect(g.action.type).toBe('decide')
      expect(g.decision).not.toBeNull()
      expect(g.tile).toBeNull()
      expect(g.text).toMatch(/Tap (Win|Pung|Kong|Chow|Pass)/)
    }
    expect(seen).toBe(3)
  })
})

describe('lessons', () => {
  it('opens with the welcome, once', () => {
    const s = newGame(TUTORIAL_RULES, TUTORIAL_SEED)
    expect(openLesson(s, ME, [])?.id).toBe('welcome')
    expect(openLesson(s, ME, ['welcome'])).toBeNull()
    const body = LESSONS[0].body(s, ME, SOLO)
    expect(body.join(' ')).toMatch(/Mei, Bo and Ling/)
  })
  it('explains the first claim and the win', () => {
    const claim = playUntil(newGame(TUTORIAL_RULES, TUTORIAL_SEED), (x) => openLesson(x, ME, ['welcome'])?.id === 'claim')
    const lesson = openLesson(claim, ME, ['welcome'])!
    expect(lesson.body(claim, ME, SOLO).join(' ')).toMatch(/Pung takes a discard/)
    const win = playUntil(claim, (x) => openLesson(x, ME, ['welcome', 'claim'])?.id === 'win')
    const l2 = openLesson(win, ME, ['welcome', 'claim'])!
    expect(l2.body(win, ME, SOLO)[0]).toMatch(/Your hand is complete/)
  })
})

describe('notes', () => {
  it('reads the result and says who deals next', () => {
    const end = playUntil(newGame(TUTORIAL_RULES, TUTORIAL_SEED), (x) => x.phase === 'handEnd')
    const note = resultNote(end, ME, SOLO)
    expect(note).toMatch(/faan|wall ran out/)
    expect(note).toMatch(/deal passes|keep(s)? the deal|last hand/)
    expect(gameOverNote()).toMatch(/good-looking hands score more/)
  })
})
