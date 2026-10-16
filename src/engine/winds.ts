import { WINDS, type BonusId, type Wind } from './tiles'

export const ORDER_OF_WINDS: readonly Wind[] = WINDS

/** The flower and season that belong to a seat: East 1, South 2, West 3, North 4. */
export function flowersOfSeat(wind: Wind): BonusId[] {
  const n = (WINDS.indexOf(wind) + 1) as 1 | 2 | 3 | 4
  return [`F${n}`, `S${n}`]
}

export function nextWind(wind: Wind): Wind {
  return WINDS[(WINDS.indexOf(wind) + 1) % 4]
}
