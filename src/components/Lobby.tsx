import { useState } from 'react'
import type { Rules } from '../engine/game'
import type { Settings } from '../hooks/useGame'
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
        Hong Kong mahjong against three bots, Mei, Bo and Ling. You are East for the first hand. Tap a tile to pick it, tap it
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
      {inProgress && <p className="lobby-foot">Dealing replaces the game you have going.</p>}

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
    </div>
  )
}
