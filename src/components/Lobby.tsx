import { useState } from 'react'
import type { Rules } from '../engine/game'
import type { Settings, Speed } from '../hooks/useGame'
import type { TileStyle } from '../tileStyle'
import Tile from './Tile'

interface Props {
  settings: Settings
  inProgress: boolean
  onStart: (rules: Rules) => void
  onSettings: (patch: Partial<Settings>) => void
  onBack: () => void
}

function Choice<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string; note?: string }[]
  onChange: (v: T) => void
}) {
  return (
    <fieldset className="choice">
      <legend>{label}</legend>
      {options.map((o) => (
        <label key={String(o.value)} className={`choice-opt${o.value === value ? ' choice-on' : ''}`}>
          <input type="radio" name={label} checked={o.value === value} onChange={() => onChange(o.value)} />
          <span className="choice-label">{o.label}</span>
          {o.note && <span className="choice-note">{o.note}</span>}
        </label>
      ))}
    </fieldset>
  )
}

/** Before the first deal: pick the house rules and sit down. */
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
      <Choice
        label="Minimum to win"
        value={rules.minimumFaan}
        options={[
          { value: 3, label: '3 faan', note: 'the usual table' },
          { value: 1, label: '1 faan', note: 'quicker hands' },
          { value: 0, label: 'Any hand', note: 'for learning' },
        ]}
        onChange={(minimumFaan) => setRules({ ...rules, minimumFaan })}
      />
      <Choice
        label="Length"
        value={rules.rounds}
        options={[
          { value: 4, label: 'Four rounds', note: 'at least 16 hands' },
          { value: 1, label: 'East round', note: 'at least 4 hands' },
        ]}
        onChange={(rounds) => setRules({ ...rules, rounds })}
      />
      <Choice<TileStyle>
        label="Tile faces"
        value={settings.tiles}
        options={[
          { value: 'classic', label: 'Classic', note: 'the faces most sets use' },
          { value: 'line', label: 'Line art', note: 'drawn for Sparrow' },
        ]}
        onChange={(tiles) => onSettings({ tiles })}
      />
      <Choice<Speed>
        label="Opponents' pace"
        value={settings.speed}
        options={[
          { value: 'slow', label: 'Slow' },
          { value: 'normal', label: 'Normal' },
          { value: 'fast', label: 'Fast' },
        ]}
        onChange={(speed) => onSettings({ speed })}
      />
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
