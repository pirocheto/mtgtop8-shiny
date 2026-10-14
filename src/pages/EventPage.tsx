import { memo } from 'react'
import { Link, useParams } from 'react-router'

import { DeckView } from '../components/DeckView'
import { cx, formatDate, siteImage } from '../lib/utils'
import { ErrorState, SourceBadge, Spinner, Stars } from '../components/ui'
import { originalUrl } from '../lib/mtgtop8/api'
import type { Standing } from '../lib/mtgtop8/types'
import { useEvent } from '../lib/queries'
import { useShowFormat } from '../lib/currentFormat'
import { useDelayed } from '../lib/useDelayed'
import { LoadingImage } from '../components/LoadingImage'
import { Spin } from '../components/Spin'

// Each deck of the same event is a query of its own, so the standings come
// back as new objects with the same content: rows compare their fields.
const sameStanding = (
  a: { standing: Standing; eventId: string; current: boolean },
  b: { standing: Standing; eventId: string; current: boolean },
) =>
  a.current === b.current &&
  a.eventId === b.eventId &&
  a.standing.deckId === b.standing.deckId &&
  a.standing.rank === b.standing.rank &&
  a.standing.deckName === b.standing.deckName &&
  a.standing.player === b.standing.player &&
  a.standing.thumbnailPath === b.standing.thumbnailPath

/**
 * One deck of the standings. Memoized: changing decks re-renders the row
 * that loses the highlight and the one that gets it, not the other thirty.
 */
const StandingRow = memo(function StandingRow({
  standing,
  eventId,
  current,
}: {
  standing: Standing
  eventId: string
  current: boolean
}) {
  return (
    <li>
      <Link
        to={`/event/${eventId}/deck/${standing.deckId}`}
        replace
        className={cx(
          'flex items-center gap-1.5 rounded-lg py-0.5 pr-2.5 pl-1 text-sm transition-colors',
          current ? 'bg-highlight' : 'hover:bg-surface-2',
        )}
      >
        {/* "17-32" with an en dash, which reads as a range. */}
        <span
          className={cx(
            'w-9 shrink-0 text-center text-xs leading-tight font-semibold tabular',
            current ? 'text-highlight-fg' : 'text-muted',
          )}
        >
          {standing.rank.replace('-', '–')}
        </span>
        {standing.thumbnailPath ? (
          <LoadingImage src={siteImage(standing.thumbnailPath)} alt="" spinner={false} className="h-12 w-24 shrink-0 rounded-md" />
        ) : (
          <span className="h-12 w-24 shrink-0 rounded-md bg-surface-2" />
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className={cx(
              // On one line, never wrapped: cut short when the column is narrow.
              'truncate leading-tight',
              current ? 'font-semibold text-highlight-fg' : 'text-fg',
            )}
          >
            {standing.deckName}
          </span>
          <span className="truncate text-right text-xs text-muted">{standing.player}</span>
        </span>
      </Link>
    </li>
  )
}, sameStanding)

/**
 * Laid out as the site's event page: a bar with the event and the deck shown,
 * the event's details and standings in a narrow left column, the deck beside.
 * On a phone the deck, what the page is for, comes first, right under the
 * bar and a line of the event's details; the standings follow it.
 */
export function EventPage() {
  const { eventId = '', deckId } = useParams()
  const { data, error, refetch, isPending, isPlaceholderData } = useEvent(eventId, deckId)
  // Known once the event is loaded; the previous one's while the next loads.
  useShowFormat(data?.format.code)
  // The next deck fades in only if it takes a while, rather than blinking.
  const deckLoading = useDelayed(isPlaceholderData)

  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (isPending) {
    return <Spinner label="Loading the event…" />
  }

  // While another deck of the same event loads, the previous one stays on
  // screen; the standings already highlight the requested one.
  const selected = deckId ?? data.deck.id
  const index = data.standings.findIndex((standing) => standing.deckId === data.deck.id)
  const next = data.standings[index + 1]
  const deckPath = (id: string) => `/event/${data.id}/deck/${id}`

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded-xl bg-bar px-4 py-2 text-bar-fg">
        <h1 className="font-bold sm:text-lg">
          {data.name}
          {data.location && <span className="font-normal opacity-80"> @ {data.location}</span>}
        </h1>
        <div className="flex items-center gap-4 text-lg font-bold max-sm:w-full">
          {/* As in the blocks' title bars: the white spinner while the next deck comes. */}
          {deckLoading && (
            <span role="status" aria-label="Loading the deck" className="flex">
              <Spin onDark />
            </span>
          )}
          <h2 className="max-sm:flex-1">
            {data.deck.rank && `#${data.deck.rank} `}
            {data.deck.name}
            {data.deck.player && <span className="font-normal opacity-80"> - {data.deck.player}</span>}
          </h2>
          {next && (
            <Link
              to={deckPath(next.deckId)}
              replace
              className="text-highlight hover:opacity-80"
              aria-label={`Next deck: ${next.deckName}`}
              title={`${next.rank} · ${next.deckName}`}
            >
              →
            </Link>
          )}
        </div>
      </header>

      {/* Under lg, the column's details on one line, above the deck. */}
      <div className="-mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-sm lg:hidden">
        <Link to={`/format/${data.format.code}`} className="font-bold hover:text-link">
          {data.format.name}
        </Link>
        <Stars count={data.stars} />
        <SourceBadge source={data.source} />
        <span className="text-muted">
          {data.playerCount && `${data.playerCount} players - `}
          {formatDate(data.date)}
        </span>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[22rem_1fr]">
        <aside className="overflow-hidden rounded-xl border border-line bg-surface max-lg:order-last lg:sticky lg:top-4">
          <div className="flex flex-col items-center gap-1 border-b border-line px-3 py-3 text-center text-sm max-lg:hidden">
            <div className="flex items-center gap-2">
              <Link to={`/format/${data.format.code}`} className="text-base font-bold hover:text-link">
                {data.format.name}
              </Link>
              <Stars count={data.stars} />
              <SourceBadge source={data.source} />
            </div>
            <div>
              {data.playerCount && `${data.playerCount} players - `}
              {formatDate(data.date)}
            </div>
            <a
              href={originalUrl(`event?e=${data.id}&f=${data.format.code}`)}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted hover:text-link"
            >
              View on mtgtop8 ↗
            </a>
          </div>
          {/* Read out beside the deck; shown once the standings come after it. */}
          <h2 className="bg-bar py-1.5 text-center text-sm font-bold tracking-wide text-bar-fg uppercase lg:sr-only">
            Standings · {data.standings.length}
          </h2>
          <ol className="flex flex-col p-1.5 lg:max-h-[75vh] lg:overflow-y-auto">
            {data.standings.map((standing) => (
              <StandingRow
                key={standing.deckId}
                standing={standing}
                eventId={data.id}
                current={standing.deckId === selected}
              />
            ))}
          </ol>
        </aside>

        <div aria-busy={deckLoading} className="min-w-0">
          <div className={cx('transition-opacity duration-150', deckLoading && 'opacity-50')}>
            {/* Keyed, so the clicked card and the view mode reset with the deck. */}
            <DeckView key={data.deck.id} deck={data.deck} />
          </div>
        </div>
      </div>
    </div>
  )
}
