import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function walk(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.tsx?$/.test(name) && !name.endsWith('.test.ts') && !name.endsWith('.test.tsx')) out.push(p)
  }
  return out
}

describe('CJK webfont subset', () => {
  it('covers every Chinese character the app can show', () => {
    const html = readFileSync('index.html', 'utf8')
    const m = html.match(/Noto\+Serif\+TC:wght@900&text=([^&"]+)&/)
    expect(m).not.toBeNull()
    const subset = new Set(decodeURIComponent(m![1]))
    const used = new Set<string>()
    for (const f of walk('src')) for (const ch of readFileSync(f, 'utf8').match(/[㐀-鿿]/g) ?? []) used.add(ch)
    const missing = [...used].filter((ch) => !subset.has(ch))
    expect(missing, 'add these to the font subset in index.html').toEqual([])
  })
})
