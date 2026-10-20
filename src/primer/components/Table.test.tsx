import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Table from './Table'
import { FRAMES } from '../data/round'

describe('Table', () => {
  it('renders every frame with 144 tiles', () => {
    for (const f of FRAMES) {
      const { container, unmount } = render(<Table frame={f} />)
      expect(container.querySelectorAll('.tt-tile'), f.id).toHaveLength(144)
      unmount()
    }
  })

  it('describes your hand to assistive tech', () => {
    render(<Table frame={FRAMES[FRAMES.length - 1]} />)
    expect(screen.getByRole('img', { name: /Your hand: One of dots, Two of dots, Three of dots/ })).toBeInTheDocument()
  })

  it('shows the callouts of the priority frame', () => {
    const f = FRAMES.find((x) => x.id === 'priority')!
    render(<Table frame={f} />)
    expect(screen.getByText('Pung!')).toBeInTheDocument()
    expect(screen.getByText('Chow?')).toBeInTheDocument()
  })
})
