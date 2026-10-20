import type { LessonId } from '../router'

/** The primer's lessons, in reading order: what each is called and what it covers. */
export const LESSON_INFO: Record<LessonId, { label: string; mark: string; blurb: string }> = {
  tiles: { label: 'The tiles', mark: '1', blurb: 'The three suits, the winds and dragons and the flowers, with a quiz to tell them apart.' },
  sets: { label: 'Sets and a winning hand', mark: '2', blurb: 'Chow, pung, kong and the pair, and finding the tile a hand is waiting for.' },
  round: { label: 'How a round flows', mark: '3', blurb: 'The wall, the deal, drawing and discarding, calls and the end of a hand, step by step.' },
  scoring: { label: 'Scoring basics', mark: '4', blurb: 'Counting faan, the minimum and the limit, and the rare hands.' },
  glossary: { label: 'Glossary', mark: '字', blurb: 'Every term in the lessons, with its Cantonese name.' },
}
