import { useState, type FormEvent } from 'react'
import type { Rules } from '../engine/game'
import type { Settings } from '../hooks/useGame'
import { NAME_MAX, cleanCode } from '../net/protocol'
import type { Speed } from '../pace'
import { PaceChoice, RuleChoices } from './Choice'
import Tile from './Tile'

interface Props {
  settings: Settings
  inProgress: boolean
  online: { available: boolean; busy: boolean; error: string | null }
  /** A code from a shared link, to fill in. */
  joinCode: string | null
  onStart: (rules: Rules) => void
  onHost: (rules: Rules, speed: Speed) => void
  onJoin: (code: string) => void
  onSettings: (patch: Partial<Settings>) => void
  onBack: () => void
}

/** Before the first deal: pick the house rules and sit down, alone or with friends. */
export default function Lobby({ settings, inProgress, online, joinCode, onStart, onHost, onJoin, onSettings, onBack }: Props) {
  const [rules, setRules] = useState<Rules>(settings.rules)
  const [code, setCode] = useState(joinCode ?? '')
  const validCode = cleanCode(code)

  function join(e: FormEvent) {
    e.preventDefault()
    if (validCode) onJoin(validCode)
  }

  return (
    <div className="lobby">
      <div className="lobby-hero" aria-hidden="true">
        <Tile id="RD" size={64} decorative />
        <Tile id="RD" size={64} decorative />
        <Tile id="RD" size={64} turned decorative />
      </div>
      <h2 className="lobby-title">Sit down at the table</h2>
      <p className="lobby-copy">
        Hong Kong mahjong against Mei, Bo and Ling. You are East for the first hand. Tap a tile to pick it, tap it
        again to discard. When a discard suits you, the table offers chow, pung, kong or the win.
      </p>
      <RuleChoices rules={rules} onChange={setRules} />
      <PaceChoice value={settings.speed} onChange={(speed) => onSettings({ speed })} />
      <div className="lobby-actions">
        <button
          type="button"
          className="act act-primary"
          onClick={() => {
            onSettings({ rules })
            onStart(rules)
          }}
        >
          Deal
        </button>
        {inProgress && (
          <button type="button" className="act" onClick={onBack}>
            Back to the table
          </button>
        )}
      </div>

      <section className="friends" aria-labelledby="friends-title">
        <h3 id="friends-title" className="friends-title">
          Play with friends
        </h3>
        <p className="friends-copy">
          Host a table and share its four-letter code, or join a friend's. Everyone picks a seat; any seat left empty
          gets one of the bots when the host deals.
        </p>
        {online.available ? (
          <>
            <div className="friends-row">
              <label className="field">
                Your name
                <input
                  type="text"
                  value={settings.name}
                  maxLength={NAME_MAX}
                  autoComplete="nickname"
                  placeholder="Guest"
                  onChange={(e) => onSettings({ name: e.target.value })}
                />
              </label>
            </div>
            <div className="friends-row">
              <button
                type="button"
                className="act"
                disabled={online.busy}
                onClick={() => {
                  onSettings({ rules })
                  onHost(rules, settings.speed)
                }}
              >
                Host a table
              </button>
              <form className="friends-join" onSubmit={join}>
                <label className="field">
                  Table code
                  <input
                    className="code-input"
                    type="text"
                    value={code}
                    maxLength={4}
                    autoCapitalize="characters"
                    autoCorrect="off"
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
          </>
        ) : (
          <p className="friends-off">
            This copy of Pung is not connected to a table server, so there is nobody to host or join. The README
            explains how to run one.
          </p>
        )}
      </section>

      <p className="lobby-foot">
        New to the game? <a href="https://francisphan.github.io/sparrow/">Sparrow</a> teaches the tiles, the sets and
        the scoring from scratch.
      </p>
      <p className="lobby-credit">
        Classic tile faces by{' '}
        <a href="https://commons.wikimedia.org/wiki/Category:SVG_mahjong_tiles">Cangjie6, Wikimedia Commons</a>,{' '}
        <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>. Sounds cut from CC0 recordings on{' '}
        <a href="https://freesound.org/">Freesound</a>; see{' '}
        <a href="https://github.com/francisphan/pung/blob/main/CREDITS.md">credits</a>.
      </p>
    </div>
  )
}
