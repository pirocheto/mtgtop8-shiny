import { memo } from 'react'
import { useNavigate, useParams } from 'react-router'

import { CardPanel } from '../components/CardPanel'
import { useCardPreview } from '../components/useCardPreview'
import { Select } from '../components/Select'
import { Empty, ErrorState, Pagination, Panel, PeriodSelect, Spinner } from '../components/ui'
import { FORMATS } from '../lib/formats'
import type { TopCard, TopCardsQuery } from '../lib/mtgtop8/types'
import { useCardInfo, useFormat, useTopCards } from '../lib/queries'
import { cardKey } from '../lib/scryfall'
import { useQueryParams } from '../lib/useQueryParams'
import { useSelected, useSelectionStore, type Selection } from '../lib/selection'
import { cx } from '../lib/utils'
import { useShowFormat } from '../lib/currentFormat'

const PAGE_SIZE = 20

// The site's three card filters, values as its form sends them.
const COLORS = [
  ['', 'All colors'],
  ['W', 'White'],
  ['U', 'Blue'],
  ['B', 'Black'],
  ['R', 'Red'],
  ['G', 'Green'],
  ['X', 'Colorless'],
] as const
const TYPES = [
  ['', 'All types'],
  ['LA', 'Land'],
  ['CR', 'Creature'],
  ['PL', 'Planeswalker'],
  ['AR', 'Artifact'],
  ['SO', 'Sorcery'],
  ['IN', 'Instant'],
  ['EN', 'Enchantment'],
] as const
const RARITIES = [
  ['', 'All rarities'],
  ['M', 'Mythic'],
  ['R', 'Rare'],
  ['U', 'Uncommon'],
  ['C', 'Common'],
] as const

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: readonly (readonly [T | '', string])[]
  onChange: (value: string) => void
}) {
  return (
    <Select
      label={label}
      value={value}
      options={options.map(([code, name]) => ({ value: code, label: name }))}
      onChange={onChange}
    />
  )
}

type TopCardSelection = Selection<TopCard | undefined>

/** A row of the list: the whole row shows the card on hover, and picks it on click. */
const CardTableRow = memo(function CardTableRow({
  card,
  selection,
}: {
  card: TopCard
  selection: TopCardSelection
}) {
  // Only whether this row is the picked one: a click re-renders two rows.
  const selected = useSelected(selection, (picked) => picked === card)
  const { handlers, preview } = useCardPreview(card.name)
  return (
    <tr
      onClick={() => selection.set(card)}
      aria-selected={selected}
      {...handlers}
      className={cx('cursor-pointer', selected ? 'bg-highlight text-highlight-fg' : 'text-link hover:bg-surface-2')}
    >
      <td className="px-3 py-1">
        {card.name}
        {preview}
      </td>
      <td className="px-3 py-1 text-center tabular">{card.share} %</td>
      <td className="px-3 py-1 text-center tabular">{card.averageCopies ?? ''}</td>
    </tr>
  )
})

/** The panel of the picked card; it alone follows the selection. */
function PickedCardPanel({ cards, selection }: { cards: TopCard[]; selection: TopCardSelection }) {
  const picked = useSelected(selection, (card) => card)
  const { data: infos } = useCardInfo(cards.map((card) => ({ quantity: 1, name: card.name })))
  if (!picked) return null
  return (
    <div className="lg:sticky lg:top-4 lg:self-start">
      <CardPanel
        card={{ quantity: 1, name: picked.name, cardId: picked.cardId }}
        info={infos?.get(cardKey(picked.name))}
      />
    </div>
  )
}

/**
 * The list of the site (name, share of decks, average copies) and the panel
 * of the card picked in it, the first one until another is clicked, as the
 * site does. Picking re-renders the two rows concerned and the panel only.
 */
function CardsAndPanel({ cards }: { cards: TopCard[] }) {
  const selection = useSelectionStore<TopCard | undefined>(cards[0])
  if (!cards.length) return <Empty>No cards for this selection.</Empty>
  return (
    <div className="grid gap-6 px-3 pb-4 lg:grid-cols-[2fr_3fr]">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="px-3 py-1.5 text-left font-normal">Card Name</th>
            <th className="px-3 py-1.5 text-center font-normal">Decks</th>
            <th className="px-3 py-1.5 text-center font-normal">Avg</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => (
            <CardTableRow key={card.name} card={card} selection={selection} />
          ))}
        </tbody>
      </table>
      <PickedCardPanel cards={cards} selection={selection} />
    </div>
  )
}

/**
 * Laid out as the site's most played cards page: the filters across the top,
 * then the cards on the left and the one picked on the right.
 */
export function TopCardsPage() {
  const { code = '' } = useParams()
  useShowFormat(code)
  const navigate = useNavigate()
  const [params, update] = useQueryParams()
  const board = params.get('board') === 'side' ? 'side' : 'main'
  const lands = params.get('lands') !== '0'
  const page = Number(params.get('page') ?? 1)
  const color = (params.get('color') ?? '') as NonNullable<TopCardsQuery['color']> | ''
  const type = (params.get('type') ?? '') as NonNullable<TopCardsQuery['type']> | ''
  const rarity = (params.get('rarity') ?? '') as NonNullable<TopCardsQuery['rarity']> | ''

  // The top cards form returns nothing without a period, so fall back to the
  // one the format page defaults to.
  const format = useFormat(code)
  const period = params.get('meta') ?? format.data?.period.id
  const { data, error, refetch, isPending, isPlaceholderData } = useTopCards({
    format: code,
    period,
    board,
    lands,
    color: color || undefined,
    type: type || undefined,
    rarity: rarity || undefined,
    page,
  })

  if (error) return <ErrorState error={error} onRetry={refetch} />

  const filter = (key: string) => (value: string) => update({ [key]: value || undefined, page: undefined })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">Most played cards</h1>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
        <Select
          label="Format"
          value={code}
          options={FORMATS.map((f) => ({ value: f.code, label: f.name }))}
          onChange={(next) => navigate(`/format/${next}/cards`)}
        />
        {data && (
          <PeriodSelect
            periods={data.periods}
            value={data.period.id}
            onChange={(meta) => update({ meta, page: undefined })}
          />
        )}
        <span className="flex items-center gap-3" role="radiogroup" aria-label="Board">
          {(['main', 'side'] as const).map((value) => (
            <label key={value} className="flex items-center gap-1.5">
              <input
                type="radio"
                name="board"
                checked={board === value}
                onChange={() => update({ board: value === 'side' ? 'side' : undefined, page: undefined })}
                className="accent-link"
              />
              {value === 'main' ? 'maindeck' : 'sideboard'}
            </label>
          ))}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-muted">Filter Cards</span>
          <FilterSelect label="Colour" value={color} options={COLORS} onChange={filter('color')} />
          <FilterSelect label="Type" value={type} options={TYPES} onChange={filter('type')} />
          <FilterSelect label="Rarity" value={rarity} options={RARITIES} onChange={filter('rarity')} />
        </span>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={lands}
            onChange={(event) => update({ lands: event.target.checked ? undefined : '0', page: undefined })}
            className="accent-link"
          />
          include lands
        </label>
      </div>

      <Panel title="Most played cards" loading={isPlaceholderData}>
        {isPending ? (
          <Spinner />
        ) : (
          <div className="flex flex-col">
            <Pagination
              page={data.page}
              pageCount={data.pageCount}
              open={data.cards.length === PAGE_SIZE && data.page >= data.pageCount}
              onChange={(next) => update({ page: String(next) })}
            />
            {/* Keyed on the list, so a new page or filter starts again from its first card. */}
            <CardsAndPanel key={data.cards.map((card) => card.name).join('|')} cards={data.cards} />
          </div>
        )}
      </Panel>
    </div>
  )
}
