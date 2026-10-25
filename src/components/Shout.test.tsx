import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { burstPoints } from '../burst'
import Shout from './Shout'

describe('Shout', () => {
  it('draws a burst with every spike inside its box', () => {
    const pts = burstPoints(14, 220, 140).split(' ')
    expect(pts).toHaveLength(28)
    for (const p of pts) {
      const [x, y] = p.split(',').map(Number)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(220)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(140)
    }
    // Long and short spikes alternate: the first point is the top spike, the second sits well inside.
    expect(Number(pts[0].split(',')[1])).toBeLessThan(15)
    expect(Number(pts[1].split(',')[1])).toBeGreaterThan(15)
  })

  it('bursts bigger for a win, with a second burst behind, and says self-drawn in its own words', () => {
    const call = { id: '0:3', seat: 1 as const, kind: 'win' as const, tile: 'C1' as const, own: true, meld: null }
    const { container } = render(<Shout call={call} />)
    expect(container.querySelector('.shout-win')).toHaveTextContent('Self-drawn!')
    expect(container.querySelector('.shout-cjk')).toHaveTextContent('自摸')
    expect(container.querySelector('.burst-back')).not.toBeNull()
    const { container: pung } = render(<Shout call={{ ...call, kind: 'pung', own: false }} />)
    expect(pung.querySelector('.burst-back')).toBeNull()
    expect(pung.querySelector('.shout-cjk')).toHaveTextContent('碰')
  })

  it('tags the burst with the caller’s name when given one', () => {
    const call = { id: '0:4', seat: 2 as const, kind: 'chow' as const, tile: 'B3' as const, own: false, meld: 0 }
    const { container } = render(<Shout call={call} by="Bo" />)
    expect(container.querySelector('.shout-by')).toHaveTextContent('Bo')
    const { container: plain } = render(<Shout call={call} />)
    expect(plain.querySelector('.shout-by')).toBeNull()
  })
})
