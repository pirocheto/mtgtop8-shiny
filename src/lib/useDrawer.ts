import { useState } from 'react'
import { useLocation } from 'react-router'

/**
 * Whether a drawer is open. It is opened for the page on display only: any
 * navigation, a deck or an archetype picked in it, a search submitted from
 * it, closes it, with nothing to reset by hand.
 */
export function useDrawer() {
  const { key } = useLocation()
  const [openOn, setOpenOn] = useState<string>()
  return {
    open: openOn === key,
    show: () => setOpenOn(key),
    close: () => setOpenOn(undefined),
  }
}
