import { memo } from 'react'
import { Link } from 'react-router'

import { formatName } from '../lib/formats'
import type { ArchetypeShare, DeckSummary, EventSummary, MetagameCategory, TopCard } from '../lib/mtgtop8/types'
import { CardName, SiteCardScan } from './cards'
import { cx, formatDate, sameContent, siteImage } from '../lib/utils'
import { Empty, ShareBar, SourceBadge, Stars, TrendArrow } from './ui'
import { LoadingImage } from './LoadingImage'

/** One line per event, as the site lists them: source, name @ place, stars, date. */
export const EventList = memo(function EventList({ events, showFormat = false }: { events: EventSummary[]; showFormat?: boolean }) {
  if (!events.length) return <Empty>No events.</Empty>
  return (
    <ul>
      {events.map((event) => (
        <li key={event.id}>
          <Link
            to={`/event/${event.id}`}
            className="group flex items-center gap-3 px-3 py-1.5 text-sm transition-colors hover:bg-surface-2"
          >
            <span className="w-14 shrink-0">
              <SourceBadge source={event.source} />
            </span>
            {showFormat && (
              <span className="w-24 shrink-0 truncate font-semibold">{formatName(event.formatCode)}</span>
            )}
            <span className="min-w-0 flex-1">
              <span className="group-hover:text-link">{event.name}</span>
              {event.location && <span className="text-muted"> @ {event.location}</span>}
              {event.isNew && (
                <span className="ml-1.5 rounded bg-up px-1.5 py-px align-[1px] text-[10px] font-bold tracking-wide text-white uppercase">
                  New
                </span>
              )}
            </span>
            <span className="w-12 shrink-0 text-center text-xs">
              <Stars count={event.stars} />
            </span>
            <span className="w-16 shrink-0 text-right text-xs text-muted tabular">{formatDate(event.date)}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}, sameContent)

/**
 * A table of decks, in the site's columns: deck, player, format (in a search),
 * event, level, rank, date. Thin lines, links in blue.
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
    <div className="overflow-x-auto">
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
}: {
  archetype: ArchetypeShare
  formatCode: string
  period?: string
  current: boolean
}) {
  return (
      <li>
        <Link
          to={`/archetype/${archetype.id}?f=${formatCode}${period ? `&meta=${period}` : ''}`}
          className={cx(
            // Clipped, so the thumbnail follows the box's rounded corners. The
            // focus ring for the keyboard only, not left behind by a click.
            'group flex items-center gap-2 overflow-hidden rounded outline-none focus-visible:ring-2 focus-visible:ring-link',
            current ? 'bg-highlight text-highlight-fg' : 'hover:bg-surface-2',
          )}
        >
          {archetype.thumbnailPath ? (
            <LoadingImage src={siteImage(archetype.thumbnailPath)} alt="" spinner={false} className="h-10 w-20 shrink-0" />
          ) : (
            <span className="h-10 w-20 shrink-0 bg-surface-2" />
          )}
          <span className="min-w-0 flex-1 text-center text-sm leading-tight">
            <span className="block truncate group-hover:text-link">{archetype.name}</span>
            {/* The arrow hangs after the share, out of the flow, so every
                share stays centred under its name, arrow or not. */}
            <span className="relative inline-block text-muted tabular">
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

/**
 * The site's metagame column: one block per category, "AGGRO 40%", and its
 * archetypes two to a row, each a thumbnail beside its name and share.
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
  if (!categories.length) return <Empty>No metagame data for this period.</Empty>
  return (
    <div className="flex flex-col gap-5">
      {categories.map((category) => (
        <div key={category.name}>
          <h3 className="mb-2 text-center text-base font-bold uppercase">
            {category.name} <span className="tabular">{category.share}%</span>
          </h3>
          <ul className="grid grid-cols-2 gap-x-2 gap-y-1">
            {category.archetypes.map((archetype) => (
              <ArchetypeItem
                key={archetype.id}
                archetype={archetype}
                formatCode={formatCode}
                period={period}
                current={archetype.id === current}
              />
            ))}
          </ul>
        </div>
      ))}
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
          <li key={card.imagePath ?? name} className="relative w-[calc(25%-0.375rem)] min-w-28">
            {card.imagePath ? (
              <SiteCardScan src={siteImage(card.imagePath)} alt={name} />
            ) : (
              <div className="flex aspect-[488/680] items-center justify-center rounded-[4.75%] bg-surface-2 p-2 text-center text-sm">
                {name}
              </div>
            )}
            <span className="absolute inset-x-0 bottom-[22%] text-center text-2xl font-black text-accent [text-shadow:0_0_4px_#000,0_0_2px_#000] tabular">
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
          <CardName name={card.name} className="w-56 truncate font-medium" />
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
