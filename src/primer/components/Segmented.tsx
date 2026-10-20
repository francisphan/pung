interface Option<T extends string> {
  value: T
  label: string
  hint?: string
}

interface Props<T extends string> {
  label: string
  value: T
  options: Option<T>[]
  onChange: (v: T) => void
}

export default function Segmented<T extends string>({ label, value, options, onChange }: Props<T>) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={`seg-btn${o.value === value ? ' seg-on' : ''}`}
          onClick={() => onChange(o.value)}
        >
          <span>{o.label}</span>
          {o.hint && <small>{o.hint}</small>}
        </button>
      ))}
    </div>
  )
}
