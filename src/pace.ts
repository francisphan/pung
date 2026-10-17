/** How long the opponents pause before each move, in milliseconds. Shared by solo play and the table server. */
export type Speed = 'slow' | 'normal' | 'fast'
export const SPEEDS: readonly Speed[] = ['slow', 'normal', 'fast']
export const DELAY: Record<Speed, number> = { slow: 1300, normal: 700, fast: 220 }
