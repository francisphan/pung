import { useContext, type MouseEvent, type ReactNode } from 'react'
import { NavContext, hrefOf, type Page } from '../router'

interface Props {
  page: Page
  current?: boolean
  className?: string
  children: ReactNode
}

/** A link to one of the pages: a real address for new tabs and the keyboard, switched in place on a plain click. */
export default function Link({ page, current = false, className, children }: Props) {
  const go = useContext(NavContext)
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    go(page)
  }
  return (
    <a href={hrefOf(page)} className={className} aria-current={current ? 'page' : undefined} onClick={onClick}>
      {children}
    </a>
  )
}
