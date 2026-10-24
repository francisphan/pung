import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameState } from '../engine/game'
import { playUntil } from '../test/play'
import { CELEBRATION_MS, useCelebration } from './useCelebration'

describe('useCelebration', () => {
  const { before, after } = playUntil(5, (s) => s.phase === 'handEnd' && s.result?.kind === 'win')
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('holds the result back for a moment after a win seen at the table', () => {
    const { result, rerender } = renderHook(({ s }: { s: GameState | null }) => useCelebration(s), { initialProps: { s: before } })
    expect(result.current).toBe(false)
    rerender({ s: after })
    expect(result.current).toBe(true)
    act(() => vi.advanceTimersByTime(CELEBRATION_MS))
    expect(result.current).toBe(false)
  })

  it('does not celebrate a hand found already over', () => {
    const { result } = renderHook(() => useCelebration(after))
    expect(result.current).toBe(false)
    act(() => vi.advanceTimersByTime(CELEBRATION_MS))
    expect(result.current).toBe(false)
  })

  it('celebrates the same hand again when it is played again, as a guided round is', () => {
    const { result, rerender } = renderHook(({ s }: { s: GameState | null }) => useCelebration(s), { initialProps: { s: null as GameState | null } })
    rerender({ s: after })
    expect(result.current).toBe(true)
    act(() => vi.advanceTimersByTime(CELEBRATION_MS))
    expect(result.current).toBe(false)
    rerender({ s: null })
    rerender({ s: after })
    expect(result.current).toBe(true)
  })
})
