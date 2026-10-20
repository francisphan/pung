import { useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { TERM_BY_ID } from '../data/glossary'

interface Props {
  id: string
  children?: ReactNode
}

/** A glossary word in running text. Hover, focus or tap shows the short definition. */
export default function Term({ id, children }: Props) {
  const t = TERM_BY_ID[id]
  if (!t) throw new Error(`Unknown glossary term: ${id}`)
  const [open, setOpen] = useState(false)
  const [flip, setFlip] = useState(false)
  const wrap = useRef<HTMLSpanElement>(null)
  const tipId = useId()
  // A tap focuses the button and then clicks it; the click must not undo what the focus just opened.
  const focusedAt = useRef(0)

  function show() {
    const r = wrap.current?.getBoundingClientRect()
    setFlip(!!r && r.left > window.innerWidth * 0.55)
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: Event) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span className="term-wrap" ref={wrap}>
      <button
        type="button"
        className="term"
        aria-describedby={open ? tipId : undefined}
        aria-expanded={open}
        onPointerEnter={(e: PointerEvent) => {
          if (e.pointerType === 'mouse') show()
        }}
        onPointerLeave={(e: PointerEvent) => {
          if (e.pointerType === 'mouse') setOpen(false)
        }}
        onFocus={() => {
          focusedAt.current = Date.now()
          show()
        }}
        onBlur={() => setOpen(false)}
        onClick={() => {
          if (Date.now() - focusedAt.current < 400) return
          if (open) setOpen(false)
          else show()
        }}
      >
        {children ?? t.term.toLowerCase()}
      </button>
      {open && (
        <span role="tooltip" id={tipId} className={`term-tip${flip ? ' term-tip-flip' : ''}`}>
          <strong>
            {t.term}
            {t.chinese && (
              <span className="term-cjk" lang="zh-Hant">
                {t.chinese}
              </span>
            )}
          </strong>
          <span>{t.short}</span>
        </span>
      )}
    </span>
  )
}
