import { Link } from 'react-router'

import { EventList } from '../components/lists'
import { siteImage } from '../lib/utils'
import { ErrorState, Panel, Spinner } from '../components/ui'
import { formatName } from '../lib/formats'
import { useHome } from '../lib/queries'
import { SpoilerPanel } from '../components/SpoilerPanel'
import { LoadingImage } from '../components/LoadingImage'

/**
 * Laid out as the site's home page: on the left, every format's latest major
 * events in one table, the latest rogue decks under it and the week's figures;
 * on the right, the spoiler of the next set, from Scryfall.
 */
export function HomePage() {
  const { data, error, refetch, isPending } = useHome()

  if (error) return <ErrorState error={error} onRetry={refetch} />

  // One table, format by format, as the site prints it.
  const majorEvents = data?.majorEvents.flatMap(({ format, events }) =>
    events.map((event) => ({ ...event, formatCode: event.formatCode || format.code })),
  )

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[3fr_2fr]">
      <h1 className="sr-only">MTGTop8 Shiny</h1>

      <div className="flex min-w-0 flex-col gap-4">
        <Panel title="Last major events">
          {isPending ? <Spinner /> : <EventList events={majorEvents ?? []} showFormat />}
        </Panel>

        {(isPending || data.rogueDecks.length > 0) && (
          <Panel title="Last rogue decks">
            {isPending ? (
              <Spinner />
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-5 p-4 sm:grid-cols-3">
                {data.rogueDecks.map((deck) => {
                      const to = `/event/${deck.eventId}/deck/${deck.id}`
                      return (
                        <div key={deck.id} className="flex min-w-0 flex-col gap-1.5">
                          <p className="truncate text-center text-sm">
                            <span className="font-semibold">{formatName(deck.formatCode)}</span>{' '}
                            <Link to={to} className="text-link hover:underline">
                              {deck.name}
                            </Link>
                          </p>
                          {/* The site shows the top of the deck's picture, 150px of it. */}
                          {deck.thumbnailPath && (
                            <Link to={to} className="block">
                              <LoadingImage
                                src={siteImage(deck.thumbnailPath)}
                                alt=""
                                className="h-36 rounded-lg"
                                // The top of the picture, as the site shows it.
                                imgClassName="object-top hover:scale-[1.02]"
                              />
                            </Link>
                          )}
                        </div>
                      )
                    })}
              </div>
            )}
          </Panel>
        )}

        {data?.stats && (
          <p className="px-4 py-6 text-center text-muted">
            In the last {data.stats.days === 7 ? 'seven' : data.stats.days} days, mtgtop8.com updated its database
            <br />
            with <strong className="text-link tabular">{data.stats.decks.toLocaleString()}</strong> decks that
            performed in <strong className="text-link tabular">{data.stats.events.toLocaleString()}</strong> events
            worldwide.
          </p>
        )}
      </div>

      <SpoilerPanel />
    </div>
  )
}
