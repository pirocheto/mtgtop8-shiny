import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider, removeOldestQuery } from '@tanstack/react-query-persist-client'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'
import './index.css'

const DAY = 24 * 60 * 60 * 1000

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // mtgtop8 changes a few times an hour at most: a page fetched in the
      // last five minutes is shown as is, and revisiting it costs nothing.
      staleTime: 5 * 60 * 1000,
      // Kept a day, in memory and in the browser (below): an older page is
      // shown at once on a return visit, then refreshed behind it.
      gcTime: DAY,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

/** localStorage, unless the browser refuses it (private browsing, storage off). */
function browserStorage(): Storage | undefined {
  try {
    localStorage.getItem('probe')
    return localStorage
  } catch {
    return undefined
  }
}

// Without a storage, the persister does nothing and the cache lives in memory.
const persister = createSyncStoragePersister({
  storage: browserStorage(),
  key: 'mtgtop8-shiny-cache',
  // When the browser's quota is reached, the oldest page goes first.
  retry: removeOldestQuery,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: DAY,
        // A new build may read the site differently: what an older one
        // stored is dropped rather than shown in a shape the code no longer
        // expects.
        buster: __BUILD_ID__,
        dehydrateOptions: {
          // Scryfall's cards have a store of their own, per card (see
          // lib/scryfall.ts), and their query holds a Map, which JSON cannot
          // keep.
          shouldDehydrateQuery: (query) => query.state.status === 'success' && query.queryKey[0] !== 'scryfall',
        },
      }}
    >
      <App />
    </PersistQueryClientProvider>
  </StrictMode>,
)
