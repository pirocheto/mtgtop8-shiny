import { useState } from 'react'

import { useSpoiledCards, useUpcomingSets } from '../lib/queries'
import { cx, formatDate } from '../lib/utils'
import { Select } from './Select'
import { Empty, ErrorState, Panel, Spinner } from './ui'

/**
 * The spoiler of the sets to come, from Scryfall: the next main set by
 * default, the others a pick away, and the cards revealed last.
 */
export function SpoilerPanel() {
  const sets = useUpcomingSets()
  const [picked, setPicked] = useState<string>()
  // The next expansion, core or masters set, else the next set of any kind.
  const fallback = sets.data?.find((set) => set.main) ?? sets.data?.[0]
  const set = sets.data?.find((s) => s.code === picked) ?? fallback
  const cards = useSpoiledCards(set?.code)

  if (sets.error) return null
  if (sets.data && !set) return null

  return (
    <Panel title="Spoiler">
      <div className="flex flex-col gap-4 p-4">
        {!set ? (
          <Spinner />
        ) : (
          // The set picker on top, as the period picker heads the metagame;
          // the set it shows under it.
          <div className="flex flex-col items-center gap-3">
            {sets.data && sets.data.length > 1 && (
              <Select
                label="Upcoming set"
                value={set.code}
                options={sets.data.map((s) => ({ value: s.code, label: `${s.name} · ${formatDate(s.releasedAt)}` }))}
                onChange={setPicked}
              />
            )}
            <a
              href={set.url}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 items-center gap-3 hover:text-link"
            >
              <img src={set.iconUrl} alt="" className="size-9 shrink-0" />
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate font-semibold">{set.name}</span>
                <span className="text-sm text-muted">Release: {formatDate(set.releasedAt)}</span>
              </span>
            </a>
          </div>
        )}

        {cards.error ? (
          // Mostly Scryfall's rate limit, whose answer the browser cannot even
          // read (it carries no CORS header): only waiting helps.
          <ErrorState
            error={cards.error}
            onRetry={cards.refetch}
            source="Scryfall"
            hint="Scryfall is not answering right now, most likely too many requests. Try again in a minute."
          />
        ) : !cards.data ? (
          set && <Spinner label="Loading the cards…" />
        ) : cards.data.length === 0 ? (
          <Empty>No cards revealed yet.</Empty>
        ) : (
          <div className={cx('grid grid-cols-2 gap-3', cards.isFetching && 'opacity-60')}>
            {cards.data.map((card) => (
              <a key={card.url} href={card.url} target="_blank" rel="noreferrer" title={card.name}>
                {/* A card, plain: nothing drawn under it while it loads. */}
                <img
                  src={card.imageUrl}
                  alt={card.name}
                  loading="lazy"
                  className="aspect-[488/680] w-full rounded-[4.75%] transition-transform duration-200 hover:scale-[1.02]"
                />
              </a>
            ))}
          </div>
        )}

        {set && (
          <a href={set.url} target="_blank" rel="noreferrer" className="text-center text-sm text-link hover:underline">
            Full spoiler on Scryfall ↗
          </a>
        )}
      </div>
    </Panel>
  )
}
