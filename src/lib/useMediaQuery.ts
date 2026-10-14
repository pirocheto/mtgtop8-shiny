import { useSyncExternalStore } from 'react'

/** Whether the window matches a media query, kept up to date as it resizes. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (listener) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', listener)
      return () => list.removeEventListener('change', listener)
    },
    () => window.matchMedia(query).matches,
  )
}

/** From Tailwind's sm up: wider than a phone held upright. */
export const useIsWide = () => useMediaQuery('(min-width: 40rem)')

/** From Tailwind's lg up: wide enough for the pages' side columns. */
export const useIsLarge = () => useMediaQuery('(min-width: 64rem)')
