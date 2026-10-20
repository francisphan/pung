import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import Primer from './Primer'

describe('Primer', () => {
  it('shows the tiles lesson and answers its quiz', async () => {
    render(<Primer lesson="tiles" />)
    expect(screen.getByRole('heading', { name: 'The tiles' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Red dragon' }).length).toBeGreaterThan(0)
    const group = screen.getByRole('group', { name: 'Which tile is this?' })
    const options = group.querySelectorAll('button')
    expect(options).toHaveLength(4)
    await userEvent.click(options[0])
    expect(screen.getByText(/Right\.|Not quite/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next tile' })).toBeEnabled()
  })

  it('finds a wait and shows the sets', async () => {
    render(<Primer lesson="sets" />)
    await userEvent.click(screen.getByRole('button', { name: /^Four of dots/ }))
    expect(screen.getByText(/there is no way to make four sets/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Three of dots/ }))
    expect(screen.getByText(/completes it/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Show the sets' }))
    expect(screen.getByRole('button', { name: 'Back to the rack' })).toBeInTheDocument()
  })

  it('steps through a round', async () => {
    render(<Primer lesson="round" />)
    expect(screen.getByText(/Step 1 of/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText(/Step 2 of/)).toBeInTheDocument()
  })

  it('checks a faan count', async () => {
    render(<Primer lesson="scoring" />)
    await userEvent.click(screen.getByRole('radio', { name: /Three of everything/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: /All pungs/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Check my count' }))
    expect(screen.getByText(/Right: 3 faan/)).toBeInTheDocument()
  })

  it('lists the glossary and links every lesson', () => {
    render(<Primer lesson="glossary" />)
    expect(screen.getByRole('heading', { name: 'Glossary' })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Lessons' })
    const links = nav.querySelectorAll('a')
    expect(links).toHaveLength(5)
    expect(links[4]).toHaveAttribute('aria-current', 'page')
    expect(links[0]).toHaveAttribute('href', expect.stringMatching(/learn\/tiles\/$/))
  })
})
