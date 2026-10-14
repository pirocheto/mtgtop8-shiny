import { memo, useCallback, useState } from 'react'
import { Link } from 'react-router'

import type { ColorId, CommanderDeck, CommanderQuery, CommanderShare } from '../lib/mtgtop8/types'
import { useCommanderMeta } from '../lib/queries'
import { cx, siteImage } from '../lib/utils'
import { ManaCost } from './cards'
import { Empty, ErrorState, Pagination, Spinner } from './ui'
import { useDelayed } from '../lib/useDelayed'
import { LoadingImage } from './LoadingImage'
import { Spin } from './Spin'

/** On a phone, the commanders listed before "Show all". */
const PHONE_SHOWN = 10

const COLORS: ColorId[] = ['W', 'U', 'B', 'R', 'G', 'I']

const COLOR_NAME: Record<ColorId, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
  I: 'Colourless',
}

/** The site's "I" is colourless, which Scryfall's symbols spell "C". */
const symbol = (color: ColorId) => `{${color === 'I' ? 'C' : color}}`

const tab = (active: boolean) =>
  cx(
    'rounded-md px-2.5 py-1 text-sm transition-colors',
    active ? 'bg-highlight text-highlight-fg' : 'hover:bg-surface-2 hover:text-link',
  )

/**
 * Picking a colour clears colourless, and colourless clears the colours, as
 * on the site. The letters keep the site's WUBRG order.
 */
function toggleColor(colors: string, color: ColorId): string {
  if (colors.includes(color)) return colors.replace(color, '')
  if (color === 'I') return 'I'
  const picked = new Set([...colors.replace('I', ''), color])
  return COLORS.filter((c) => picked.has(c)).join('')
}

// Memoized, with a stable onChange: the data of a new filter coming in does
// not re-render the picker.
const ColorPicker = memo(function ColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (colors: string) => void
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2.5 sm:gap-4" role="group" aria-label="Colour identity">
      {COLORS.map((color) => {
        const active = value.includes(color)
        return (
          <button
            key={color}
            type="button"
            aria-pressed={active}
            title={COLOR_NAME[color]}
            aria-label={COLOR_NAME[color]}
            onClick={() => onChange(toggleColor(value, color))}
            // The picked symbols keep their colour and get a ring; once one
            // is picked, the others fade, so the filter reads at a glance.
            className={cx(
              // Square and sized to the symbol, so the ring is a circle.
              'inline-flex size-10 shrink-0 sm:size-12 items-center justify-center rounded-full transition duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-highlight',
              active
                ? 'ring-[3px] ring-highlight ring-offset-2 ring-offset-surface'
                : value
                  ? 'opacity-35 grayscale hover:opacity-80 hover:grayscale-0'
                  : 'hover:scale-110',
            )}
          >
            <ManaCost cost={symbol(color)} className="size-10 sm:size-12 [&>img]:size-10 sm:[&>img]:size-12" />
          </button>
        )
      })}
    </div>
  )
})

const Thumbnail = ({ path }: { path?: string }) =>
  path ? (
    <LoadingImage src={siteImage(path)} alt="" spinner={false} className="h-10 w-14 shrink-0 sm:w-20" />
  ) : (
    <span className="h-10 w-14 shrink-0 bg-surface-2 sm:w-20" />
  )

const Colors = ({ colors }: { colors: ColorId[] }) => (
  <ManaCost cost={colors.map(symbol).join('')} className="shrink-0 justify-center sm:w-20" />
)

/**
 * The list itself. Memoized on the data: while the answer for a new filter
 * loads, the list on screen does not re-render, only once the new one is in.
 */
const CommanderList = memo(function CommanderList({
  shares,
  decks,
  format,
  period,
  current,
}: {
  shares: CommanderShare[]
  decks: CommanderDeck[]
  format: string
  period: string
  /** The commander on display, on its archetype page, highlighted. */
  current?: string
}) {
  // On a phone, the leaders only until asked, as the breakdown of the other
  // formats does: the whole list would bury the rest of the page.
  const [expanded, setExpanded] = useState(() => shares.findIndex((share) => share.archetypeId === current) >= PHONE_SHOWN)
  const hidden = shares.length - PHONE_SHOWN
  return (
    <>
      {shares.length === 0 && decks.length === 0 && <Empty>No decks match.</Empty>}

      {/* A thin gap between rows, so the thumbnails do not run into one another. */}
      <ul className="flex flex-col gap-0.5">
        {shares.map((share, i) => (
          <li key={share.archetypeId} className={!expanded && i >= PHONE_SHOWN ? 'max-sm:hidden' : undefined}>
            <Link
              to={`/archetype/${share.archetypeId}?f=${format}&meta=${period}`}
              className={cx(
                // Clipped, so the thumbnail follows the row's rounded corners.
                'group flex items-center gap-2 overflow-hidden rounded outline-none focus-visible:ring-2 focus-visible:ring-link',
                share.archetypeId === current ? 'bg-highlight text-highlight-fg' : 'hover:bg-surface-2',
              )}
            >
              <Thumbnail path={share.thumbnailPath} />
              <span className="min-w-0 flex-1 truncate text-sm group-hover:text-link sm:text-center">
                {share.name}
              </span>
              <Colors colors={share.colors} />
              <span className="w-14 shrink-0 text-center text-sm tabular sm:w-16">
                {share.permille} <span className="text-accent">‰</span>
              </span>
            </Link>
          </li>
        ))}
        {decks.map((deck) => (
          <li key={deck.deckId}>
            <Link
              to={`/event/${deck.eventId}/deck/${deck.deckId}`}
              className="group flex items-center gap-2 overflow-hidden rounded outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-link"
            >
              <Thumbnail path={deck.thumbnailPath} />
              <span className="min-w-0 flex-1 truncate text-sm group-hover:text-link">{deck.name}</span>
              <Colors colors={deck.colors} />
            </Link>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="mt-2 rounded-lg border border-line py-2 text-sm font-medium hover:bg-surface-2 sm:hidden"
        >
          {expanded ? 'Show the leaders only' : `Show all commanders (${hidden} more)`}
        </button>
      )}
    </>
  )
})

/**
 * The metagame of the Commander formats, as the site shows it in place of a
 * breakdown: decks filtered by colour identity, listed by popularity,
 * alphabetically, or one by one.
 */
export function CommanderMetagame({
  format,
  period,
  current,
}: {
  format: string
  period: string
  /** On an archetype page, the commander on display. */
  current?: string
}) {
  const [show, setShow] = useState<CommanderQuery['show']>('pop')
  const [colors, setColors] = useState('')
  const [page, setPage] = useState(1)

  const query: CommanderQuery = { format, period, show, colors, page }
  const pickColors = useCallback((next: string) => {
    setColors(next)
    setPage(1)
  }, [])
  const { data, error, refetch, isPending, isPlaceholderData } = useCommanderMeta(query)
  // A filter that takes a while: the list fades and a spinner turns by the
  // count; a quick one changes the list without a blink.
  const loading = useDelayed(isPlaceholderData)

  return (
    <div className="flex flex-col gap-3">
      <ColorPicker value={colors} onChange={pickColors} />
      <div className="flex flex-wrap justify-evenly gap-1">
        {(
          [
            ['pop', 'Sort by popularity', 'Popular'],
            ['alpha', 'Sort alphabetically', 'A–Z'],
            ['decks', 'Last decks', 'Last decks'],
          ] as const
        ).map(([value, label, short]) => (
          <button
            key={value}
            type="button"
            className={tab(show === value)}
            onClick={() => {
              setShow(value)
              setPage(1)
            }}
          >
            {/* Shorter on a phone, so the three fit one row. */}
            <span className="max-sm:hidden">{label}</span>
            <span className="sm:hidden">{short}</span>
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isPending ? (
        <Spinner />
      ) : (
        <div aria-busy={loading} className={cx('flex flex-col gap-1 transition-opacity duration-150', loading && 'opacity-50')}>
          <p className="flex items-center justify-center gap-1 text-sm tabular">
            {loading && (
              <span role="status" aria-label="Loading" className="mr-1 flex">
                <Spin />
              </span>
            )}
            {data.matching !== undefined ? (
              <>
                {data.matching}
                {colors && <ManaCost cost={[...colors].map((c) => symbol(c as ColorId)).join('')} />} decks /{' '}
                {data.total}
              </>
            ) : (
              <>{data.total} decks</>
            )}
          </p>

          <CommanderList shares={data.shares} decks={data.decks} format={format} period={period} current={current} />

          {data.decks.length > 0 && (
            <Pagination
              page={data.page}
              pageCount={data.pageCount}
              // The pager is windowed: a full page may have more after it.
              open={data.decks.length === 50 && data.page >= data.pageCount}
              onChange={setPage}
            />
          )}
        </div>
      )}
    </div>
  )
}
