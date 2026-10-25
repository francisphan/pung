import { useState } from 'react'
import HandRow, { type HandLabel, type HandTile } from '../components/HandRow'
import Segmented from '../components/Segmented'
import Term from '../components/Term'
import Tile from '../components/Tile'
import { decompose, findWaits, type Meld } from '../../engine/hand'
import { ANATOMY_HAND, MELD_EXAMPLES, WAIT_PUZZLES } from '../data/hands'
import { sortTiles, tileName, tileOrder, type StandardId } from '../../engine/tiles'
import { track } from '../../metrics'

const KIND_LABEL: Record<Meld['kind'], string> = { chow: 'chow', pung: 'pung', kong: 'kong', pair: 'pair' }

/** Lay melds out left to right with a half-tile gap between them. */
function layoutGroups(groups: Meld[], keyFor: (tile: StandardId, used: Set<string>) => string) {
  const tiles: HandTile[] = []
  const labels: HandLabel[] = []
  const used = new Set<string>()
  let slot = 0
  groups.forEach((g) => {
    const start = slot
    for (const t of g.tiles) {
      const key = keyFor(t, used)
      used.add(key)
      tiles.push({ key, id: t, slot })
      slot += 1
    }
    labels.push({ from: start, to: slot, text: KIND_LABEL[g.kind] })
    slot += 0.5
  })
  return { tiles, labels, width: slot - 0.5 }
}

function Anatomy() {
  const [view, setView] = useState<'sorted' | 'grouped'>('sorted')
  const all = ANATOMY_HAND.flatMap((g, gi) => g.tiles.map((t, i) => ({ key: `${gi}-${i}`, id: t })))
  let tiles: HandTile[]
  let labels: HandLabel[] = []
  if (view === 'sorted') {
    tiles = [...all]
      .sort((a, b) => tileOrder(a.id) - tileOrder(b.id) || a.key.localeCompare(b.key))
      .map((t, i) => ({ ...t, slot: i }))
  } else {
    const pool = new Map(all.map((t) => [t.key, t.id]))
    const out = layoutGroups(ANATOMY_HAND, (tile, used) => {
      for (const [k, id] of pool) if (id === tile && !used.has(k)) return k
      throw new Error('tile missing')
    })
    tiles = out.tiles
    labels = out.labels
  }
  return (
    <div>
      <Segmented
        label="How to show the hand"
        value={view}
        onChange={setView}
        options={[
          { value: 'sorted', label: 'Sorted', hint: 'as you hold it' },
          { value: 'grouped', label: 'Grouped', hint: 'the sets inside it' },
        ]}
      />
      <HandRow tiles={tiles} slots={16} labels={labels} hint label="A complete hand" />
    </div>
  )
}

function WaitPuzzle() {
  const [pid, setPid] = useState(WAIT_PUZZLES[0].id)
  const puzzle = WAIT_PUZZLES.find((p) => p.id === pid)!
  const [tried, setTried] = useState<StandardId[]>([])
  const [revealed, setRevealed] = useState<StandardId | null>(null)

  const waits = findWaits(puzzle.hand)
  const found = tried.filter((t) => waits.includes(t))
  const last = tried[tried.length - 1]
  const lastOk = last ? waits.includes(last) : null
  const base = sortTiles(puzzle.hand.concealed).map((id, i) => ({ key: `h${i}`, id }))

  function choose(p: string) {
    setPid(p)
    setTried([])
    setRevealed(null)
  }
  function tryTile(t: StandardId) {
    if (tried.includes(t)) return
    setTried((x) => [...x, t])
    setRevealed(null)
    track(waits.includes(t) ? 'quiz/wait/right' : 'quiz/wait/wrong', puzzle.id)
  }

  let tiles: HandTile[]
  let labels: HandLabel[] = []
  const slots = 16
  if (revealed) {
    const d = decompose({ concealed: [...puzzle.hand.concealed, revealed], melds: [] })[0]
    const groups = [...d.sets, d.pair]
    const pool = new Map(base.map((t) => [t.key, t.id]))
    let winKeyUsed = false
    const out = layoutGroups(groups, (tile, used) => {
      for (const [k, id] of pool) if (id === tile && !used.has(k)) return k
      if (!winKeyUsed && tile === revealed) {
        winKeyUsed = true
        return 'win'
      }
      throw new Error('tile missing')
    })
    tiles = out.tiles.map((t) => (t.key === 'win' ? { ...t, raised: true, state: 'correct' } : t))
    labels = out.labels.map((l) =>
      out.tiles.some((t) => t.key === 'win' && t.slot >= l.from && t.slot < l.to) ? { ...l, state: 'correct' } : l,
    )
  } else {
    tiles = base.map((t, i) => ({ ...t, slot: i }))
    if (lastOk && last) tiles.push({ key: 'win', id: last, slot: 14, raised: true, state: 'correct' })
  }

  return (
    <div className="puzzle">
      <Segmented
        label="Puzzle"
        value={pid}
        onChange={choose}
        options={WAIT_PUZZLES.map((p) => ({ value: p.id, label: p.title }))}
      />
      <HandRow tiles={tiles} slots={slots} labels={labels} hint label="Thirteen tiles, one short" />
      <p className="hint">{puzzle.hint}</p>
      <div className="choices" role="group" aria-label="Which tile completes the hand?">
        {puzzle.choices.map((c) => {
          const state = tried.includes(c) ? (waits.includes(c) ? 'correct' : 'wrong') : ''
          return (
            <button
              key={c}
              type="button"
              className={`tile-btn tile-btn-choice${state ? ` tile-btn-${state}` : ''}`}
              aria-label={`${tileName(c)}${state === 'correct' ? ', completes the hand' : state === 'wrong' ? ', does not complete it' : ''}`}
              onClick={() => tryTile(c)}
            >
              <Tile id={c} size={46} hint decorative />
            </button>
          )
        })}
      </div>
      <div className="quiz-foot">
        <p className="drill-status" role="status" aria-live="polite">
          {last === undefined ? (
            `Pick a tile. This hand has ${waits.length === 1 ? 'one wait' : `${waits.length} waits`}.`
          ) : lastOk ? (
            <span className="status-ok">
              Yes. The {tileName(last).toLowerCase()} completes it.{' '}
              {found.length === waits.length ? 'That is every wait.' : `Found ${found.length} of ${waits.length}.`}
            </span>
          ) : (
            <span className="status-bad">
              No. With the {tileName(last).toLowerCase()} there is no way to make four sets and a pair.
            </span>
          )}
        </p>
        {lastOk && last && (
          <button type="button" className="btn" onClick={() => setRevealed(revealed === last ? null : last)}>
            {revealed === last ? 'Back to the rack' : 'Show the sets'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function Sets() {
  return (
    <section className="lesson lesson-drill" aria-labelledby="sets-title">
      <div className="panel">
        <h2 id="sets-title">Sets and a winning hand</h2>
        <p className="lede">
          The goal is simple: hold four <Term id="set">sets</Term> and one <Term id="pair">pair</Term>,
          fourteen tiles in all. Everything else in the game is about getting there first.
        </p>

        <h3>The pieces</h3>
        <div className="piece-list">
          {MELD_EXAMPLES.map((m) => (
            <div key={m.kind} className="piece">
              <div className="piece-tiles" role="img" aria-label={`${m.title}: ${m.tiles.map(tileName).join(', ')}`}>
                {m.tiles.map((t, i) => (
                  <Tile key={i} id={t} size={34} hint decorative />
                ))}
              </div>
              <div>
                <h4>
                  <Term id={m.kind}>{m.title}</Term>
                </h4>
                <p>{m.blurb}</p>
              </div>
            </div>
          ))}
        </div>

        <h3>Putting it together</h3>
        <p>
          Any mix of chows, pungs and kongs works: four chows, four pungs, or anything between. Flip the
          hand between sorted and grouped to see the five pieces hiding in fourteen tiles.
        </p>
        <p>
          Sets you build from your own draws stay hidden in your rack. Sets you complete by claiming a
          discard go face up on the table and stay there. Both count the same toward the four.
        </p>

        <h3>One tile away</h3>
        <p>
          When thirteen tiles need just one more, the hand is <Term id="ready">ready</Term>, and the tiles that
          would finish it are its <Term id="wait">waits</Term>. A one-two waits on a three. A three-four
          waits on a two or a five. Two pairs wait on either one. Try the puzzles; the last one is a
          famous hand that waits on all nine tiles of a suit.
        </p>
      </div>

      <div className="stage">
        <Anatomy />
        <h3 className="stage-heading">Find the wait</h3>
        <WaitPuzzle />
      </div>

    </section>
  )
}
