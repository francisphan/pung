import { createContext, useContext } from 'react'
import { SOLO, type Seating } from './names'

/** The seat this device plays and the names around the table. */
export const SeatingContext = createContext<Seating>(SOLO)

export function useSeating(): Seating {
  return useContext(SeatingContext)
}
