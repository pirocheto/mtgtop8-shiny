import { useParams } from 'react-router'

import { DeckList, MetagameBreakdown } from '../components/lists'
import { useQueryParams } from '../lib/useQueryParams'
import { cx } from '../lib/utils'
import { ErrorState, Pagination, Panel, PeriodSelect, Spinner } from '../components/ui'
import { formatName } from '../lib/formats'
import { useArchetype } from '../lib/queries'
import { useShowFormat } from '../lib/currentFormat'
import { useShownFor } from '../lib/useShownFor'
import { CommanderMetagame } from '../components/CommanderMetagame'

/** 20 decks per page on the site; a full page means there may be another. */
const PAGE_SIZE = 20

/**
 * Laid out as the site's archetype page: the format's metagame breakdown on
 * the left with this archetype highlighted, its decks on the right.
 */
export function ArchetypePage() {
  const { archetypeId = '' } = useParams()
  const [params, update] = useQueryParams()
  const format = params.get('f') ?? ''
  const period = params.get('meta') ?? undefined
  const page = Number(params.get('page') ?? 1)
  const { data, error, refetch, isPending, isPlaceholderData } = useArchetype(archetypeId, format, period, page)
  useShowFormat(data?.format.code || format)

  // Another archetype, or a page of its decks, changes the decks only: the
  // breakdown beside them stays as it is. Another format or period changes
  // everything.
  const request = `${format}|${period ?? ''}`
  const shownFor = useShownFor(isPlaceholderData, request)
  const allLoading = isPlaceholderData && shownFor !== request

  if (error) return <ErrorState error={error} onRetry={refetch} />

  const formatCode = data?.format.code || format
  // The Commander formats have no breakdown in the page: the decks take the width.
  const withMetagame = isPending || data.metagame.length > 0 || data.commanderMeta

  return (
    <div className={cx('grid items-start gap-4', withMetagame && 'lg:grid-cols-[2fr_3fr]')}>
      <h1 className="sr-only">
        {data?.name ?? 'Archetype'} · {data?.format.name || formatName(format)}
      </h1>

      {withMetagame && (
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
                <span className="text-sm tabular">{data.deckCount.toLocaleString()} decks</span>
              </div>
              {data.commanderMeta ? (
                // Keyed, so the filters reset with the format and the period,
                // and stay as they are from one commander to the next.
                <CommanderMetagame
                  key={`${formatCode}-${data.period.id}`}
                  format={formatCode}
                  period={data.period.id}
                  current={archetypeId}
                />
              ) : (
              <MetagameBreakdown
                categories={data.metagame}
                formatCode={formatCode}
                period={data.period.id}
                // From the address, not the data: the highlight moves at
                // once, while the archetype's decks are still on their way.
                current={archetypeId}
              />
              )}
            </div>
          )}
        </Panel>
      )}

      <Panel title={data ? `${data.name} decks` : 'Decks'} className="min-w-0" loading={isPlaceholderData}>
        {isPending ? (
          <Spinner />
        ) : (
          <div>
            {!withMetagame && (
              <div className="flex justify-center pt-3">
                <PeriodSelect
                  periods={data.periods}
                  value={data.period.id}
                  onChange={(meta) => update({ meta, page: undefined })}
                />
              </div>
            )}
            <DeckList decks={data.decks.items} />
            <Pagination
              page={data.decks.page}
              pageCount={data.decks.pageCount}
              // The site's pager is windowed and never shows the last page, so
              // the count is a floor: a full page may well have a next one.
              open={data.decks.items.length === PAGE_SIZE && data.decks.page >= data.decks.pageCount}
              onChange={(next) => update({ page: String(next) })}
            />
          </div>
        )}
      </Panel>
    </div>
  )
}
