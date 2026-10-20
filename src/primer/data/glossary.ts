/** Terms used across the lessons. Tooltips show `short`; the glossary tab shows both. */
export interface Term {
  id: string
  term: string
  chinese?: string
  /** Cantonese pronunciation, roughly. */
  say?: string
  short: string
  long: string
}

export const GLOSSARY: Term[] = [
  {
    id: 'suit',
    term: 'Suit',
    short: 'One of the three families of numbered tiles: dots, bamboo and characters.',
    long: 'Each suit runs from one to nine, with four copies of every tile. Only suit tiles can form chows, because only they have an order.',
  },
  {
    id: 'honor',
    term: 'Honors',
    chinese: '番子',
    say: 'faan zi',
    short: 'The four winds and three dragons. They have no number, so they never form chows.',
    long: 'Winds (east, south, west, north) and dragons (red, green, white) can only make pungs, kongs and pairs. Pungs of dragons, and of the right winds, score.',
  },
  {
    id: 'bonus',
    term: 'Flowers and seasons',
    chinese: '花',
    say: 'faa',
    short: 'Eight bonus tiles. They never sit in your hand: set one aside when you draw it and take a replacement.',
    long: 'There is one of each flower (plum, orchid, chrysanthemum, bamboo) and one of each season. In Hong Kong play each one you collect is worth a little, and your own seat’s number is worth more. Riichi sets usually leave them out.',
  },
  {
    id: 'chow',
    term: 'Chow',
    chinese: '上',
    say: 'soeng',
    short: 'Three tiles in a row from one suit, like four, five, six of bamboo.',
    long: 'A chow can be built from your own draws, or claimed from a discard, but only from the player on your left, the one who plays just before you.',
  },
  {
    id: 'pung',
    term: 'Pung',
    chinese: '碰',
    say: 'pung',
    short: 'Three identical tiles.',
    long: 'A pung can be claimed from any player’s discard. When you claim one, the three tiles go face up in front of you and stay there.',
  },
  {
    id: 'kong',
    term: 'Kong',
    chinese: '槓',
    say: 'gong',
    short: 'All four copies of one tile. It still counts as one set.',
    long: 'Because a kong uses an extra tile, you draw a replacement from the back of the wall after declaring it, so your hand still has enough tiles to win.',
  },
  {
    id: 'pair',
    term: 'Pair',
    chinese: '眼',
    say: 'ngaan, “eyes”',
    short: 'Two identical tiles. Every winning hand has exactly one pair.',
    long: 'The pair is sometimes called the eyes. It is never claimed from a discard, except the discard that wins the hand.',
  },
  {
    id: 'set',
    term: 'Set',
    short: 'A chow, pung or kong. A winning hand is four sets plus a pair.',
    long: 'Hong Kong, Riichi and Chinese Official mahjong all share this shape. Special hands that break it exist, but a beginner can ignore them.',
  },
  {
    id: 'wall',
    term: 'Wall',
    chinese: '牌牆',
    say: 'paai coeng',
    short: 'The four rows of face-down tiles everyone draws from.',
    long: 'Each player builds eighteen stacks of two in front of themselves. The dealer rolls dice to pick where it opens, and the wall shrinks from that point as the hand goes on. If it runs out, the hand is a draw and nobody scores.',
  },
  {
    id: 'discard',
    term: 'Discard',
    chinese: '打',
    say: 'daa',
    short: 'Throwing a tile face up into the middle to end your turn.',
    long: 'Discards stay face up in front of whoever threw them, so you can see what has gone. The most recent discard can be claimed by another player.',
  },
  {
    id: 'draw',
    term: 'Draw',
    chinese: '摸',
    say: 'mo',
    short: 'Taking the next tile from the wall at the start of your turn.',
    long: 'You draw, look, and then discard one tile, so between turns you always hold thirteen tiles (counting each claimed set as three).',
  },
  {
    id: 'call',
    term: 'Call',
    short: 'Claiming the tile someone just discarded to complete a set, or to win.',
    long: 'Say what you are claiming: chow, pung, kong or win. If two players want the same tile, a win beats a pung or kong, which beats a chow. After a call, the turn jumps to the caller, and anyone in between is skipped.',
  },
  {
    id: 'seat-wind',
    term: 'Seat wind',
    chinese: '門風',
    say: 'mun fung',
    short: 'The wind of your seat for this hand: East, South, West or North. A pung of it scores.',
    long: 'The dealer is East. Going to the right, the next players are South, West and North. Seats move after each hand unless the dealer wins.',
  },
  {
    id: 'prevailing-wind',
    term: 'Prevailing wind',
    chinese: '圈風',
    say: 'hyun fung',
    short: 'The wind of the whole round. A pung of it scores for anyone.',
    long: 'A game has four rounds: East, South, West and North. The round’s wind changes once every player has been dealer.',
  },
  {
    id: 'dealer',
    term: 'Dealer',
    chinese: '莊',
    say: 'zong',
    short: 'The East seat. Deals, plays first, and stays dealer after winning.',
    long: 'In Hong Kong play the dealer pays and receives double, which is why winning as East matters more.',
  },
  {
    id: 'win',
    term: 'Win',
    chinese: '食糊',
    say: 'sik wu',
    short: 'Declaring a complete hand: four sets and a pair.',
    long: 'You can win on a tile you draw or on any player’s discard. Say it out loud, lay the hand face up, and count the faan.',
  },
  {
    id: 'self-draw',
    term: 'Self-draw',
    chinese: '自摸',
    say: 'zi mo',
    short: 'Winning on a tile you drew from the wall yourself. Worth an extra faan.',
    long: 'When you self-draw, all three other players pay you. When you win on a discard, only the player who threw it pays, at most tables.',
  },
  {
    id: 'ready',
    term: 'Ready',
    chinese: '聽牌',
    say: 'teng paai',
    short: 'One tile away from winning.',
    long: 'A ready hand is also called waiting. The tiles that would complete it are its waits. Hands that wait on more tiles win more often.',
  },
  {
    id: 'wait',
    term: 'Wait',
    short: 'A tile that would complete a ready hand.',
    long: 'A one-two waits only on three. A three-four waits on two or five. A pair of pairs waits on either. Spotting your waits is the first real skill.',
  },
  {
    id: 'faan',
    term: 'Faan',
    chinese: '番',
    say: 'faan',
    short: 'The Hong Kong scoring unit. Each pattern in a hand adds faan, and payment doubles with every one.',
    long: 'Hands need a minimum number of faan to be declared, three at most tables, and are capped at a limit, usually thirteen. Riichi and Chinese Official mahjong count points differently.',
  },
  {
    id: 'concealed',
    term: 'Concealed',
    chinese: '門前清',
    say: 'mun cin cing',
    short: 'A hand with no claimed sets face up.',
    long: 'Worth one faan in Hong Kong play. A concealed kong does not break it.',
  },
  {
    id: 'chicken',
    term: 'Chicken hand',
    chinese: '雞糊',
    say: 'gai wu',
    short: 'A complete hand worth zero faan.',
    long: 'Four sets and a pair with nothing special about them. At a three-faan table it cannot be declared, so you keep playing.',
  },
  {
    id: 'hong-kong',
    term: 'Hong Kong mahjong',
    chinese: '廣東牌',
    say: 'gwong dung paai',
    short: 'The Cantonese rule set this app uses for winning and scoring. Simple faan counting, few special hands.',
    long: 'Tiles, sets and the flow of a turn are shared by nearly every variant. Scoring is not. Riichi (Japanese) adds a declared-ready bet and a point table; Chinese Official has 81 patterns; American mahjong uses a yearly card of hands.',
  },
]

export const TERM_BY_ID: Record<string, Term> = Object.fromEntries(GLOSSARY.map((t) => [t.id, t]))
