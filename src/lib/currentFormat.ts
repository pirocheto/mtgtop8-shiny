import { useLayoutEffect } from 'react'

import { createSelection, useSelected } from './selection'

/**
 * The format the page on screen is about: a format's own pages, but also an
 * event, a deck or an archetype of that format. The navbar highlights it.
 * Pages declare it rather than the navbar parsing every URL, since an
 * event's format is only known once its page is loaded.
 */
const current = createSelection<string | undefined>(undefined)

/** Declares the page's format for as long as the page is on screen. */
export function useShowFormat(code: string | undefined) {
  // Before paint, so the highlight does not blink between two pages. Set
  // when it changes, cleared only when the page goes: clearing it at every
  // change, then setting it back, would re-render the navbar twice for one
  // and the same format.
  useLayoutEffect(() => {
    current.set(code || undefined)
  }, [code])
  useLayoutEffect(() => () => current.set(undefined), [])
}

/** Whether the page is about one of these formats; re-renders only when that answer changes. */
export function useIsCurrentFormat(codes: string[]): boolean {
  return useSelected(current, (code) => code !== undefined && codes.includes(code))
}
