import { useIsFetching } from '@tanstack/react-query'

import { useDelayed } from '../lib/useDelayed'

/**
 * A thin bar running across the top of the window while anything loads, as
 * GitHub or YouTube show one: wherever the page is scrolled, an action that
 * takes a moment says so. Past a short delay only, so a quick load does not
 * blink it.
 */
export function FetchingBar() {
  const loading = useDelayed(useIsFetching() > 0, 150)
  return (
    <div
      role="progressbar"
      aria-label="Loading"
      aria-hidden={!loading}
      className={`pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px] overflow-hidden transition-opacity duration-200 ${loading ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="h-full w-1/3 animate-[fetching_1.1s_ease-in-out_infinite] rounded-full bg-highlight" />
    </div>
  )
}
