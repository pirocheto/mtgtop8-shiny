import { useSearchParams } from 'react-router'

/** Updates some query parameters, keeping the others. */
export function useQueryParams() {
  const [params, setParams] = useSearchParams()
  const update = (changes: Record<string, string | undefined>) =>
    setParams((current) => {
      const next = new URLSearchParams(current)
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      return next
    })
  return [params, update] as const
}
