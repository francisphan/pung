/**
 * Build public/tiles.svg, a sprite of classic tile faces, from Cangjie6's
 * SVGs on Wikimedia Commons (CC BY-SA 4.0). Usage:
 *
 *   node scripts/build-tiles.mjs <directory with the downloaded MJ*.svg files>
 *
 * The Commons file names map to this app's tile ids as listed in FACES.
 * Each file is optimised with svgo, its ids prefixed so gradients do not
 * collide, and wrapped in a <symbol> whose id is the tile id.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { optimize } from 'svgo'

const src = process.argv[2]
if (!src) {
  console.error('usage: node scripts/build-tiles.mjs <dir>')
  process.exit(1)
}

const FACES = {
  // characters 萬
  C1: 'MJw1-.svg', C2: 'MJw2-.svg', C3: 'MJw3-.svg', C4: 'MJw4-.svg', C5: 'MJw5-.svg', C6: 'MJw6-.svg', C7: 'MJw7-.svg', C8: 'MJw8-.svg', C9: 'MJw9-.svg',
  // dots 筒
  D1: 'MJt1-.svg', D2: 'MJt2-.svg', D3: 'MJt3-.svg', D4: 'MJt4-.svg', D5: 'MJt5-.svg', D6: 'MJt6-.svg', D7: 'MJt7-.svg', D8: 'MJt8-.svg', D9: 'MJt9-.svg',
  // bamboo 索
  B1: 'MJs1-.svg', B2: 'MJs2-.svg', B3: 'MJs3-.svg', B4: 'MJs4-.svg', B5: 'MJs5-.svg', B6: 'MJs6-.svg', B7: 'MJs7-.svg', B8: 'MJs8-.svg', B9: 'MJs9-.svg',
  // winds 東南西北
  WE: 'MJf1-.svg', WS: 'MJf2-.svg', WW: 'MJf3-.svg', WN: 'MJf4-.svg',
  // dragons 中發白
  RD: 'MJd1-.svg', GD: 'MJd2-.svg', WD: 'MJd3-.svg',
  // seasons 春夏秋冬 and flowers 梅蘭菊竹
  S1: 'MJh1-.svg', S2: 'MJh2-.svg', S3: 'MJh3-.svg', S4: 'MJh4-.svg',
  F1: 'MJh5-.svg', F2: 'MJh6-.svg', F3: 'MJh7-.svg', F4: 'MJh8-.svg',
  // face down
  BACK: 'MJhide.svg',
}

let symbols = ''
let total = 0
for (const [id, file] of Object.entries(FACES)) {
  const raw = readFileSync(join(src, file), 'utf8')
  const { data } = optimize(raw, {
    multipass: true,
    plugins: [
      { name: 'preset-default', params: { overrides: { cleanupIds: false, inlineStyles: { onlyMatchedOnce: false } } } },
      'removeDimensions',
      'removeXMLNS',
      { name: 'prefixIds', params: { prefix: id.toLowerCase(), delim: '-' } },
      { name: 'removeAttrs', params: { attrs: ['enable-background', 'xml:space', 'version', 'x', 'y', 'id'] } },
    ],
  })
  const m = data.match(/^<svg([^>]*)>([\s\S]*)<\/svg>\s*$/)
  if (!m) throw new Error(`unexpected svgo output for ${file}`)
  const vb = m[1].match(/viewBox="([^"]+)"/)
  if (!vb) throw new Error(`no viewBox in ${file}`)
  const inner = m[2].trim()
  symbols += `<symbol id="${id}" viewBox="${vb[1]}">${inner}</symbol>\n`
  total += inner.length
}

const out = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<!-- Classic mahjong tile faces by Cangjie6 (dots after Jerry Crimson Mann), Wikimedia Commons, CC BY-SA 4.0. See CREDITS.md. Built by scripts/build-tiles.mjs. -->
${symbols}</svg>
`
writeFileSync('public/tiles.svg', out)
console.log(`wrote public/tiles.svg: ${Object.keys(FACES).length} symbols, ${(out.length / 1024).toFixed(0)} KB`)
