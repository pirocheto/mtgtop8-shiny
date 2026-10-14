import { useEffect, useState } from 'react'

/**
 * `flag`, but only once it has held for `delay` ms. A load that is over
 * sooner then shows no loader at all, rather than a blink of one.
 */
export function useDelayed(flag: boolean, delay = 200): boolean {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (!flag) return
    const timer = setTimeout(() => setShown(true), delay)
    // Reset as the flag drops, ready to wait again next time.
    return () => {
      clearTimeout(timer)
      setShown(false)
    }
  }, [flag, delay])
  return flag && shown
}
