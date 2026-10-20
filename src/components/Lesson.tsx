interface Props {
  title: string
  body: string[]
  onDone: () => void
}

/** A short lesson from the coach. The table waits until it is dismissed. */
export default function Lesson({ title, body, onDone }: Props) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="lesson-title">
      <div className="card card-lesson">
        <span className="coach-tag">Coach</span>
        <h2 id="lesson-title" className="card-title">
          {title}
        </h2>
        {body.map((text, i) => (
          <p key={i} className="lesson-text">
            {text}
          </p>
        ))}
        <div className="card-actions">
          <button type="button" className="act act-primary" onClick={onDone} autoFocus>
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
