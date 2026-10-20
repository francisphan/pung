import { useRef, useState } from 'react'
import FloatTip from '../components/FloatTip'
import Term from '../components/Term'
import Tile from '../components/Tile'
import { makeQuestion, type Question } from '../data/quiz'
import { track } from '../../metrics'
import {
  CHINESE_NUMERAL,
  TILE_BY_ID,
  TILES,
  tileName,
  type TileId,
} from '../../engine/tiles'

interface Group {
  id: string
  title: string
  chinese: string
  say: string
  copies: number
  tiles: TileId[]
}

const GROUPS: Group[] = [
  { id: 'characters', title: 'Characters', chinese: '萬子', say: 'maan zi', copies: 4, tiles: [] },
  { id: 'dots', title: 'Dots', chinese: '筒子', say: 'tung zi', copies: 4, tiles: [] },
  { id: 'bamboo', title: 'Bamboo', chinese: '索子', say: 'sok zi', copies: 4, tiles: [] },
  { id: 'wind', title: 'Winds', chinese: '風', say: 'fung', copies: 4, tiles: [] },
  { id: 'dragon', title: 'Dragons', chinese: '三元', say: 'saam jyun', copies: 4, tiles: [] },
  { id: 'flower', title: 'Flowers', chinese: '花', say: 'faa', copies: 1, tiles: [] },
  { id: 'season', title: 'Seasons', chinese: '季', say: 'gwai', copies: 1, tiles: [] },
]
for (const t of TILES) {
  const g = t.kind === 'suit' ? t.suit : t.kind
  GROUPS.find((x) => x.id === g)!.tiles.push(t.id)
}

function note(id: TileId): string {
  const t = TILE_BY_ID[id]
  switch (t.kind) {
    case 'suit':
      if (t.suit === 'characters')
        return `${CHINESE_NUMERAL[t.rank]} is the numeral ${t.rank}. The red 萬 below it means ten thousand and marks the suit.`
      if (t.suit === 'dots') return t.rank === 1 ? 'One big circle. Dots are also called circles or coins.' : `Count the circles: ${t.rank}.`
      return t.rank === 1
        ? 'The one of bamboo is drawn as a bird, so it cannot be mistaken for a lone stick.'
        : `Count the sticks: ${t.rank}.`
    case 'wind':
      return 'A wind. Three of your own seat wind, or of the round’s wind, score a faan.'
    case 'dragon':
      if (t.dragon === 'red') return '中, “centre”. Three of any dragon score a faan.'
      if (t.dragon === 'green') return '發, “prosper”. Three of any dragon score a faan.'
      return 'The white dragon is a blank tile or a plain frame. Three of any dragon score a faan.'
    case 'flower':
    case 'season':
      return 'A bonus tile. When you draw one, set it aside face up and draw a replacement. It is not part of your hand.'
  }
}

export default function Tiles() {
  const [hints, setHints] = useState(true)
  const [hover, setHover] = useState<TileId | null>(null)
  const [pinned, setPinned] = useState<TileId | null>(null)
  const [tip, setTip] = useState<{ left: number; top: number; flip: boolean } | null>(null)
  const box = useRef<HTMLDivElement>(null)

  const active = hover ?? pinned

  function anchor(el: HTMLElement) {
    const b = box.current?.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    if (!b) return
    const left = ((r.left - b.left + r.width / 2) / b.width) * 100
    setTip({ left, top: ((r.bottom - b.top + 4) / b.height) * 100, flip: left > 55 })
  }
  const [q, setQ] = useState<Question>(() => makeQuestion())
  const [picked, setPicked] = useState<TileId | null>(null)
  const [score, setScore] = useState({ right: 0, total: 0, streak: 0 })

  function answer(id: TileId) {
    if (picked) return
    setPicked(id)
    const ok = id === q.tile
    setScore((s) => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1, streak: ok ? s.streak + 1 : 0 }))
    track(ok ? 'quiz/tile/right' : 'quiz/tile/wrong', q.tile)
  }
  function next() {
    setQ(makeQuestion(Math.random, q.tile))
    setPicked(null)
  }

  return (
    <section className="lesson" aria-labelledby="tiles-title">
      <div className="panel">
        <h2 id="tiles-title">The tiles</h2>
        <p className="lede">
          A set has 144 tiles. Most of them come in three <Term id="suit">suits</Term> numbered one to
          nine, with four copies of each. The rest are winds, dragons, and a few bonus tiles.
        </p>

        <h3>Three suits</h3>
        <p>
          <strong>Characters</strong> show a Chinese numeral on top and the red character <span lang="zh-Hant">萬</span>{' '}
          below. The numerals are worth learning once: <span lang="zh-Hant">一 二 三 四 五 六 七 八 九</span> is one to
          nine. <strong>Dots</strong> and{' '}
          <strong>bamboo</strong> you can simply count, except the one of bamboo, which is a bird.
        </p>
        <p>
          Suits matter because only suit tiles have an order, and order is what makes a{' '}
          <Term id="chow">chow</Term>. One, two, three of dots is a set. One of dots, two of bamboo, three
          of characters is nothing.
        </p>

        <h3>Winds and dragons</h3>
        <p>
          The <Term id="honor">honors</Term> are the four winds, <span lang="zh-Hant">東 南 西 北</span> (east,
          south, west, north), and the three dragons: red <span lang="zh-Hant">中</span>, green{' '}
          <span lang="zh-Hant">發</span>, and white, which is a blank or a frame. They have no
          number, so they only ever form pairs or sets of identical tiles. Three of the right wind, or three
          of any dragon, score.
        </p>

        <h3>Flowers and seasons</h3>
        <p>
          Eight <Term id="bonus">bonus tiles</Term>, one of each. They never live in your hand: draw one, set
          it aside face up, and take a replacement tile. They add a little to your score at the end. Some
          variants leave them in the box.
        </p>

        <h3>Name that tile</h3>
        <p className="hint">Corner hints are off here. Read the face.</p>
        <div className="quiz">
          <div className="quiz-tile">
            <Tile id={q.tile} size={96} />
          </div>
          <div className="quiz-options" role="group" aria-label="Which tile is this?">
            {q.options.map((id) => {
              let cls = 'quiz-opt'
              if (picked) {
                if (id === q.tile) cls += ' quiz-opt-right'
                else if (id === picked) cls += ' quiz-opt-wrong'
                else cls += ' quiz-opt-dim'
              }
              return (
                <button key={id} type="button" className={cls} onClick={() => answer(id)} disabled={!!picked}>
                  {tileName(id)}
                </button>
              )
            })}
          </div>
          <div className="quiz-foot">
            <p className="drill-status" role="status" aria-live="polite">
              {picked === null ? (
                `${score.right} of ${score.total} right${score.streak >= 3 ? `, ${score.streak} in a row` : ''}`
              ) : picked === q.tile ? (
                <span className="status-ok">Right. {note(q.tile)}</span>
              ) : (
                <span className="status-bad">
                  Not quite: it is the {tileName(q.tile).toLowerCase()}. {note(q.tile)}
                </span>
              )}
            </p>
            <button type="button" className="btn" onClick={() => picked && next()} aria-disabled={!picked}>
              Next tile
            </button>
          </div>
        </div>
      </div>

      <div className="stage stage-tall">
        <div className="stage-bar">
          <p className="drill-status">Hover, tap or tab to a tile to read it.</p>
          <label className="check">
            <input type="checkbox" checked={hints} onChange={(e) => setHints(e.target.checked)} />
            Corner hints
          </label>
        </div>
        <div className="catalog" ref={box}>
          {GROUPS.map((g) => (
            <div key={g.id} className="catalog-group">
              <h3>
                {g.title}
                <span className="catalog-meta">
                  <span lang="zh-Hant">{g.chinese}</span> {g.say}, {g.copies === 4 ? 'four of each' : 'one of each'}
                </span>
              </h3>
              <div className="catalog-row">
                {g.tiles.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={`tile-btn${active === id ? ' tile-btn-on' : ''}`}
                    aria-label={tileName(id)}
                    aria-pressed={pinned === id}
                    onPointerEnter={(e) => {
                      if (e.pointerType !== 'mouse') return
                      anchor(e.currentTarget)
                      setHover(id)
                    }}
                    onPointerLeave={(e) => {
                      if (e.pointerType === 'mouse') setHover((h) => (h === id ? null : h))
                    }}
                    onFocus={(e) => {
                      anchor(e.currentTarget)
                      setHover(id)
                    }}
                    onBlur={() => setHover((h) => (h === id ? null : h))}
                    onClick={(e) => {
                      anchor(e.currentTarget)
                      setPinned((p) => (p === id ? null : id))
                    }}
                  >
                    <Tile id={id} size={48} hint={hints} decorative />
                  </button>
                ))}
              </div>
            </div>
          ))}
          {active && tip && (
            <FloatTip title={tileName(active)} left={tip.left} top={tip.top} flipX={tip.flip}>
              {note(active)}
            </FloatTip>
          )}
          <p className="sr-only" role="status" aria-live="polite">
            {active ? `${tileName(active)}. ${note(active)}` : ''}
          </p>
        </div>
      </div>

    </section>
  )
}
