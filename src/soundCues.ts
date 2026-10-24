import type { GameState, Seat } from './engine/game'
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

export function markOf(s: GameState, me: Seat = 0): SoundMark {
  const drawn = s.phase === 'discard' && s.current === me && s.drawn ? `${s.log.length}:${s.drawn}` : null
  return { hand: s.handIndex, log: s.log.length, drawn }
}

/**
 * Which sounds a change of state calls for, with a short stagger when
 * several things happened in one step. Pure, so it can be tested.
 */
export function cuesFor(prev: SoundMark | null, s: GameState, me: Seat = 0): ScheduledCue[] {
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
      // A call: the sting lands with the burst, and the tiles clack down after it.
      case 'chow':
      case 'pung': {
        const t = step()
        out.push({ cue: 'shout', at: t }, { cue: 'claim', at: t + 0.18 })
        break
      }
      case 'kong':
      case 'concealedKong':
      case 'addedKong': {
        const t = step()
        out.push({ cue: 'shoutKong', at: t }, { cue: 'kong', at: t + 0.22 })
        break
      }
      case 'flower':
        out.push({ cue: 'flower', at: step() })
        break
      case 'win': {
        const t = step()
        out.push({ cue: 'alert', at: t }, { cue: 'win', at: t + 0.35 })
        break
      }
      case 'exhausted':
        out.push({ cue: 'exhausted', at: step() })
        break
      case 'deal':
        break
    }
  }
  const mark = markOf(s, me)
  if (mark.drawn && mark.drawn !== prev.drawn) out.push({ cue: 'draw', at })
  return out
}
