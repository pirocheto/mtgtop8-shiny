import { Link, useParams } from 'react-router'

import { CommanderMetagame } from '../components/CommanderMetagame'
import { EventList, MetagameBreakdown, TopCardGrid } from '../components/lists'
import { useQueryParams } from '../lib/useQueryParams'
import { ErrorState, Pagination, Panel, PeriodSelect, Spinner } from '../components/ui'
import { formatName } from '../lib/formats'
import { useFormat, useTopCards } from '../lib/queries'
import { useShowFormat } from '../lib/currentFormat'
import { useShownFor } from '../lib/useShownFor'

/**
 * Laid out as the site's format page: the metagame breakdown in the left
 * column; major events, the latest events and the top cards in the right one.
 */
export function FormatPage() {
  const { code = '' } = useParams()
  const [params, update] = useQueryParams()
  const period = params.get('meta') ?? undefined
  const page = Number(params.get('page') ?? 1)
  const { data, error, refetch, isPending, isPlaceholderData } = useFormat(code, period, page)
  useShowFormat(code)

  // While the next answer loads, the previous one stays on screen. Which
  // blocks it is about to change depends on what changed: the format or the
  // period change them all, a page of events only the events.
  const shownFor = useShownFor(isPlaceholderData, `${code}|${period ?? ''}`)
  const pageOnly = isPlaceholderData && shownFor === `${code}|${period ?? ''}`
  const allLoading = isPlaceholderData && !pageOnly

  // The format page shows its top cards as bare images; the top cards page,
  // in the same order, has their names. It requires a period, so it waits for
  // the one the format page resolved to.
  const periodId = period ?? data?.period.id
  const topCards = useTopCards({ format: code, period: periodId })

  if (error) return <ErrorState error={error} onRetry={refetch} />

  const name = data?.format.name || formatName(code)

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[2fr_3fr]">
      <h1 className="sr-only">{name}</h1>

      <Panel title="Metagame breakdown" loading={allLoading}>
        {isPending ? (
          <Spinner />
        ) : (
          <div className="flex flex-col gap-3 p-3">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <PeriodSelect
                periods={data.periods}
                value={data.period.id}
                onChange={(meta) => update({ meta, page: undefined })}
              />
              {/* The Commander tool prints its own count, filter included. */}
              {!data.commanderMeta && (
                <span className="text-sm tabular">{data.deckCount.toLocaleString()} decks</span>
              )}
            </div>
            {data.commanderMeta ? (
              // Keyed, so the filters reset with the format and the period.
              <CommanderMetagame key={`${code}-${data.period.id}`} format={code} period={data.period.id} />
            ) : (
              <MetagameBreakdown categories={data.metagame} formatCode={code} period={data.period.id} />
            )}
          </div>
        )}
      </Panel>

      <div className="flex min-w-0 flex-col gap-4">
        {data && data.majorEvents.length > 0 && (
          <Panel title="Last major events" loading={allLoading}>
            <EventList events={data.majorEvents} />
          </Panel>
        )}
        <Panel title={`Last ${data?.recentEvents.items.length || 20} events`} loading={isPlaceholderData}>
          {isPending ? (
            <Spinner />
          ) : (
            <>
              <EventList events={data.recentEvents.items} />
              <Pagination
                page={data.recentEvents.page}
                pageCount={data.recentEvents.pageCount}
                // The site's pager is windowed, so its last link is a floor.
                open={data.recentEvents.items.length === 20 && data.recentEvents.page >= data.recentEvents.pageCount}
                onChange={(next) => update({ page: String(next) })}
              />
            </>
          )}
        </Panel>
        {/* Some formats (Duel Commander, the Highlanders) have no top cards on
            the site: the block is left out rather than shown empty. */}
        {(isPending || data.topCards.length > 0) && (
          <Panel title="Most played cards" loading={allLoading}>
            {isPending ? (
              <Spinner />
            ) : (
              <>
                <TopCardGrid cards={data.topCards} names={topCards.data?.cards.map((card) => card.name)} />
                <p className="pb-3 text-center text-sm">
                  <Link
                    to={`/format/${code}/cards${periodId ? `?meta=${periodId}` : ''}`}
                    className="hover:text-link hover:underline"
                  >
                    All the most played cards →
                  </Link>
                </p>
              </>
            )}
          </Panel>
        )}
      </div>
    </div>
  )
}
