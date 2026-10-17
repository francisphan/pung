import { CODE_ALPHABET, CODE_LENGTH } from '../net/protocol'

/** A random table code, e.g. QBAP. */
export function newCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  return code
}
