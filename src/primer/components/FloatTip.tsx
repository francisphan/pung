import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  children: ReactNode
  /** Anchor, as percentages of the positioned parent. */
  left: number
  top: number
  /** Open toward the left instead of the right. */
  flipX?: boolean
}

/** A small floating note anchored inside a `position: relative` box. */
export default function FloatTip({ title, subtitle, children, left, top, flipX }: Props) {
  return (
    <div
      className={`float-tip${flipX ? ' float-tip-flip' : ''}`}
      style={{ left: `${left}%`, top: `${top}%` }}
    >
      <strong>{title}</strong>
      {subtitle && <span className="float-tip-sub">{subtitle}</span>}
      <p>{children}</p>
    </div>
  )
}
