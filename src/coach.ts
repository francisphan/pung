/**
 * The coach for a guided round. It picks the move a beginner should make
 * now and says why, in plain words. It chooses exactly as the opponents
 * do, so a guided round is a fair game with the reasoning shown.
 */
import { aiClaim, aiTurn } from './engine/ai'
import {
  canSelfWin,
  dealerOf,
  kongOptions,
  prevailingOf,
  seatWind,
  unseenCounts,
  winOn,
  type Action,
  type Claim,
  type Decision,
  type GameState,
  type Rules,
  type Seat,
} from './engine/game'
import { PATTERN_BY_ID, type Score } from './engine/scoring'
import { acceptance, shanten } from './engine/shanten'
import { TILE_BY_ID, isHonor, tileName, windTile, type StandardId } from './engine/tiles'
import { WIND_NAME, conjugate, nameOf, possessive, type Seating } from './names'

/** One East round: everyone deals once. Long enough to see every kind of turn, short enough to finish. */
export const TUTORIAL_RULES: Rules = { minimumFaan: 3, rounds: 1 }
/**
 * The deal for every guided round. Chosen so that, following the coach, you
 * claim a set and win the first hand, see an opponent win, and finish the
 * round in a handful of hands. `tutorial.test.ts` checks that stays true.
 */
export const TUTORIAL_SEED = 440

export interface Guidance {
  /** The move to make. */
  action: Action
  /** The tile to tap on the rack, when the move is a discard. */
  tile: StandardId | null
  /** The button to tap in a claim window. */
  decision: Decision | null
  /** What to do and why. */
  text: string
}

/** A tile name for the middle of a sentence. */
const lower = (id: StandardId) => tileName(id).toLowerCase()
/** "an east wind", "a red dragon". */
const a = (name: string) => `${/^[aeiou]/.test(name) ? 'an' : 'a'} ${name}`

/** What a pung of this tile is worth, if anything, for the lesson in it. */
function worth(s: GameState, me: Seat, tile: StandardId): string {
  const t = TILE_BY_ID[tile]
  if (t.kind === 'dragon') return ' A pung of a dragon is worth a faan.'
  if (t.kind !== 'wind') return ''
  const seat = tile === windTile(seatWind(s, me))
  const round = tile === windTile(prevailingOf(s))
  if (seat && round) return ` ${tileName(tile)} is both your seat wind and the round wind, so this pung is worth two faan.`
  if (seat) return ' That is your seat wind, so the pung is worth a faan.'
  if (round) return ' That is the round wind, so the pung is worth a faan.'
  return ''
}

function list(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`
}

/** Why this tile, and where the hand stands after it goes. */
function whyDiscard(s: GameState, me: Seat, tile: StandardId): string {
  const p = s.players[me]
  const name = lower(tile)
  const copies = p.concealed.filter((t) => t === tile).length
  const t = TILE_BY_ID[tile]
  let why: string
  if (copies === 1 && isHonor(tile)) {
    if (t.kind === 'wind') {
      const mine = tile === windTile(seatWind(s, me)) || tile === windTile(prevailingOf(s))
      why = mine
        ? `A single ${name} is your wind, but one copy is a long way from a pung.`
        : `A single ${name} is a wind that scores nothing for you, and a lone honor can only ever become a pung.`
    } else why = `A single ${name} would need two more copies before it was worth anything.`
  } else if (copies === 1 && t.kind === 'suit') {
    const near = p.concealed.some((o) => {
      const u = TILE_BY_ID[o]
      return o !== tile && u.kind === 'suit' && u.suit === t.suit && Math.abs(u.rank - t.rank) <= 2
    })
    if (!near) why = `Nothing in your hand sits near the ${name}, so it is the tile you will miss least.`
    else if (t.rank === 1 || t.rank === 9) why = `The ${name} sits at the end of its suit, so it can only grow one way.`
    else why = `Of everything you hold, the ${name} is the tile you will miss least.`
  } else why = `Of everything you hold, the ${name} is the tile you will miss least.`

  const rest = [...p.concealed]
  rest.splice(rest.indexOf(tile), 1)
  const a = acceptance(rest, p.melds.length, unseenCounts(s, me))
  let then: string
  if (a.shanten === 0) {
    const waits = a.tiles.map((w) => lower(w.id))
    then =
      waits.length <= 3
        ? `After that you are waiting: ${list(waits)} would complete your hand.`
        : `After that you are waiting on ${waits.length} different tiles.`
  } else if (a.shanten === 1) then = 'After that, one good draw puts you on a waiting hand.'
  else then = `After that you need ${a.shanten} good draws before you are waiting to win.`
  const how = s.handIndex === 0 && p.discards.length === 0 ? ' Tap it to pick it up, then tap it again to throw it.' : ''
  return `Throw the ${name}. ${why} ${then}${how}`
}

/** The best shanten reachable by taking this set and then discarding. */
function shantenAfterClaim(s: GameState, me: Seat, tile: StandardId, c: Claim): number {
  const p = s.players[me]
  const rest = [...p.concealed]
  if (c.kind === 'chow') for (const t of c.tiles) rest.splice(rest.indexOf(t), 1)
  else for (let i = 0; i < (c.kind === 'kong' ? 3 : 2); i++) rest.splice(rest.indexOf(tile), 1)
  if (c.kind === 'kong') return shanten(rest, p.melds.length + 1)
  let best = Infinity
  for (const cand of new Set(rest)) {
    const r = [...rest]
    r.splice(r.indexOf(cand), 1)
    best = Math.min(best, shanten(r, p.melds.length + 1))
  }
  return best
}

function claimGuidance(s: GameState, me: Seat, seating: Seating): Guidance {
  const w = s.claim!
  const options = w.options[me]!
  const d = aiClaim(s, me, options)
  const who = nameOf(seating, w.from)
  const whose = possessive(seating, w.from)
  const name = lower(w.tile)
  let text: string
  switch (d.kind) {
    case 'win': {
      const score = winOn(s, me, w.tile, w.source)
      text = `${whose} ${name} completes your hand. Tap Win${score ? ` for ${score.total} faan` : ''}.`
      break
    }
    case 'pung':
      text = `${who} threw ${a(name)} and you hold two. Tap Pung to take it: the three go face up in front of you, and you throw next.${worth(s, me, w.tile)}`
      break
    case 'kong':
      text = `${who} threw ${a(name)} and you hold three. Tap Kong: all four go face up, and you draw a replacement tile.${worth(s, me, w.tile)}`
      break
    case 'chow':
      text = `${whose} ${name} runs with your ${lower(d.tiles[0])} and ${lower(d.tiles[1])}. Tap Chow: the run goes face up, and you throw next. Only ${who}, on your left, can feed you a chow.`
      break
    case 'pass': {
      const before = shanten(s.players[me].concealed, s.players[me].melds.length)
      const closer = options.some((o) => o.kind !== 'win' && shantenAfterClaim(s, me, w.tile, o) < before)
      const need = s.rules.minimumFaan
      // The full reasons in the first hand; after that, the short form.
      if (s.handIndex === 0)
        text = closer
          ? `Taking the ${name} would bring you closer, but a claimed set sits face up, and this hand would then fall short of the ${need} faan a win needs. Tap Pass.`
          : `The ${name} would not bring you any closer to a win, and a claimed set has to sit face up for the rest of the hand. Tap Pass.`
      else text = closer ? `The ${name} helps, but opening the hand for it would leave it short of ${need} faan. Tap Pass.` : `The ${name} does not help enough to open your hand for it. Tap Pass.`
      break
    }
  }
  const action: Action = { type: 'decide', decisions: { [me]: d } }
  return { action, tile: null, decision: d, text }
}

/** What to do now, or null when it is not your move. */
export function guide(s: GameState, me: Seat, seating: Seating): Guidance | null {
  if (s.phase === 'claim' && s.claim && s.claim.options[me] && !s.claim.decisions[me]) return claimGuidance(s, me, seating)
  if (s.phase !== 'discard' || s.current !== me) return null
  const action = aiTurn(s, me)
  if (action.type === 'selfWin') {
    const score = canSelfWin(s, me)
    return {
      action,
      tile: null,
      decision: null,
      text: `You drew the ${lower(s.drawn!)} and your hand is complete: four sets and a pair. Tap Win${score ? ` for ${score.total} faan` : ''}.`,
    }
  }
  if (action.type === 'kong') {
    const opt = kongOptions(s, me).find((k) => k.tile === action.tile)
    const name = lower(action.tile)
    return {
      action,
      tile: null,
      decision: null,
      text:
        opt?.kind === 'added'
          ? `You drew a fourth ${name} to go with your pung. Tap Kong to add it, then draw a replacement tile. A win on that tile is worth an extra faan.`
          : `You hold all four ${name}. Tap Kong: they count as one set, and you draw a replacement tile from the back of the wall.${worth(s, me, action.tile)}`,
    }
  }
  if (action.type === 'discard') return { action, tile: action.tile, decision: null, text: whyDiscard(s, me, action.tile) }
  return null
}

function patternList(score: Score): string {
  return list(
    score.patterns.map((p) => {
      const def = PATTERN_BY_ID[p.id]
      return `${def.name.toLowerCase()}${p.times > 1 ? ` ×${p.times}` : ''} (${def.limit ? 'limit' : p.faan})`
    }),
  ).replace(/ or ([^,]+)$/, ' and $1')
}

/** How the hand that just ended was scored, and what happens next. */
export function resultNote(s: GameState, me: Seat, seating: Seating): string {
  const r = s.result
  if (!r) return ''
  const dealer = dealerOf(s)
  const dealerStays = r.kind === 'draw' || r.winner === dealer
  const last = !dealerStays && s.dealerIndex + 1 >= s.rules.rounds * 4
  let next: string
  if (last) next = 'That was the last hand of the round.'
  else if (dealerStays)
    next = `${nameOf(seating, dealer)} ${conjugate(seating, dealer, 'keep', 'keeps')} the deal, so the seat winds stay as they are.`
  else {
    const nd = ((dealer + 1) % 4) as Seat
    const myWind = WIND_NAME[seatWind({ ...s, dealerIndex: s.dealerIndex + 1 }, me)]
    next = `The deal passes to ${nameOf(seating, nd, true)}, and the seat winds move round: you become ${myWind}.`
  }
  if (r.kind === 'draw') return `The wall ran out before anyone completed a hand, so nobody pays. ${next}`
  const patterns = patternList(r.score)
  const from = r.from
  let how: string
  if (r.winner === me) {
    how = `Your hand showed ${patterns}: ${r.score.total} faan, which the table pays as ${r.points} points. ${
      from === null
        ? 'You drew the winning tile yourself, so every player pays the full amount.'
        : `${nameOf(seating, from)} threw the winning tile, so ${nameOf(seating, from, true)} ${conjugate(seating, from, 'pay', 'pays')} the full amount and the other two pay half.`
    }`
  } else {
    how = `${nameOf(seating, r.winner)} won with ${patterns}: ${r.score.total} faan, ${r.points} points. ${
      from === null
        ? 'A self-drawn win is paid in full by everyone, you included.'
        : from === me
          ? 'You threw the winning tile, so you pay the full amount and the other two pay half. That is the risk in every discard.'
          : `${nameOf(seating, from)} threw the winning tile and pays in full; everyone else pays half.`
    }`
  }
  const look = s.handIndex === 0 ? ' Look at the table shows what everyone else was collecting.' : ''
  return `${how} ${next}${look}`
}

/** The closing word of a guided round. */
export function gameOverNote(): string {
  return 'That was a whole round: everyone dealt once. A full game is four of them, with the round wind moving from East to North, and a pung of the round wind worth a faan. You know enough to play. Tap Deal in the lobby for a real game, with the coach gone and the choices yours.'
}
