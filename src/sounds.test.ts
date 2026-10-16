import { existsSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TAKES } from './sound'

describe('table sound files', () => {
  it('exist for every cue and stay small', () => {
    let total = 0
    for (const files of Object.values(TAKES))
      for (const f of files) {
        const p = `public/sounds/${f}`
        expect(existsSync(p), p).toBe(true)
        total += statSync(p).size
      }
    expect(total).toBeLessThan(400 * 1024)
  })
})
