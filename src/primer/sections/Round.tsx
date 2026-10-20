import { useState } from 'react'
import Table from '../components/Table'
import Term from '../components/Term'
import { FRAMES } from '../data/round'

export default function Round() {
  const [step, setStep] = useState(0)
  const frame = FRAMES[step]
  const last = FRAMES.length - 1

  return (
    <section className="lesson" aria-labelledby="round-title">
      <div className="panel">
        <h2 id="round-title">How a round flows</h2>
        <p className="lede">
          Four players, one <Term id="wall">wall</Term>, and the same short turn over and over: draw one,
          discard one. Step through a hand on the left. You sit at the bottom.
        </p>

        <h3>Seats and winds</h3>
        <p>
          Each seat has a wind. The <Term id="dealer">dealer</Term> is East, and going to the right the
          others are South, West and North. Turns go the same way, to the right. Your seat wind matters for
          scoring, and so does the <Term id="prevailing-wind">prevailing wind</Term> of the round, which starts
          at East and moves on once everyone has dealt.
        </p>

        <h3>Wall and deal</h3>
        <p>
          All 144 tiles are shuffled face down and built into four walls, two tiles high. The dealer rolls
          dice to choose where the wall opens, then everyone takes thirteen tiles, and the dealer one more.
          Any flowers or seasons you were dealt go face up beside you, and you take replacements.
        </p>

        <h3>Draw and discard</h3>
        <p>
          On your turn, <Term id="draw">draw</Term> the next tile from the wall. If it helps, keep it and{' '}
          <Term id="discard">discard</Term> something else; if not, discard it. Discards go face up in front
          of you, so everyone can see what has gone. The dealer skips the first draw, having fourteen already.
        </p>

        <h3>Calling a discard</h3>
        <p>
          The tile someone just threw can be claimed instead of drawing. That is a <Term id="call">call</Term>,
          and the rules about who may call are the heart of the game:
        </p>
        <ul className="watch">
          <li>
            <strong>Chow</strong>: only from the player on your left, the one who plays just before you.
          </li>
          <li>
            <strong>Pung</strong> and <strong>kong</strong>: from anyone at the table.
          </li>
          <li>
            <strong>Win</strong>: from anyone, if that tile completes your hand.
          </li>
        </ul>
        <p>
          A claimed set goes face up and stays there. After a call, the caller discards, and play carries on
          from the caller’s right. Anyone in between is skipped.
        </p>

        <h3>When two players want the same tile</h3>
        <p>
          A win beats a pung or kong, and a pung or kong beats a chow. Seat order does not matter. Call
          quickly: once the next player has drawn, the discard is gone for good.
        </p>

        <h3>Ending the hand</h3>
        <p>
          Someone <Term id="win">wins</Term>, or the wall runs out and nobody scores. If the dealer won, the
          dealer deals again. Otherwise the deal passes to the right and everyone’s seat wind shifts. A full
          game is four rounds, at least sixteen hands.
        </p>
      </div>

      <div className="stage">
        <div className="stage-bar">
          <p className="drill-status">
            Step {step + 1} of {FRAMES.length}: {frame.title}
          </p>
          <div className="stage-actions">
            <button type="button" className="btn btn-quiet" onClick={() => setStep((s) => Math.max(0, s - 1))} aria-disabled={step === 0}>
              Back
            </button>
            <button type="button" className="btn" onClick={() => setStep((s) => Math.min(last, s + 1))} aria-disabled={step === last}>
              Next
            </button>
          </div>
        </div>
        <Table frame={frame} />
        <p className="phase-blurb" aria-live="polite">
          {frame.caption}
        </p>
        <ol className="steps" aria-label="Steps">
          {FRAMES.map((f, i) => (
            <li key={f.id}>
              <button
                type="button"
                className={`step${i === step ? ' step-on' : ''}`}
                aria-current={i === step ? 'step' : undefined}
                onClick={() => setStep(i)}
              >
                <small>{i + 1}</small>
                {f.title}
              </button>
            </li>
          ))}
        </ol>
      </div>

    </section>
  )
}
