/**
 * A scripted hand, frame by frame, for the "How a round flows" lesson.
 * Every physical tile keeps the same key across frames so the table can
 * animate it from the wall to a hand to the discards.
 */
import { sortTiles, tileOrder, type StandardId, type TileId } from '../../engine/tiles'

export type Seat = 'E' | 'S' | 'W' | 'N'
/** Turn order: East, then the player to East's right, and so on. */
export const SEATS: Seat[] = ['E', 'S', 'W', 'N']
export const SEAT_NAME: Record<Seat, string> = { E: 'East', S: 'South', W: 'West', N: 'North' }

export type Zone = 'wall' | 'hand' | 'discard' | 'meld'

export interface Spot {
  key: string
  tile: TileId | null
  faceUp: boolean
  zone: Zone
  seat: Seat | null
  /** Wall: slot 0–143. Hand/discard: position. Meld: position within the group. */
  index: number
  /** Meld group number, or for a winning hand the set it belongs to. */
  group?: number
  /** Just drawn, held apart from the rest of the hand. */
  drawn?: boolean
}

export interface Callout {
  seat: Seat
  text: string
  wins?: boolean
}

export interface Frame {
  id: string
  title: string
  caption: string
  spots: Spot[]
  active: Seat | null
  callouts: Callout[]
  dice?: [number, number]
  /** Wall stack where the wall was opened. */
  breakAt?: number
  showSeats?: boolean
  winner?: Seat
}

export const STACKS = 72
export const BREAK_STACK = 7

/** Wall slot indexes in the order they are drawn: top tile then bottom, stack by stack from the break. */
export const DRAW_ORDER: number[] = Array.from({ length: STACKS }, (_, k) => {
  const stack = (BREAK_STACK + k) % STACKS
  return [stack * 2 + 1, stack * 2]
}).flat()

const EAST_START: StandardId[] = sortTiles([
  'C5', 'C6', 'D1', 'D2', 'D7', 'D7', 'B2', 'B2', 'B2', 'B8', 'B9', 'WE', 'WE', 'WN',
])

class Script {
  spots = new Map<string, Spot>()
  hands: Record<Seat, string[]> = { E: [], S: [], W: [], N: [] }
  discards: Record<Seat, string[]> = { E: [], S: [], W: [], N: [] }
  melds: Record<Seat, string[][]> = { E: [], S: [], W: [], N: [] }
  drawPos = 0
  frames: Frame[] = []

  constructor() {
    for (let i = 0; i < 144; i++) {
      this.spots.set(`t${i}`, { key: `t${i}`, tile: null, faceUp: false, zone: 'wall', seat: null, index: i })
    }
  }

  private draw(seat: Seat, tile: TileId | null, asDrawn: boolean) {
    const key = `t${DRAW_ORDER[this.drawPos++]}`
    const s = this.spots.get(key)!
    s.zone = 'hand'
    s.seat = seat
    s.tile = tile
    s.faceUp = seat === 'E'
    s.drawn = asDrawn
    this.hands[seat].push(key)
    this.layoutHand(seat)
  }

  private layoutHand(seat: Seat) {
    const keys = this.hands[seat]
    if (seat === 'E') {
      keys.sort((a, b) => {
        const sa = this.spots.get(a)!
        const sb = this.spots.get(b)!
        if (!!sa.drawn !== !!sb.drawn) return sa.drawn ? 1 : -1
        return tileOrder(sa.tile!) - tileOrder(sb.tile!)
      })
    }
    keys.forEach((k, i) => {
      const s = this.spots.get(k)!
      s.index = i
      s.group = undefined
    })
  }

  deal() {
    let e = 0
    const take = (seat: Seat, n: number) => {
      for (let i = 0; i < n; i++) this.draw(seat, seat === 'E' ? EAST_START[e++] : null, false)
    }
    for (let r = 0; r < 3; r++) for (const s of SEATS) take(s, 4)
    for (const s of SEATS) take(s, 1)
    take('E', 1)
  }

  /** Draw from the wall. East's tile is known; others stay face down. */
  turnDraw(seat: Seat, tile: TileId | null = null) {
    this.draw(seat, tile, true)
  }

  /** Discard a tile. For hidden hands the drawn (or last) tile is revealed as `tile`. */
  discard(seat: Seat, tile: TileId) {
    const keys = this.hands[seat]
    let key: string | undefined
    if (seat === 'E') key = keys.find((k) => this.spots.get(k)!.tile === tile)
    else key = keys.find((k) => this.spots.get(k)!.drawn) ?? keys[keys.length - 1]
    if (!key) throw new Error(`${seat} does not hold ${tile}`)
    keys.splice(keys.indexOf(key), 1)
    const s = this.spots.get(key)!
    s.tile = tile
    s.faceUp = true
    s.zone = 'discard'
    s.seat = seat
    s.drawn = false
    s.index = this.discards[seat].length
    this.discards[seat].push(key)
    for (const k of keys) this.spots.get(k)!.drawn = false
    this.layoutHand(seat)
  }

  /** Claim the latest discard of `from` and lay a set face up. `own` are the tiles taken from hand. */
  claim(seat: Seat, from: Seat, own: TileId[]) {
    const dkeys = this.discards[from]
    const claimed = dkeys.pop()!
    const handKeys = this.hands[seat]
    const used: string[] = []
    for (const t of own) {
      const k =
        seat === 'E'
          ? handKeys.find((k) => this.spots.get(k)!.tile === t && !used.includes(k))
          : handKeys.find((k) => !used.includes(k) && !this.spots.get(k)!.drawn)
      if (!k) throw new Error(`${seat} cannot claim with ${t}`)
      used.push(k)
      this.spots.get(k)!.tile = t
    }
    for (const k of used) handKeys.splice(handKeys.indexOf(k), 1)
    const group = this.melds[seat].length
    const members = [claimed, ...used]
    members.forEach((k, i) => {
      const s = this.spots.get(k)!
      s.zone = 'meld'
      s.seat = seat
      s.faceUp = true
      s.drawn = false
      s.group = group
      s.index = i
    })
    this.melds[seat].push(members)
    this.layoutHand(seat)
  }

  /** Take `from`'s latest discard into East's hand as the winning tile and group the hand into sets. */
  winOnDiscard(from: Seat, tile: TileId, groups: TileId[][]) {
    const claimed = this.discards[from].pop()!
    const s = this.spots.get(claimed)!
    s.zone = 'hand'
    s.seat = 'E'
    s.tile = tile
    s.faceUp = true
    s.drawn = false
    this.hands.E.push(claimed)
    // Lay the hand out set by set.
    const keys = [...this.hands.E]
    const ordered: string[] = []
    groups.forEach((g, gi) => {
      for (const t of g) {
        const k = keys.find((k) => this.spots.get(k)!.tile === t && !ordered.includes(k))
        if (!k) throw new Error(`winning hand does not hold ${t}`)
        ordered.push(k)
        this.spots.get(k)!.group = gi
      }
    })
    this.hands.E = ordered
    ordered.forEach((k, i) => (this.spots.get(k)!.index = i))
  }

  snap(frame: Omit<Frame, 'spots' | 'callouts'> & { callouts?: Callout[] }) {
    this.frames.push({
      callouts: [],
      ...frame,
      spots: [...this.spots.values()].map((s) => ({ ...s })),
    })
  }
}

function build(): Frame[] {
  const s = new Script()

  s.snap({
    id: 'wall',
    title: 'The wall',
    caption:
      'Everyone shuffles the tiles face down, then each player builds a wall in front of themselves: eighteen stacks, two tiles high. Four walls make a square of all 144 tiles.',
    active: null,
  })

  s.snap({
    id: 'seats',
    title: 'Seats and winds',
    caption:
      'Each seat has a wind. The dealer is East. To the dealer’s right sits South, then West across, then North. Turns go to the right. You are East this hand, so you deal. There is also a wind for the whole round, shown in the middle: this is the East round.',
    active: null,
    showSeats: true,
  })

  s.snap({
    id: 'break',
    title: 'Break the wall',
    caption:
      'The dealer rolls two dice to decide where the wall opens. The total, seven here, is counted along a wall and the tiles are taken from that point onward. The wall shrinks from one end as the hand goes on.',
    active: 'E',
    dice: [3, 4],
    breakAt: BREAK_STACK,
    showSeats: true,
  })

  s.deal()
  s.snap({
    id: 'deal',
    title: 'Deal',
    caption:
      'Each player takes thirteen tiles, four at a time. The dealer takes one extra, fourteen, because the dealer plays first. Only you can see your tiles; the other hands are face down to you.',
    active: 'E',
    breakAt: BREAK_STACK,
    showSeats: true,
  })

  s.discard('E', 'WN')
  s.snap({
    id: 'first-discard',
    title: 'Discard',
    caption:
      'Every turn is the same: draw one tile, then discard one, face up in front of you. The dealer already holds fourteen, so you skip the draw and just discard. North wind is no use to you, so out it goes.',
    active: 'E',
    showSeats: true,
  })

  s.turnDraw('S')
  s.discard('S', 'D5')
  s.snap({
    id: 'south-turn',
    title: 'South’s turn',
    caption:
      'South draws the next tile from the wall and discards one. Discards stay face up where everyone can see them, in rows in front of whoever threw them.',
    active: 'S',
    showSeats: true,
  })

  s.claim('W', 'S', ['D5', 'D5'])
  s.discard('W', 'B3')
  s.snap({
    id: 'west-pung',
    title: 'West calls pung',
    caption:
      'West already held two fives of dots. Instead of drawing, West calls pung, takes South’s discard, and lays all three face up. Anyone can pung a discard, whatever seat they are in. West then discards as usual.',
    active: 'W',
    callouts: [{ seat: 'W', text: 'Pung!' }],
    showSeats: true,
  })

  s.turnDraw('N')
  s.discard('N', 'B7')
  s.snap({
    id: 'north-turn',
    title: 'North’s turn',
    caption:
      'Play carries on to West’s right: North draws and discards. Look at that seven of bamboo. You hold the eight and nine, so it would give you a chow.',
    active: 'N',
    showSeats: true,
  })

  s.claim('S', 'N', ['B7', 'B7'])
  s.discard('S', 'C8')
  s.snap({
    id: 'priority',
    title: 'Two players want it',
    caption:
      'You call chow, but South calls pung on the same tile. Pung beats chow, and a win beats everything. South takes the tile, lays down the pung, and discards. Your turn is skipped: play continues from South’s right.',
    active: 'S',
    callouts: [
      { seat: 'E', text: 'Chow?' },
      { seat: 'S', text: 'Pung!', wins: true },
    ],
    showSeats: true,
  })

  s.turnDraw('W')
  s.discard('W', 'D9')
  s.turnDraw('N')
  s.discard('N', 'C4')
  s.snap({
    id: 'around',
    title: 'Around again',
    caption:
      'West and North each draw and discard. Nobody draws from the wall when a discard is claimed, so the wall only shrinks on normal turns. North throws the four of characters, and you hold the five and six.',
    active: 'N',
    showSeats: true,
  })

  s.claim('E', 'N', ['C5', 'C6'])
  s.discard('E', 'B9')
  s.snap({
    id: 'chow',
    title: 'You call chow',
    caption:
      'A chow can only be claimed from the player on your left, the one who plays just before you. North is on your left, so this one is yours. Lay the three face up and discard. The nine of bamboo lost its partner, so it goes.',
    active: 'E',
    callouts: [{ seat: 'E', text: 'Chow!', wins: true }],
    showSeats: true,
  })

  s.turnDraw('S')
  s.discard('S', 'WW')
  s.turnDraw('W')
  s.discard('W', 'C1')
  s.turnDraw('N')
  s.discard('N', 'D6')
  s.turnDraw('E', 'WE')
  s.discard('E', 'B8')
  s.snap({
    id: 'later',
    title: 'A few turns later',
    caption:
      'Draw, discard, draw, discard. You draw a third East wind and throw the eight of bamboo. Now you are ready: a three of dots would finish the one-two, and that would be four sets and a pair.',
    active: 'E',
    showSeats: true,
  })

  s.turnDraw('S')
  s.discard('S', 'B5')
  s.turnDraw('W')
  s.discard('W', 'D3')
  s.winOnDiscard('W', 'D3', [
    ['D1', 'D2', 'D3'],
    ['D7', 'D7'],
    ['B2', 'B2', 'B2'],
    ['WE', 'WE', 'WE'],
  ])
  s.snap({
    id: 'win',
    title: 'You win',
    caption:
      'West discards the three of dots and you call the win. A win can be claimed from anyone’s discard, or drawn yourself from the wall, which scores extra. Lay the hand down: four sets and a pair. Count the faan, settle up, and the next hand begins. Because East won, East deals again.',
    active: 'E',
    callouts: [{ seat: 'E', text: 'Win!', wins: true }],
    showSeats: true,
    winner: 'E',
  })

  return s.frames
}

export const FRAMES: Frame[] = build()
