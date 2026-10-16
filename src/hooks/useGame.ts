import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { aiDecisions, aiTurn } from '../engine/ai'
import {
  DEFAULT_RULES,
  newGame,
  reduce,
  type Action,
  type Decision,
  type GameState,
  type Rules,
  type Seat,
} from '../engine/game'
import { randomSeed } from '../engine/rng'
import type { StandardId } from '../engine/tiles'

/** The person always sits at seat 0. */
export const HUMAN: Seat = 0

export type Speed = 'slow' | 'normal' | 'fast'
export interface Settings {
  speed: Speed
  rules: Rules
  sound: boolean
}
export const DEFAULT_SETTINGS: Settings = { speed: 'normal', rules: DEFAULT_RULES, sound: true }

const DELAY: Record<Speed, number> = { slow: 1300, normal: 700, fast: 220 }

const GAME_KEY = 'pung.game.v1'
const SETTINGS_KEY = 'pung.settings.v1'

function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private mode or full: play on without saving */
  }
}
function clear(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

function isGameState(x: unknown): x is GameState {
  return !!x && typeof x === 'object' && Array.isArray((x as GameState).players) && (x as GameState).players.length === 4
}

export function useGame() {
  const [settings, setSettingsState] = useState<Settings>(() => ({
    ...DEFAULT_SETTINGS,
    ...(load<Partial<Settings>>(SETTINGS_KEY) ?? {}),
  }))
  const [state, dispatchRaw] = useReducer(
    (s: GameState | null, a: Action | { type: 'quit' }) => (a.type === 'quit' ? null : s ? reduce(s, a) : a.type === 'newGame' ? reduce(newGame(), a) : s),
    null,
    () => {
      const saved = load<unknown>(GAME_KEY)
      return isGameState(saved) && saved.phase !== 'gameEnd' ? saved : null
    },
  )
  // The person has picked a tile but not yet thrown it.
  const [selected, setSelected] = useState<StandardId | null>(null)

  const dispatch = useCallback((a: Action | { type: 'quit' }) => {
    setSelected(null)
    dispatchRaw(a)
  }, [])

  useEffect(() => {
    if (state) save(GAME_KEY, state)
    else clear(GAME_KEY)
  }, [state])
  useEffect(() => save(SETTINGS_KEY, settings), [settings])

  const delay = DELAY[settings.speed]

  // Let the opponents move.
  useEffect(() => {
    if (!state) return
    if (state.phase === 'discard' && state.current !== HUMAN) {
      const seat = state.current
      const t = setTimeout(() => dispatchRaw(aiTurn(state, seat)), delay)
      return () => clearTimeout(t)
    }
    if (state.phase === 'claim' && state.claim) {
      const pending = aiDecisions(state, HUMAN)
      if (Object.keys(pending).length === 0) return
      const humanWaiting = !!state.claim.options[HUMAN] && !state.claim.decisions[HUMAN]
      // Decide at once when the person must still answer; otherwise pause so the discard can be seen.
      const t = setTimeout(() => dispatchRaw({ type: 'decide', decisions: pending }), humanWaiting ? 0 : delay * 0.9)
      return () => clearTimeout(t)
    }
  }, [state, delay])

  const api = useMemo(
    () => ({
      start(rules: Rules) {
        dispatch({ type: 'newGame', rules, seed: randomSeed() })
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
      select(tile: StandardId | null) {
        setSelected(tile)
      },
      setSettings(patch: Partial<Settings>) {
        setSettingsState((s) => ({ ...s, ...patch }))
      },
    }),
    [dispatch],
  )

  return { state, settings, selected, ...api }
}
