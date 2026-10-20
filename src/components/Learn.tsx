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
      <div className="lobby-actions">
        <button type="button" className="act act-primary" onClick={onStart}>
          Play a guided round
        </button>
      </div>
      {inProgress && <p className="lobby-foot">This replaces the solo game you have going.</p>}
      <p className="lobby-foot">
        Prefer to read first? <a href="https://francisphan.github.io/sparrow/">Sparrow</a> teaches the tiles, the sets
        and the scoring from scratch.
      </p>
    </div>
  )
}
