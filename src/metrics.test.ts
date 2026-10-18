import { afterEach, describe, expect, it, vi } from 'vitest'
import { track, trackRules } from './metrics'

describe('metrics', () => {
  afterEach(() => {
    delete window.goatcounter
  })

  it('does nothing without the counting script', () => {
    expect(() => track('deal/solo')).not.toThrow()
  })

  it('counts named events once the script is there', () => {
    const count = vi.fn()
    window.goatcounter = { count }
    track('deal/solo', 'A solo game')
    trackRules({ minimumFaan: 3, rounds: 4 })
    expect(count).toHaveBeenCalledWith({ path: 'deal/solo', title: 'A solo game', event: true })
    expect(count).toHaveBeenCalledWith({ path: 'rules/min-3', title: 'Minimum 3 faan', event: true })
    expect(count).toHaveBeenCalledWith({ path: 'rules/rounds-4', title: 'Four rounds', event: true })
  })

  it('never lets a failing counter break the game', () => {
    window.goatcounter = {
      count: () => {
        throw new Error('boom')
      },
    }
    expect(() => track('hand/draw')).not.toThrow()
  })
})
