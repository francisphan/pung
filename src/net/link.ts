/** The link that opens the lobby with this table's code filled in. */
export function joinLink(code: string): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname}?join=${code}`
}
