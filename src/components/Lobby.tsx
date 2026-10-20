import { useState } from 'react'
import type { Rules } from '../engine/game'
import type { Settings } from '../hooks/useGame'
import { metricsEnabled } from '../metrics'
import { RuleChoices } from './Choice'
import Link from './Link'
import Tile from './Tile'

interface Props {
  settings: Settings
  inProgress: boolean
  onStart: (rules: Rules) => void
  onSettings: (patch: Partial<Settings>) => void
  onBack: () => void
}

/** The front page: a solo game against the three opponents, with the way to the other two pages. */
export default function Lobby({ settings, inProgress, onStart, onSettings, onBack }: Props) {
  const [rules, setRules] = useState<Rules>(settings.rules)

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

      <ul className="doors">
        <li>
          <h3 className="door-title">
            <Link page="friends">Play with friends</Link>
          </h3>
          <p className="door-copy">Host a table and share its four-letter code. Empty seats go to the bots.</p>
        </li>
        <li>
          <h3 className="door-title">
            <Link page="learn">New to mahjong?</Link>
          </h3>
          <p className="door-copy">Play a guided round where the coach picks every move and says why.</p>
        </li>
      </ul>

      <p className="lobby-credit">
        Classic tile faces by{' '}
        <a href="https://commons.wikimedia.org/wiki/Category:SVG_mahjong_tiles">Cangjie6, Wikimedia Commons</a>,{' '}
        <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>. Sounds cut from CC0 recordings on{' '}
        <a href="https://freesound.org/">Freesound</a>; see{' '}
        <a href="https://github.com/francisphan/pung/blob/main/CREDITS.md">credits</a>.{' '}
        <a href="https://github.com/francisphan/pung">Source on GitHub</a>.
      </p>
      {metricsEnabled() && (
        <p className="lobby-credit">
          Visits and games are counted anonymously by <a href="https://www.goatcounter.com/">GoatCounter</a>, without
          cookies.
        </p>
      )}
    </div>
  )
}
