import { createBrowserRouter, Link, RouterProvider } from 'react-router'

import { Layout } from './components/Layout'
import { PageTitle } from './components/ui'
import { ArchetypePage } from './pages/ArchetypePage'
import { EventPage } from './pages/EventPage'
import { FormatPage } from './pages/FormatPage'
import { HomePage } from './pages/HomePage'
import { SearchPage } from './pages/SearchPage'
import { TopCardsPage } from './pages/TopCardsPage'

function NotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-16">
      <PageTitle eyebrow="404" title="Nothing here">
        This page does not exist.
      </PageTitle>
      <Link to="/" className="text-link hover:underline">
        Back to the home page
      </Link>
    </div>
  )
}

const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { index: true, element: <HomePage /> },
        { path: 'format/:code', element: <FormatPage /> },
        { path: 'format/:code/cards', element: <TopCardsPage /> },
        { path: 'event/:eventId', element: <EventPage /> },
        { path: 'event/:eventId/deck/:deckId', element: <EventPage /> },
        { path: 'archetype/:archetypeId', element: <ArchetypePage /> },
        { path: 'search', element: <SearchPage /> },
        { path: '*', element: <NotFound /> },
      ],
    },
  ],
  // The SPA is served under a path prefix in production; see vite.config.ts.
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' },
)

export default function App() {
  return <RouterProvider router={router} />
}
