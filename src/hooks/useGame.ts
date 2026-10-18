import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { aiDecisions, aiTurn } from '../engine/ai'
import { DEFAULT_RULES, newGame, reduce, type Action, type Decision, type GameState, type Rules } from '../engine/game'
import { randomSeed } from '../engine/rng'
import type { StandardId } from '../engine/tiles'
import { EMPTY_LOG, withState, type LogHistory } from '../log'
import { track, trackRules } from '../metrics'
import { SOLO } from '../names'
import { BOT_DELAY } from '../pace'

/** In solo play the person always sits at East. */
const HUMAN = SOLO.me

export interface Settings {
  rules: Rules
  sound: boolean
  /** Show the table log beside the rack. */
  log: boolean
  /** The name used at online tables. */
  name: string
}
export const DEFAULT_SETTINGS: Settings = {
  rules: DEFAULT_RULES,
  sound: true,
  log: true,
  name: '',
}

const GAME_KEY = 'pung.game.v1'
const SETTINGS_KEY = 'pung.settings.v1'

export function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private mode or full: play on without saving */
  }
}
export function clear(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

function isGameState(x: unknown): x is GameState {
  return !!x && typeof x === 'object' && Array.isArray((x as GameState).players) && (x as GameState).players.length === 4
}

interface Solo {
  game: GameState | null
  log: LogHistory
}
type SoloAction = Action | { type: 'quit' }

function step(s: Solo, a: SoloAction): Solo {
  if (a.type === 'quit') return { game: null, log: EMPTY_LOG }
  if (a.type === 'newGame') {
    const game = newGame(a.rules, a.seed)
    return { game, log: withState(EMPTY_LOG, game) }
  }
  if (!s.game) return s
  const game = reduce(s.game, a)
  return { game, log: withState(s.log, game) }
}

/** The settings every mode shares, remembered in the browser. */
export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(() => ({
    ...DEFAULT_SETTINGS,
    ...(load<Partial<Settings>>(SETTINGS_KEY) ?? {}),
  }))
  useEffect(() => save(SETTINGS_KEY, settings), [settings])
  const setSettings = useCallback((patch: Partial<Settings>) => setSettingsState((s) => ({ ...s, ...patch })), [])
  return { settings, setSettings }
}

/** Solo play: you against three opponents, run entirely in the browser. */
export function useGame() {
  const [{ game: state, log }, dispatch] = useReducer(step, null, (): Solo => {
    const saved = load<unknown>(GAME_KEY)
    const game = isGameState(saved) && saved.phase !== 'gameEnd' ? saved : null
    return { game, log: game ? withState(EMPTY_LOG, game) : EMPTY_LOG }
  })

  useEffect(() => {
    if (state) save(GAME_KEY, state)
    else clear(GAME_KEY)
  }, [state])

  const delay = BOT_DELAY

  // Count each hand's outcome and the end of the game, once.
  const counted = useRef<string | null>(null)
  useEffect(() => {
    if (!state) return
    const key = state.phase === 'gameEnd' ? `${state.seed}:end` : state.phase === 'handEnd' ? `${state.seed}:${state.handIndex}` : null
    if (!key || counted.current === key) return
    counted.current = key
    if (state.phase === 'gameEnd') track('game/end', 'Game played to the end')
    else if (state.result?.kind === 'draw') track('hand/draw', 'Hand drawn')
    else if (state.result) track(state.result.winner === HUMAN ? 'hand/win/person' : 'hand/win/bot', 'Hand won')
  }, [state])

  // Let the opponents move.
  useEffect(() => {
    if (!state) return
    if (state.phase === 'discard' && state.current !== HUMAN) {
      const seat = state.current
      const t = setTimeout(() => dispatch(aiTurn(state, seat)), delay)
      return () => clearTimeout(t)
    }
    if (state.phase === 'claim' && state.claim) {
      const pending = aiDecisions(state, HUMAN)
      if (Object.keys(pending).length === 0) return
      const humanWaiting = !!state.claim.options[HUMAN] && !state.claim.decisions[HUMAN]
      // Decide at once when the person must still answer; otherwise pause so the discard can be seen.
      const t = setTimeout(() => dispatch({ type: 'decide', decisions: pending }), humanWaiting ? 0 : delay * 0.9)
      return () => clearTimeout(t)
    }
  }, [state, delay])

  const api = useMemo(
    () => ({
      start(rules: Rules) {
        dispatch({ type: 'newGame', rules, seed: randomSeed() })
        track('deal/solo', 'Solo game dealt')
        trackRules(rules)
      },
      quit() {
        dispatch({ type: 'quit' })
      },
      discard(tile: StandardId) {
        dispatch({ type: 'discard', seat: HUMAN, tile })
      },
      selfWin() {
        dispatch({ type: 'selfWin', seat: HUMAN })
      },
      kong(tile: StandardId) {
        dispatch({ type: 'kong', seat: HUMAN, tile })
      },
      decide(d: Decision) {
        dispatch({ type: 'decide', decisions: { [HUMAN]: d } })
      },
      nextHand() {
        dispatch({ type: 'nextHand' })
      },
    }),
    [],
  )

  return { state, log, ...api }
}
