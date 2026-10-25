import { useEffect } from 'react'
import Link from '../components/Link'
import { track } from '../metrics'
import { LESSONS, type LessonId } from '../router'
import { LESSON_INFO } from './catalog'
import Glossary from './sections/Glossary'
import Round from './sections/Round'
import Scoring from './sections/Scoring'
import Sets from './sections/Sets'
import Tiles from './sections/Tiles'
import './primer.css'

/** The primer: five lessons for someone who has never seen a tile, each at its own address under /learn/. */
export default function Primer({ lesson }: { lesson: LessonId }) {
  // Which lessons get read; a glossary anchor (#term-chow) scrolls to its entry.
  useEffect(() => {
    track(`lesson/${lesson}`, LESSON_INFO[lesson].label)
    const h = window.location.hash.replace('#', '')
    if (h.startsWith('term-')) document.getElementById(h)?.scrollIntoView()
  }, [lesson])
  const next: LessonId | undefined = LESSONS[LESSONS.indexOf(lesson) + 1]

  return (
    <div className="primer">
      <nav className="tabs" aria-label="Lessons">
        {LESSONS.map((id) => (
          <Link key={id} page={`learn/${id}`} className="tab" current={lesson === id}>
            <span className="tab-mark" aria-hidden="true">
              {LESSON_INFO[id].mark}
            </span>
            <span className="tab-label">{LESSON_INFO[id].label}</span>
          </Link>
        ))}
      </nav>
      {lesson === 'tiles' && <Tiles />}
      {lesson === 'sets' && <Sets />}
      {lesson === 'round' && <Round />}
      {lesson === 'scoring' && <Scoring />}
      {lesson === 'glossary' && <Glossary />}
      <p className="primer-next">
        {next ? (
          <>
            Next lesson: <Link page={`learn/${next}`}>{LESSON_INFO[next].label}</Link>
          </>
        ) : (
          <>
            That was the last lesson. <Link page="learn">Back to Learn to play</Link>
          </>
        )}
      </p>
      <p className="primer-foot">
        Ready to try it? <Link page="learn">Play a guided round</Link>, where the coach picks every move and says why, or{' '}
        <Link page="home">deal a game</Link>.
      </p>
    </div>
  )
}
