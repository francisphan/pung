import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TILES } from './engine/tiles'

describe('classic tile sprite', () => {
  const svg = readFileSync('public/tiles.svg', 'utf8')
  it('has a symbol for every face and the back', () => {
    for (const t of TILES) expect(svg, t.id).toContain(`<symbol id="${t.id}" viewBox=`)
    expect(svg).toContain('<symbol id="BACK" viewBox=')
  })
  it('carries the attribution and no leftover stylesheet', () => {
    expect(svg).toContain('CC BY-SA 4.0')
    expect(svg).not.toContain('<style')
  })
})
