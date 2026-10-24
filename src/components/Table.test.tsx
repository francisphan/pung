import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GameState } from '../engine/game'
import { EMPTY_LOG } from '../log'
import { SOLO } from '../names'
import { SeatingContext } from '../seat'
import { playUntil } from '../test/play'
import { SHOWER_SIZE } from './Shout'
import Table from './Table'

const noop = () => {}
const table = (state: GameState) => (
  <SeatingContext.Provider value={SOLO}>
    <Table state={state} log={EMPTY_LOG} logOpen={false} onToggleLog={noop} onDiscard={noop} onSelfWin={noop} onKong={noop} onDecide={noop} />
  </SeatingContext.Provider>
)

describe('Table', () => {
  const pung = playUntil(3, (s) => s.log[s.log.length - 1]?.kind === 'pung')
  const win = playUntil(5, (s) => s.phase === 'handEnd' && s.result?.kind === 'win')

  it('does not repeat a call that was already made when the table opened', () => {
    const { container } = render(table(pung.after))
    expect(container.querySelector('.shout')).toBeNull()
    expect(container.querySelector('.meld-fresh')).toBeNull()
  })

  it('stamps a pung over the seat that made it and lays the set down', () => {
    const { container, rerender } = render(table(pung.before))
    expect(container.querySelector('.shout')).toBeNull()
    rerender(table(pung.after))
    const e = pung.after.log[pung.after.log.length - 1]
    if (e.kind !== 'pung') throw new Error('not a pung')
    const shouts = Array.from(container.querySelectorAll('.shout-pung'))
    expect(shouts.length).toBeGreaterThan(0)
    for (const shout of shouts) {
      expect(shout).toHaveTextContent('碰')
      expect(shout).toHaveTextContent('Pung!')
      expect(shout).toHaveAttribute('aria-hidden', 'true')
      // Over the seat that called, in every layout it is drawn in.
      const label = e.seat === SOLO.me ? 'Your hand,' : `${SOLO.names[e.seat]},`
      expect(shout.closest('section')?.getAttribute('aria-label')).toMatch(new RegExp(`^${label}`))
    }
    const fresh = Array.from(container.querySelectorAll('.meld-fresh'))
    expect(fresh.length).toBeGreaterThan(0)
    for (const m of fresh) expect(m.getAttribute('aria-label')).toMatch(/pung of/)
    // The tile taken from the river is laid down last.
    const turned = fresh[0].querySelector('.tile-turned') as HTMLElement
    expect(turned.style.getPropertyValue('--i')).toBe('2')
  })

  it('celebrates a win with the call, a shower of the winning tiles and a ring round the winner', () => {
    const { container, rerender } = render(table(win.before))
    rerender(table(win.after))
    const r = win.after.result
    if (r?.kind !== 'win') throw new Error('not a win')
    expect(container.querySelector('.table-won')).not.toBeNull()
    const shout = container.querySelector('.shout-win')
    expect(shout).toHaveTextContent(r.from === null ? '自摸' : '食糊')
    expect(container.querySelectorAll('.shower-tile')).toHaveLength(SHOWER_SIZE)
    expect(container.querySelector(r.winner === SOLO.me ? '.you-winner' : '.seat-winner')).not.toBeNull()
  })
})
