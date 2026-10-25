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

  it('bursts a pung over the board with the caller’s name, and lays the set down at the seat', () => {
    const { container, rerender } = render(table(pung.before))
    expect(container.querySelector('.shout')).toBeNull()
    rerender(table(pung.after))
    const e = pung.after.log[pung.after.log.length - 1]
    if (e.kind !== 'pung') throw new Error('not a pung')
    const shouts = Array.from(container.querySelectorAll('.shout-pung'))
    expect(shouts).toHaveLength(1)
    const shout = shouts[0]
    expect(shout).toHaveTextContent('碰')
    expect(shout).toHaveTextContent('Pung!')
    expect(shout).toHaveAttribute('aria-hidden', 'true')
    // On the board, not at a seat, and it says who called.
    expect(shout.closest('.rivers')).not.toBeNull()
    expect(shout.closest('section')).toBeNull()
    expect(shout.querySelector('.shout-by')).toHaveTextContent(SOLO.names[e.seat])
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
    expect(shout?.querySelector('.shout-by')).toHaveTextContent(SOLO.names[r.winner])
    expect(container.querySelectorAll('.shower-tile')).toHaveLength(SHOWER_SIZE)
    expect(container.querySelector(r.winner === SOLO.me ? '.you-winner' : '.seat-winner')).not.toBeNull()
  })
})
