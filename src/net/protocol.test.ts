import { describe, expect, it } from 'vitest'
import { NAME_MAX, cleanCode, cleanName, parseClientMessage } from './protocol'

describe('codes and names', () => {
  it('normalises codes and refuses look-alikes', () => {
    expect(cleanCode(' ab-cd ')).toBe('ABCD')
    expect(cleanCode('abcd')).toBe('ABCD')
    expect(cleanCode('ABC')).toBeNull()
    expect(cleanCode('ABCDE')).toBeNull()
    expect(cleanCode('AB0D')).toBeNull()
    expect(cleanCode('ABID')).toBeNull()
    expect(cleanCode(42)).toBeNull()
  })

  it('tidies names', () => {
    expect(cleanName('  ')).toBe('Guest')
    expect(cleanName(null)).toBe('Guest')
    expect(cleanName(' Fr\u0007ancis ')).toBe('Francis')
    expect(cleanName('x'.repeat(40))).toHaveLength(NAME_MAX)
  })
})

describe('parseClientMessage', () => {
  it('accepts well-formed messages', () => {
    expect(parseClientMessage({ type: 'join', id: 'p1', name: 'Bo', code: 'abcd' })).toEqual({ type: 'join', id: 'p1', name: 'Bo', code: 'ABCD' })
    expect(parseClientMessage({ type: 'create', id: 'p1', name: '', rules: { minimumFaan: 3, rounds: 4 }, speed: 'slow' })).toEqual({
      type: 'create',
      id: 'p1',
      name: 'Guest',
      rules: { minimumFaan: 3, rounds: 4 },
      speed: 'slow',
    })
    expect(parseClientMessage({ type: 'action', action: { type: 'discard', seat: 2, tile: 'C5' } })).toEqual({
      type: 'action',
      action: { type: 'discard', seat: 2, tile: 'C5' },
    })
    expect(parseClientMessage({ type: 'action', action: { type: 'decide', decisions: { 1: { kind: 'chow', tiles: ['C1', 'C2'] } } } })).toEqual({
      type: 'action',
      action: { type: 'decide', decisions: { 1: { kind: 'chow', tiles: ['C1', 'C2'] } } },
    })
    expect(parseClientMessage({ type: 'start' })).toEqual({ type: 'start' })
    expect(parseClientMessage({ type: 'bot', seat: 3, on: true })).toEqual({ type: 'bot', seat: 3, on: true })
  })

  it('rejects anything else', () => {
    const bad: unknown[] = [
      null,
      'join',
      {},
      { type: 'join' },
      { type: 'join', id: 'p', name: 'x', code: 'AB' },
      { type: 'join', id: '', name: 'x', code: 'ABCD' },
      { type: 'create', id: 'p', name: 'x', rules: { minimumFaan: 3, rounds: 2 }, speed: 'normal' },
      { type: 'create', id: 'p', name: 'x', rules: { minimumFaan: 3, rounds: 4 }, speed: 'warp' },
      { type: 'action', action: { type: 'discard', seat: 4, tile: 'C5' } },
      { type: 'action', action: { type: 'discard', seat: 1, tile: 'XX' } },
      { type: 'action', action: { type: 'newGame', rules: { minimumFaan: 0, rounds: 1 }, seed: 1 } },
      { type: 'action', action: { type: 'decide', decisions: { 1: { kind: 'chow', tiles: ['C1'] } } } },
      { type: 'action', action: { type: 'decide', decisions: { 7: { kind: 'pass' } } } },
      { type: 'sit', seat: '0' },
      { type: 'bot', seat: 0, on: 'yes' },
      { type: 'hack' },
    ]
    for (const b of bad) expect(parseClientMessage(b), JSON.stringify(b)).toBeNull()
  })
})
