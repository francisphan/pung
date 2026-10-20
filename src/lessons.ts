/**
 * The short lessons of a guided round. Each appears once, the first time
 * the table reaches the moment it explains, and the opponents wait while
 * it is open.
 */
import { canSelfWin, dealerOf, prevailingOf, seatWind, winOn, type GameState, type Seat } from './engine/game'
import { PATTERN_BY_ID } from './engine/scoring'
import { tileName } from './engine/tiles'
import { WIND_NAME, nameOf, type Seating } from './names'

export interface Lesson {
  id: string
  title: string
  when(s: GameState, me: Seat): boolean
  body(s: GameState, me: Seat, seating: Seating): string[]
}

const myClaim = (s: GameState, me: Seat) => (s.phase === 'claim' && s.claim && s.claim.options[me] && !s.claim.decisions[me] ? s.claim : null)

export const LESSONS: readonly Lesson[] = [
  {
    id: 'welcome',
    title: 'Welcome to the table',
    when: (s, me) => s.handIndex === 0 && s.phase === 'discard' && s.current === me && s.discardCount === 0,
    body: (s, me, seating) => {
      const right = nameOf(seating, ((me + 1) % 4) as Seat)
      const others = [1, 2, 3].map((k) => nameOf(seating, ((me + k) % 4) as Seat))
      const out = [
        `You sit at the bottom of the table as East, and you deal the first hand. ${others[0]}, ${others[1]} and ${others[2]} sit around you. Play goes to the right, so ${right} moves after you.`,
        'Everyone holds thirteen tiles; as dealer you start with fourteen. On your turn you draw one tile from the wall and throw one away. The goal is a complete hand: four sets, each a chow (three in a row from one suit) or a pung (three of a kind), and one pair.',
        'A win must be worth at least three faan, so a complete hand is not always enough: the coach steers you toward tiles that score. Each turn, one tile on your rack glows. Tap it to pick it up, then tap it again to throw it. The line above your rack says why.',
      ]
      if (s.players[me].flowers.length > 0)
        out.push(
          'The flower tiles beside your rack were dealt to you and replaced from the wall. They never join the hand, and each one is worth a faan if you win.',
        )
      return out
    },
  },
  {
    id: 'claim',
    title: 'Taking a discard',
    when: (s, me) => {
      const w = myClaim(s, me)
      return !!w && w.source === 'discard' && !w.options[me]!.some((o) => o.kind === 'win')
    },
    body: (s, me, seating) => {
      const w = s.claim!
      const left = nameOf(seating, ((me + 3) % 4) as Seat)
      return [
        `${nameOf(seating, w.from)} just threw ${/^[AEIOU]/.test(tileName(w.tile)) ? 'an' : 'a'} ${tileName(w.tile).toLowerCase()}, and it fits your hand. When that happens the table pauses and offers you a choice.`,
        `Pung takes a discard to make three of a kind, from anyone. Chow takes a discard to make a run of three, but only from ${left}, the player on your left. Either way the set goes face up in front of you and stays there, and you throw a tile next instead of drawing one.`,
        'An open set is fine, but it costs the faan for a concealed hand and it tells the table what you are collecting. Pass keeps your hand as it is. The coach has picked for you: tap the glowing button.',
      ]
    },
  },
  {
    id: 'win',
    title: 'A winning hand',
    when: (s, me) => {
      if (s.phase === 'discard' && s.current === me) return canSelfWin(s, me) !== null
      const w = myClaim(s, me)
      return !!w && w.options[me]!.some((o) => o.kind === 'win')
    },
    body: (s, me) => {
      const w = myClaim(s, me)
      const score = w ? winOn(s, me, w.tile, w.source) : canSelfWin(s, me)
      const tile = w ? w.tile : s.drawn!
      const patterns = score ? score.patterns.map((p) => PATTERN_BY_ID[p.id].name.toLowerCase()).join(', ') : ''
      return [
        `Your hand is complete: four sets and a pair, with the ${tileName(tile).toLowerCase()} as the last piece. It is worth ${score?.total ?? 0} faan (${patterns}), which clears the ${s.rules.minimumFaan}-faan minimum, so you may win.`,
        'Tap Win. The hand ends, your tiles are shown, and the others pay you.',
      ]
    },
  },
  {
    id: 'newHand',
    title: 'The second hand',
    when: (s) => s.handIndex === 1 && s.phase === 'discard' && s.discardCount === 0,
    body: (s, me, seating) => {
      const dealer = dealerOf(s)
      const first =
        dealer === me
          ? 'You won as dealer, so you deal again and the seat winds stay as they were.'
          : `The deal has passed to ${nameOf(seating, dealer, true)}, so the seat winds move round: you are now ${WIND_NAME[seatWind(s, me)]}. A pung of your own wind, or of the round wind (${WIND_NAME[prevailingOf(s)]}), is worth a faan.`
      return [first, 'The round ends once everyone has dealt. Keep following the glow; the coach stays with you to the end.']
    },
  },
]

/** The lesson to show now, if one is due and has not been seen. */
export function openLesson(s: GameState, me: Seat, seen: readonly string[]): Lesson | null {
  return LESSONS.find((l) => !seen.includes(l.id) && l.when(s, me)) ?? null
}
