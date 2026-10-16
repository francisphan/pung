import { createContext } from 'react'

/**
 * Which faces to show. `classic` is the traditional set most players know,
 * served from the sprite in public/tiles.svg (Cangjie6, Wikimedia Commons,
 * CC BY-SA 4.0). `line` is the set drawn in code for Sparrow.
 */
export type TileStyle = 'classic' | 'line'
export const TileStyleContext = createContext<TileStyle>('classic')
