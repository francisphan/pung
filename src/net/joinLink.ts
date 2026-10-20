import { hrefOf } from '../router'

/** The link that opens the friends page with this table's code filled in. */
export function joinLink(code: string): string {
  return `${window.location.origin}${hrefOf('friends', `?join=${code}`)}`
}
