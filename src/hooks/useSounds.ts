import { useEffect, useRef } from 'react'
import type { GameState } from '../engine/game'
import { play, setMuted, unlock } from '../sound'
import { cuesFor, markOf, type SoundMark } from '../soundCues'

/** Plays the table sounds that follow from each change of state. */
export function useSounds(state: GameState | null, enabled: boolean) {
  const mark = useRef<SoundMark | null>(null)
  // A game that is already on the table when the page opens resumes quietly;
  // a deal made from the lobby gets the wash.
  const opening = useRef(true)

  useEffect(() => {
    setMuted(!enabled)
  }, [enabled])

  // Browsers only let sound start after a gesture; take the first one.
  // Safari on iPad counts touchend and click, so listen for those as well.
  useEffect(() => {
    const events = ['touchend', 'click', 'keydown', 'pointerdown'] as const
    const once = () => {
      unlock()
      for (const e of events) window.removeEventListener(e, once)
    }
    for (const e of events) window.addEventListener(e, once)
    return () => {
      for (const e of events) window.removeEventListener(e, once)
    }
  }, [])

  useEffect(() => {
    if (!state) {
      mark.current = null
      opening.current = false
      return
    }
    if (mark.current === null && !opening.current) play('deal')
    else for (const c of cuesFor(mark.current, state)) play(c.cue, c.at)
    mark.current = markOf(state)
    opening.current = false
  }, [state])
}
