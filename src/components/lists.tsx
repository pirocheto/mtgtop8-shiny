import { memo, useState } from 'react'
import { Link } from 'react-router'

import { formatName } from '../lib/formats'
import type { ArchetypeShare, DeckSummary, EventSummary, MetagameCategory, TopCard } from '../lib/mtgtop8/types'
import { CardName, SiteCardScan } from './cards'
import { cx, formatDate, sameContent, siteImage } from '../lib/utils'
import { Empty, ShareBar, SourceBadge, Stars, TrendArrow } from './ui'
import { LoadingImage } from './LoadingImage'

/**
 * One line per event, as the site lists them: source, name @ place, stars,
 * date. On a phone the name, what the line is about, takes a line of its own
 * across the width, and the rest goes on a second line under it.
 */
export const EventList = memo(function EventList({ events, showFormat = false }: { events: EventSummary[]; showFormat?: boolean }) {
  if (!events.length) return <Empty>No events.</Empty>
  return (
    <ul className="max-sm:divide-y max-sm:divide-line">
      {events.map((event) => (
        <li key={event.id}>
          <Link
            to={`/event/${event.id}`}
            className="group flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm transition-colors hover:bg-surface-2 sm:flex-nowrap sm:py-1.5"
          >
            <span className="w-14 shrink-0">
              <SourceBadge source={event.source} />
            </span>
            {showFormat && (
              <span className="shrink-0 truncate font-semibold sm:w-24">{formatName(event.formatCode)}</span>
            )}
            <span className="order-first min-w-0 basis-full sm:order-none sm:flex-1 sm:basis-auto">
              <span className="font-medium group-hover:text-link sm:font-normal">{event.name}</span>
              {event.location && <span className="text-muted"> @ {event.location}</span>}
              {event.isNew && (
                <span className="ml-1.5 rounded bg-up px-1.5 py-px align-[1px] text-[10px] font-bold tracking-wide text-white uppercase">
                  New
                </span>
              )}
            </span>
            <span className="shrink-0 text-xs sm:w-12 sm:text-center">
              <Stars count={event.stars} />
            </span>
            <span className="ml-auto shrink-0 text-right text-xs text-muted tabular sm:ml-0 sm:w-16">
              {formatDate(event.date)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}, sameContent)

/**
 * A table of decks, in the site's columns: deck, player, format (in a search),
 * event, level, rank, date. Thin lines, links in blue. Seven columns do not
 * fit a phone: there, each deck is a card of two lines, the deck and its rank
 * first, then who played it, where and when.
 */
export const DeckList = memo(function DeckList({
  decks,
  showFormat = false,
}: {
  decks: DeckSummary[]
  showFormat?: boolean
}) {
  if (!decks.length) return <Empty>No decks found.</Empty>
  return (
    <>
      <ul className="divide-y divide-line md:hidden">
        {decks.map((deck) => (
          <li key={deck.id} className="relative flex flex-col gap-0.5 px-3 py-2 text-sm hover:bg-surface-2">
            <div className="flex items-baseline gap-2">
              {/* The whole card opens the deck; the player and the event
                  stay links of their own, above it. */}
              <Link
                to={`/event/${deck.eventId}/deck/${deck.id}`}
                className="min-w-0 flex-1 truncate font-medium text-link after:absolute after:inset-0"
              >
                {deck.name}
              </Link>
              {deck.rank && (
                <span className="shrink-0 rounded bg-surface-2 px-1.5 text-xs font-semibold tabular">
                  #{deck.rank}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2 text-xs text-muted">
              <span className="min-w-0 flex-1 truncate">
                {deck.player && (
                  <Link
                    to={`/search?player=${encodeURIComponent(deck.player)}`}
                    className="relative font-medium text-fg hover:text-link"
                  >
                    {deck.player}
                  </Link>
                )}
                {showFormat && <> · {formatName(deck.formatCode)}</>}
                {deck.event && (
                  <>
                    {' · '}
                    <Link to={`/event/${deck.eventId}`} className="relative hover:text-link">
                      {deck.event.name}
                    </Link>
                  </>
                )}
              </span>
              {deck.event?.stars ? <Stars count={deck.event.stars} /> : null}
              <span className="shrink-0 tabular">{formatDate(deck.event?.date)}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="overflow-x-auto max-md:hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="px-3 py-1.5 font-normal">Deck</th>
            <th className="px-3 py-1.5 font-normal">Player</th>
            {showFormat && <th className="px-3 py-1.5 font-normal">Format</th>}
            <th className="px-3 py-1.5 font-normal">Event</th>
            <th className="px-2 py-1.5 text-center font-normal">Level</th>
            <th className="px-2 py-1.5 text-center font-normal">Rank</th>
            <th className="px-3 py-1.5 text-right font-normal">Date</th>
          </tr>
        </thead>
        <tbody>
          {decks.map((deck) => (
            <tr key={deck.id} className="hover:bg-surface-2">
              {/* Names never wrap: the event column gives way instead. */}
              <td className="px-3 py-1 whitespace-nowrap">
                <Link to={`/event/${deck.eventId}/deck/${deck.id}`} className="text-link hover:underline">
                  {deck.name}
                </Link>
              </td>
              <td className="px-3 py-1 whitespace-nowrap">
                {deck.player && (
                  <Link to={`/search?player=${encodeURIComponent(deck.player)}`} className="hover:text-link">
                    {deck.player}
                  </Link>
                )}
              </td>
              {showFormat && <td className="px-3 py-1 whitespace-nowrap">{formatName(deck.formatCode)}</td>}
              <td className="max-w-xs px-3 py-1">
                {deck.event && (
                  <Link to={`/event/${deck.eventId}`} className="block truncate text-link hover:underline">
                    {deck.event.name}
                  </Link>
                )}
              </td>
              <td className="px-2 py-1 text-center whitespace-nowrap">
                {deck.event?.stars ? <Stars count={deck.event.stars} /> : null}
              </td>
              <td className="px-2 py-1 text-center whitespace-nowrap tabular">{deck.rank}</td>
              <td className="px-3 py-1 text-right whitespace-nowrap tabular">{formatDate(deck.event?.date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  )
}, sameContent)

/**
 * One archetype of the breakdown. Memoized on its content: picking another
 * archetype re-renders the box that loses the highlight and the one that
 * gets it, not the fifty others.
 */
const ArchetypeItem = memo(function ArchetypeItem({
  archetype,
  formatCode,
  period,
  current,
  phoneHidden,
}: {
  archetype: ArchetypeShare
  formatCode: string
  period?: string
  current: boolean
  /** Left out on a phone, until the whole breakdown is asked for. */
  phoneHidden: boolean
}) {
  return (
      <li className={phoneHidden ? 'max-sm:hidden' : undefined}>
        <Link
          to={`/archetype/${archetype.id}?f=${formatCode}${period ? `&meta=${period}` : ''}`}
          className={cx(
            // Clipped, so the thumbnail follows the box's rounded corners. The
            // focus ring for the keyboard only, not left behind by a click.
            'group flex items-center gap-3 overflow-hidden rounded outline-none focus-visible:ring-2 focus-visible:ring-link sm:gap-2',
            current ? 'bg-highlight text-highlight-fg' : 'hover:bg-surface-2',
          )}
        >
          {archetype.thumbnailPath ? (
            <LoadingImage src={siteImage(archetype.thumbnailPath)} alt="" spinner={false} className="h-10 w-20 shrink-0" />
          ) : (
            <span className="h-10 w-20 shrink-0 bg-surface-2" />
          )}
          {/* On a phone, one to a row: the name on the left, its share on the
              right. From sm up, two to a row, the share centred under the name. */}
          <span className="flex min-w-0 flex-1 items-center gap-2 pr-6 text-sm leading-tight sm:block sm:pr-0 sm:text-center">
            <span className="block min-w-0 flex-1 truncate group-hover:text-link">{archetype.name}</span>
            {/* The arrow hangs after the share, out of the flow, so every
                share stays centred under its name, arrow or not. */}
            <span className="relative inline-block shrink-0 text-muted tabular">
              {archetype.share} %
              <span className="absolute top-0 left-full ml-1">
                <TrendArrow trend={archetype.trend} />
              </span>
            </span>
          </span>
        </Link>
      </li>
  )
}, sameContent)

/** On a phone, the archetypes a category shows before "Show all". */
const PHONE_SHOWN = 5

/**
 * The site's metagame column: one block per category, "AGGRO 40%", and its
 * archetypes two to a row, each a thumbnail beside its name and share. On a
 * phone, one to a row, and each category its leaders only until asked: the
 * whole breakdown would push everything under it out of reach.
 */
export const MetagameBreakdown = memo(function MetagameBreakdown({
  categories,
  formatCode,
  period,
  current,
}: {
  categories: MetagameCategory[]
  formatCode: string
  period?: string
  /** The archetype on display, highlighted as the site does. */
  current?: string
}) {
  // Opened from the start when the archetype on display would be hidden.
  const [expanded, setExpanded] = useState(() =>
    categories.some((category) => category.archetypes.findIndex((archetype) => archetype.id === current) >= PHONE_SHOWN),
  )
  if (!categories.length) return <Empty>No metagame data for this period.</Empty>
  const hidden = categories.reduce((sum, category) => sum + Math.max(0, category.archetypes.length - PHONE_SHOWN), 0)
  return (
    <div className="flex flex-col gap-5">
      {categories.map((category) => (
        <div key={category.name}>
          <h3 className="mb-2 text-center text-base font-bold uppercase">
            {category.name} <span className="tabular">{category.share}%</span>
          </h3>
          <ul className="grid gap-x-2 gap-y-1 sm:grid-cols-2">
            {category.archetypes.map((archetype, i) => (
              <ArchetypeItem
                key={archetype.id}
                archetype={archetype}
                formatCode={formatCode}
                period={period}
                current={archetype.id === current}
                phoneHidden={!expanded && i >= PHONE_SHOWN}
              />
            ))}
          </ul>
        </div>
      ))}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="rounded-lg border border-line py-2 text-sm font-medium hover:bg-surface-2 sm:hidden"
        >
          {expanded ? 'Show the leaders only' : `Show all archetypes (${hidden} more)`}
        </button>
      )}
    </div>
  )
}, sameContent)

/** Card images with their share printed over them, as the format page shows its top cards. */
export const TopCardGrid = memo(function TopCardGrid({ cards, names }: { cards: TopCard[]; names?: string[] }) {
  if (!cards.length) return <Empty>No cards for this period.</Empty>
  return (
    <ul className="flex flex-wrap justify-center gap-2 p-3">
      {cards.map((card, i) => {
        const name = card.name || names?.[i] || ''
        return (
          <li key={card.imagePath ?? name} className="relative w-[calc(33.333%-0.34rem)] sm:w-[calc(25%-0.375rem)] sm:min-w-28">
            {card.imagePath ? (
              <SiteCardScan src={siteImage(card.imagePath)} alt={name} />
            ) : (
              <div className="flex aspect-[488/680] items-center justify-center rounded-[4.75%] bg-surface-2 p-2 text-center text-sm">
                {name}
              </div>
            )}
            <span className="absolute inset-x-0 bottom-[22%] text-center text-xl font-black sm:text-2xl text-accent [text-shadow:0_0_4px_#000,0_0_2px_#000] tabular">
              {card.share} %
            </span>
          </li>
        )
      })}
    </ul>
  )
}, sameContent)

export function TopCardList({ cards, rankOffset = 0 }: { cards: TopCard[]; rankOffset?: number }) {
  if (!cards.length) return <Empty>No cards for this selection.</Empty>
  const max = Math.max(...cards.map((card) => card.share))
  return (
    <ol className="divide-y divide-line">
      {cards.map((card, i) => (
        <li key={card.name} className="flex items-center gap-4 px-5 py-2.5 text-sm">
          <span className="w-6 text-right text-muted tabular">{rankOffset + i + 1}</span>
          <CardName name={card.name} className="min-w-0 flex-1 truncate font-medium sm:w-56 sm:flex-none" />
          <div className="hidden flex-1 sm:block">
            <ShareBar value={card.share} max={max} />
          </div>
          <span className="w-14 text-right font-semibold tabular">{card.share}%</span>
          {card.averageCopies !== undefined && (
            <span className={cx('w-16 text-right text-muted tabular')}>×{card.averageCopies}</span>
          )}
        </li>
      ))}
    </ol>
  )
}
