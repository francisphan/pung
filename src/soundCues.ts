import type { GameState } from './engine/game'
import { HUMAN } from './hooks/useGame'
import type { Cue } from './sound'

export interface SoundMark {
  hand: number
  log: number
  drawn: string | null
}

export interface ScheduledCue {
  cue: Cue
  at: number
}

export function markOf(s: GameState): SoundMark {
  const drawn = s.phase === 'discard' && s.current === HUMAN && s.drawn ? `${s.log.length}:${s.drawn}` : null
  return { hand: s.handIndex, log: s.log.length, drawn }
}

/**
 * Which sounds a change of state calls for, with a short stagger when
 * several things happened in one step. Pure, so it can be tested.
 */
export function cuesFor(prev: SoundMark | null, s: GameState): ScheduledCue[] {
  const out: ScheduledCue[] = []
  if (!prev) return out
  if (prev.hand !== s.handIndex) {
    out.push({ cue: 'deal', at: 0 })
    return out
  }
  let at = 0
  const step = () => {
    const t = at
    at += 0.1
    return t
  }
  for (const e of s.log.slice(prev.log)) {
    switch (e.kind) {
      case 'discard':
        out.push({ cue: 'discard', at: step() })
        break
      case 'chow':
      case 'pung':
        out.push({ cue: 'claim', at: step() })
        break
      case 'kong':
      case 'concealedKong':
      case 'addedKong':
        out.push({ cue: 'kong', at: step() })
        break
      case 'flower':
        out.push({ cue: 'flower', at: step() })
        break
      case 'win':
        out.push({ cue: 'win', at: step() })
        break
      case 'exhausted':
        out.push({ cue: 'exhausted', at: step() })
        break
      case 'deal':
        break
    }
  }
  const mark = markOf(s)
  if (mark.drawn && mark.drawn !== prev.drawn) out.push({ cue: 'draw', at })
  return out
}
