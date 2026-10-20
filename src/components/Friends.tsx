import { useState, type FormEvent } from 'react'
import type { Settings } from '../hooks/useGame'
import { NAME_MAX, cleanCode } from '../net/protocol'

interface Props {
  settings: Settings
  online: { available: boolean; busy: boolean; error: string | null }
  /** A code from a shared link, to fill in. */
  joinCode: string | null
  onHost: () => void
  onJoin: (code: string) => void
  onSettings: (patch: Partial<Settings>) => void
}

/** The friends page: host a table or join one by its code. */
export default function Friends({ settings, online, joinCode, onHost, onJoin, onSettings }: Props) {
  const [code, setCode] = useState(joinCode ?? '')
  const validCode = cleanCode(code)

  function join(e: FormEvent) {
    e.preventDefault()
    if (validCode) onJoin(validCode)
  }

  return (
    <div className="lobby">
      <h2 className="lobby-title">Play with friends</h2>
      <p className="lobby-copy">
        Host a table and share its four-letter code, or join a friend’s. Everyone picks a seat; any seat left empty
        gets one of the bots when the host deals. The host’s browser runs the table, so the host keeps their page
        open; everyone else only needs the code.
      </p>
      {online.available ? (
        <>
          <div className="friends-row">
            <label className="field">
              Your name
              <input
                type="text"
                name="name"
                value={settings.name}
                maxLength={NAME_MAX}
                autoComplete="nickname"
                spellCheck={false}
                placeholder="Guest"
                onChange={(e) => onSettings({ name: e.target.value })}
              />
            </label>
          </div>
          <div className="friends-row">
            <button type="button" className="act act-primary" disabled={online.busy} onClick={onHost}>
              Host a table
            </button>
            <form className="friends-join" onSubmit={join}>
              <label className="field">
                Table code
                <input
                  className="code-input"
                  type="text"
                  name="code"
                  value={code}
                  maxLength={4}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="ABCD"
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
              </label>
              <button type="submit" className="act" disabled={!validCode || online.busy}>
                Join
              </button>
            </form>
          </div>
          {online.error && (
            <p className="friends-error" role="alert">
              {online.error}
            </p>
          )}
          <p className="lobby-foot">
            The host picks the house rules at the table, and anyone can leave and come back to their seat.
          </p>
        </>
      ) : (
        <p className="friends-off">
          This browser cannot connect to other players (it has no WebRTC), so there is nobody to host or join.
        </p>
      )}
    </div>
  )
}
