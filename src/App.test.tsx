import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  beforeEach(() => localStorage.clear())

  it('opens on the lobby and deals a hand', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByRole('heading', { name: /sit down at the table/i })).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /any hand/i }))
    await user.click(screen.getByRole('button', { name: 'Deal' }))
    const hand = screen.getByRole('group', { name: 'Your tiles' })
    expect(within(hand).getAllByRole('button')).toHaveLength(14)
    expect(screen.getByRole('status')).toHaveTextContent(/your turn/i)
    expect(screen.getByText('East round')).toBeInTheDocument()
  })

  it('picks a tile on the first tap and discards it on the second', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Deal' }))
    const hand = screen.getByRole('group', { name: 'Your tiles' })
    const first = within(hand).getAllByRole('button')[0]
    await user.click(first)
    expect(first).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('status')).toHaveTextContent(/again to discard/i)
    await user.click(first)
    const river = screen.getByRole('img', { name: /^Your discards/ })
    expect(river).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Your tiles' })).getAllByRole('button')).toHaveLength(13)
  })

  it('plays a guided round on rails', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Play a guided round' }))
    const lesson = screen.getByRole('dialog', { name: 'Welcome to the table' })
    expect(lesson).toHaveTextContent(/four sets/)
    await user.click(within(lesson).getByRole('button', { name: 'Got it' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Guided round')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/Coach.*Throw the/)
    const hand = screen.getByRole('group', { name: 'Your tiles' })
    const live = within(hand).getAllByRole('button').filter((b) => !(b as HTMLButtonElement).disabled)
    expect(live).toHaveLength(1)
    expect(live[0]).toHaveAccessibleName(/the coach's pick/)
    await user.click(live[0])
    await user.click(live[0])
    expect(within(screen.getByRole('group', { name: 'Your tiles' })).getAllByRole('button')).toHaveLength(13)
  })

  it('remembers the game across a reload', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await user.click(screen.getByRole('button', { name: 'Deal' }))
    unmount()
    render(<App />)
    expect(screen.queryByRole('heading', { name: /sit down at the table/i })).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Your tiles' })).toBeInTheDocument()
  })
})
