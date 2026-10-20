/** "Name that tile": one question at a time with plausible wrong answers. */
import { TILES, TILE_BY_ID, tileName, type TileId } from '../../engine/tiles'

export interface Question {
  tile: TileId
  /** Four names, shuffled; one is correct. */
  options: TileId[]
}

export type Rng = () => number

function pick<T>(arr: readonly T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)]
}

function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Tiles a beginner is likely to confuse with this one. */
export function distractors(id: TileId): TileId[] {
  const t = TILE_BY_ID[id]
  const same = TILES.filter((o) => o.id !== id)
  switch (t.kind) {
    case 'suit':
      return same
        .filter(
          (o) =>
            o.kind === 'suit' &&
            (o.rank === t.rank || (o.suit === t.suit && Math.abs(o.rank - t.rank) <= 2)),
        )
        .map((o) => o.id)
    case 'wind':
      return same.filter((o) => o.kind === 'wind' || o.kind === 'dragon').map((o) => o.id)
    case 'dragon':
      return same.filter((o) => o.kind === 'dragon' || o.kind === 'wind').map((o) => o.id)
    case 'flower':
    case 'season':
      return same.filter((o) => o.kind === 'flower' || o.kind === 'season').map((o) => o.id)
  }
}

export function makeQuestion(rng: Rng = Math.random, avoid: TileId | null = null): Question {
  const pool = TILES.filter((t) => t.id !== avoid)
  const tile = pick(pool, rng).id
  const wrong = shuffle(distractors(tile), rng).slice(0, 3)
  while (wrong.length < 3) {
    const extra = pick(TILES, rng).id
    if (extra !== tile && !wrong.includes(extra)) wrong.push(extra)
  }
  return { tile, options: shuffle([tile, ...wrong], rng) }
}

export function optionLabel(id: TileId): string {
  return tileName(id)
}
