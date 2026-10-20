import { useState } from 'react'
import HandRow, { type HandLabel, type HandTile } from '../components/HandRow'
import Segmented from '../components/Segmented'
import Term from '../components/Term'
import { SCORING_EXAMPLES } from '../data/hands'
import { LIMIT_FAAN, MINIMUM_FAAN, PATTERNS, RARE_HANDS, scoreHand, type PatternId } from '../data/scoring'
import { sortTiles, tileName } from '../../engine/tiles'
import { track } from '../../metrics'

const WIND_NAME = { east: 'East', south: 'South', west: 'West', north: 'North' } as const

function ScoreDrill() {
  const [exId, setExId] = useState(SCORING_EXAMPLES[0].id)
  const ex = SCORING_EXAMPLES.find((e) => e.id === exId)!
  const [picked, setPicked] = useState<Set<PatternId>>(new Set())
  const [checked, setChecked] = useState(false)

  const score = scoreHand(ex.context)!
  const actual = new Set(score.patterns.map((p) => p.id))

  const tiles: HandTile[] = []
  const labels: HandLabel[] = []
  let slot = 0
  sortTiles(ex.context.hand.concealed).forEach((id, i) => {
    tiles.push({ key: `c${i}`, id, slot: slot++ })
  })
  ex.context.hand.melds.forEach((m, mi) => {
    slot += 0.5
    const start = slot
    m.tiles.forEach((id, i) => tiles.push({ key: `m${mi}-${i}`, id, slot: slot++, state: 'open' }))
    labels.push({ from: start, to: slot, text: `claimed ${m.kind}`, state: 'open' })
  })

  function choose(id: string) {
    setExId(id)
    setPicked(new Set())
    setChecked(false)
  }
  function toggle(id: PatternId) {
    setChecked(false)
    setPicked((p) => {
      const n = new Set(p)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const missed = [...actual].filter((id) => !picked.has(id))
  const extra = [...picked].filter((id) => !actual.has(id))
  const perfect = checked && missed.length === 0 && extra.length === 0
  const ctx = ex.context

  return (
    <div className="drill">
      <Segmented label="Hand" value={exId} onChange={choose} options={SCORING_EXAMPLES.map((e) => ({ value: e.id, label: e.title }))} />
      <HandRow tiles={tiles} slots={Math.max(slot, 15)} labels={labels} hint label="The winning hand" />
      <dl className="facts">
        <dt>Your seat</dt>
        <dd>{WIND_NAME[ctx.seatWind]}</dd>
        <dt>Round</dt>
        <dd>{WIND_NAME[ctx.prevailingWind]}</dd>
        <dt>Won by</dt>
        <dd>{ctx.selfDrawn ? `self-draw, the ${tileName(ctx.winningTile).toLowerCase()}` : `a discard, the ${tileName(ctx.winningTile).toLowerCase()}`}</dd>
      </dl>
      <fieldset className="pattern-list">
        <legend>Which patterns does this hand have?</legend>
        {PATTERNS.map((p) => {
          let mark = ''
          if (checked) {
            if (actual.has(p.id) && picked.has(p.id)) mark = ' pattern-right'
            else if (actual.has(p.id)) mark = ' pattern-missed'
            else if (picked.has(p.id)) mark = ' pattern-extra'
          }
          return (
            <label key={p.id} className={`pattern${mark}`}>
              <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id)} />
              <span className="pattern-name">
                {p.name} <span className="pattern-cjk" lang="zh-Hant">{p.chinese}</span>
              </span>
              <span className="pattern-faan">{p.faan}</span>
            </label>
          )
        })}
      </fieldset>
      <div className="quiz-foot">
        <p className="drill-status" role="status" aria-live="polite">
          {!checked ? (
            `Tick every pattern that applies, then check.`
          ) : perfect ? (
            <span className="status-ok">
              Right: {score.total} faan.{' '}
              {score.meetsMinimum ? `That clears the ${MINIMUM_FAAN}-faan minimum.` : `Not enough to declare at a ${MINIMUM_FAAN}-faan table.`}
            </span>
          ) : (
            <span className="status-bad">
              {missed.length > 0 && `Missed: ${missed.map((id) => PATTERNS.find((p) => p.id === id)!.name.toLowerCase()).join(', ')}. `}
              {extra.length > 0 && `Does not apply: ${extra.map((id) => PATTERNS.find((p) => p.id === id)!.name.toLowerCase()).join(', ')}. `}
              The hand is worth {score.total} faan.
            </span>
          )}
        </p>
        <button
          type="button"
          className="btn"
          onClick={() => {
            if (checked) return
            setChecked(true)
            track(missed.length === 0 && extra.length === 0 ? 'quiz/score/right' : 'quiz/score/wrong', ex.id)
          }}
          aria-disabled={checked}
        >
          Check my count
        </button>
      </div>
      {checked && <p className="note">{ex.lesson}</p>}
    </div>
  )
}

export default function Scoring() {
  return (
    <section className="lesson lesson-drill" aria-labelledby="scoring-title">
      <div className="panel">
        <h2 id="scoring-title">Scoring basics</h2>
        <p className="lede">
          This lesson follows <Term id="hong-kong">Hong Kong</Term> rules, the simplest to count. Riichi
          (Japanese), Chinese Official and American mahjong score differently, though the tiles and sets
          are the same.
        </p>

        <h3>Counting faan</h3>
        <p>
          A winning hand is worth <Term id="faan">faan</Term>. Look at the hand, find every pattern it
          shows, and add them up. Payment doubles with each faan, which is why a seven-faan hand is a big
          deal and a one-faan hand is pocket change. The exact payment table varies, so we stop at counting.
        </p>

        <h3>The common patterns</h3>
        <table className="faan-table">
          <thead>
            <tr>
              <th scope="col">Pattern</th>
              <th scope="col">Faan</th>
              <th scope="col">What it means</th>
            </tr>
          </thead>
          <tbody>
            {PATTERNS.map((p) => (
              <tr key={p.id}>
                <th scope="row">
                  {p.name} <span className="pattern-cjk" lang="zh-Hant">{p.chinese}</span>
                </th>
                <td>{p.faan}</td>
                <td>
                  {p.description}
                  {p.note && <span className="hint"> {p.note}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>Minimum and limit</h3>
        <p>
          Most tables will not let you declare a win below a minimum, and three faan is the most common
          choice, so that is what this app uses. Some play one, and family games often play zero. A hand with
          four sets and a pair but no faan at all is a <Term id="chicken">chicken hand</Term>.
        </p>
        <p>
          At the top, hands are capped at a limit, usually {LIMIT_FAAN} faan. The patterns above still add up
          as normal: a self-drawn, concealed pure one suit is nine.
        </p>

        <h3>The rare hands</h3>
        <p>
          A few hands have a name and a fixed value instead of a count. The three dragon hands are worth ten on
          their own, standing in for all pungs, one suit and the dragon pung. The rest go straight to the
          limit. You will see them once in a long while, so learn to recognise them rather than to chase them.
        </p>
        <table className="faan-table">
          <thead>
            <tr>
              <th scope="col">Hand</th>
              <th scope="col">Faan</th>
              <th scope="col">What it means</th>
            </tr>
          </thead>
          <tbody>
            {RARE_HANDS.map((h) => (
              <tr key={h.name}>
                <th scope="row">
                  {h.name} <span className="pattern-cjk" lang="zh-Hant">{h.chinese}</span>
                </th>
                <td>{h.faan === 'limit' ? 'limit' : h.faan}</td>
                <td>{h.description}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>Flowers and seasons</h3>
        <p>
          Each flower or season you set aside is worth one faan at many tables, and the one matching your
          seat number is worth more. They are left out of the exercise here to keep the counting clean.
        </p>
      </div>

      <div className="stage">
        <ScoreDrill />
      </div>

    </section>
  )
}
