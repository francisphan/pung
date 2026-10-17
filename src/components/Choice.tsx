import type { Rules } from '../engine/game'
import { DELAY, type Speed } from '../pace'

/** A row of radio buttons drawn as tiles. */
export function Choice<T extends string | number>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string
  value: T
  options: { value: T; label: string; note?: string }[]
  onChange: (v: T) => void
  disabled?: boolean
}) {
  return (
    <fieldset className="choice" disabled={disabled}>
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

/** The house rules: minimum faan and how long a game runs. */
export function RuleChoices({ rules, onChange, disabled }: { rules: Rules; onChange: (r: Rules) => void; disabled?: boolean }) {
  return (
    <>
      <Choice
        label="Minimum to win"
        value={rules.minimumFaan}
        disabled={disabled}
        options={[
          { value: 3, label: '3 faan', note: 'the usual table' },
          { value: 1, label: '1 faan', note: 'quicker hands' },
          { value: 0, label: 'Any hand', note: 'for learning' },
        ]}
        onChange={(minimumFaan) => onChange({ ...rules, minimumFaan })}
      />
      <Choice
        label="Length"
        value={rules.rounds}
        disabled={disabled}
        options={[
          { value: 4, label: 'Four rounds', note: 'at least 16 hands' },
          { value: 1, label: 'East round', note: 'at least 4 hands' },
        ]}
        onChange={(rounds) => onChange({ ...rules, rounds })}
      />
    </>
  )
}

const seconds = (speed: Speed) => `${(DELAY[speed] / 1000).toFixed(1)} s before each move`

/** How long Mei, Bo and Ling pause before they draw, claim or discard. */
export function PaceChoice({ value, onChange, disabled }: { value: Speed; onChange: (s: Speed) => void; disabled?: boolean }) {
  return (
    <Choice<Speed>
      label="How quickly the bots play"
      value={value}
      disabled={disabled}
      options={[
        { value: 'slow', label: 'Slow', note: seconds('slow') },
        { value: 'normal', label: 'Normal', note: seconds('normal') },
        { value: 'fast', label: 'Fast', note: 'almost no pause' },
      ]}
      onChange={onChange}
    />
  )
}
