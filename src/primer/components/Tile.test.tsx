import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Tile from './Tile'
import { TILES, tileName } from '../../engine/tiles'

describe('Tile', () => {
  it('renders every face with its name as alt text', () => {
    for (const t of TILES) {
      const { unmount } = render(<Tile id={t.id} />)
      expect(screen.getByRole('img', { name: tileName(t.id) })).toBeInTheDocument()
      unmount()
    }
  })

  it('draws each face from the classic sprite by tile id', () => {
    const { container } = render(<Tile id="C7" />)
    const use = container.querySelector('use')
    expect(use?.getAttribute('href')).toMatch(/tiles\.svg#C7$/)
  })

  it('shows corner hints only when asked', () => {
    const plain = render(<Tile id="D4" />)
    expect(plain.container.querySelector('.tile-hint')).toBeNull()
    plain.unmount()
    const hinted = render(<Tile id="D4" hint />)
    expect(hinted.container.querySelector('.tile-hint')?.textContent).toBe('4')
    hinted.unmount()
    const wind = render(<Tile id="WN" hint />)
    expect(wind.container.querySelector('.tile-hint')?.textContent).toBe('N')
    wind.unmount()
    const dragon = render(<Tile id="RD" hint />)
    expect(dragon.container.querySelector('.tile-hint')).toBeNull()
  })

  it('renders a face-down back from the sprite', () => {
    const { container } = render(<Tile id="D4" back />)
    expect(screen.getByRole('img', { name: 'Face-down tile' })).toBeInTheDocument()
    expect(container.querySelector('use')?.getAttribute('href')).toMatch(/tiles\.svg#BACK$/)
  })
})
