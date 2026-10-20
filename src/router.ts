/**
 * The pages, each at its own address: the solo table at the root, friends
 * at /friends/, the guided round at /learn/ and the primer's lessons under
 * it (/learn/tiles/ and so on). The build writes an index.html into each
 * folder, so the addresses work on GitHub Pages without a server; in the
 * page, links switch without a reload.
 */
import { createContext, useCallback, useEffect, useState } from 'react'

export const LESSONS = ['tiles', 'sets', 'round', 'scoring', 'glossary'] as const
export type LessonId = (typeof LESSONS)[number]
export type Page = 'home' | 'friends' | 'learn' | `learn/${LessonId}`
export const PAGES: readonly Page[] = ['home', 'friends', 'learn', ...LESSONS.map((l) => `learn/${l}` as const)]

const BASE = import.meta.env.BASE_URL

export function pageOf(pathname: string): Page {
  const rel = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname.replace(/^\/+/, '')
  const name = rel.replace(/\/index\.html$/, '').replace(/\/+$/, '')
  return (PAGES as readonly string[]).includes(name) ? (name as Page) : 'home'
}

/** The lesson a page shows, if it is one of the primer's. */
export function lessonOf(page: Page): LessonId | null {
  return page.startsWith('learn/') ? (page.slice('learn/'.length) as LessonId) : null
}

export function hrefOf(page: Page, search = ''): string {
  return `${BASE}${page === 'home' ? '' : `${page}/`}${search}`
}

/** Switches page; given to links through context so any component can navigate. */
export const NavContext = createContext<(page: Page) => void>(() => {})

/**
 * The page in the address bar, kept in step with back and forward. A
 * `start` page overrides the address once, and the address is rewritten
 * to match (a join link lands on the friends page, whatever path it used).
 */
export function usePage(start?: Page, search = ''): [Page, (page: Page) => void] {
  const [page, setPage] = useState<Page>(() => {
    if (start && pageOf(window.location.pathname) !== start) window.history.replaceState(null, '', hrefOf(start, search))
    return start ?? pageOf(window.location.pathname)
  })
  useEffect(() => {
    const onPop = () => setPage(pageOf(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const go = useCallback((next: Page) => {
    if (pageOf(window.location.pathname) !== next) window.history.pushState(null, '', hrefOf(next))
    setPage(next)
  }, [])
  return [page, go]
}
