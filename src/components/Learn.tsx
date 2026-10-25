import { LESSON_INFO } from '../primer/catalog'
import { LESSONS } from '../router'
import Link from './Link'

interface Props {
  /** A solo game is saved and would be replaced. */
  inProgress: boolean
  onStart: () => void
}

/** The learn page: what the guided round is, and the way in. */
export default function Learn({ inProgress, onStart }: Props) {
  return (
    <div className="lobby">
      <h2 className="lobby-title">New to mahjong?</h2>
      <p className="lobby-copy">
        Play a guided round. It is one round of the real game against the bots, about five hands and ten minutes,
        and the coach picks every move for you: one tile glows, the line above your rack says why, and in a claim
        window only the right button works.
      </p>
      <ul className="learn-list">
        <li>What a hand is: four sets and a pair, and why some tiles are worth keeping.</li>
        <li>The rule of thumb: good-looking hands score more. One suit, all pungs, dragons and your own wind.</li>
        <li>Taking a discard for a pung or a chow, and when to pass instead.</li>
        <li>Winning, and how the faan and the points are counted.</li>
        <li>The second hand: the deal moving round, and the seat winds with it.</li>
      </ul>
      {inProgress && <p className="lobby-foot">This replaces the solo game you have going.</p>}
      <div className="lobby-actions">
        <button
          type="button"
          className="act act-primary"
          onClick={() => {
            if (inProgress && !window.confirm('Start the guided round? It replaces the solo game you have going.')) return
            onStart()
          }}
        >
          Play a guided round
        </button>
      </div>

      <h3 className="lobby-sub">Prefer to read first?</h3>
      <p className="lobby-copy">Five short lessons, from the tiles to the scoring, each with something to try.</p>
      <ol className="lesson-list">
        {LESSONS.map((id) => (
          <li key={id}>
            <Link page={`learn/${id}`} className="lesson-link">
              <span className="lesson-mark" aria-hidden="true">
                {LESSON_INFO[id].mark}
              </span>
              <span>
                <span className="lesson-title">{LESSON_INFO[id].label}</span>
                <span className="lesson-blurb">{LESSON_INFO[id].blurb}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}
