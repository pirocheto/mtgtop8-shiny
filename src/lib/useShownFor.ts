import { useState } from 'react'

/**
 * The request the data on screen answers. While a query shows the previous
 * answer as a placeholder, this is the previous request, so a page can tell
 * what the coming answer will change (a page of a list, or everything).
 */
export function useShownFor(isPlaceholderData: boolean, request: string): string {
  const [shown, setShown] = useState(request)
  // Settled on the request asked: the data on screen now answers it.
  if (!isPlaceholderData && shown !== request) setShown(request)
  return isPlaceholderData ? shown : request
}
