import { memo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'

import { deckDecPath, deckExportPath, deckShopUrl, originalUrl } from '../lib/mtgtop8/api'
import { MTGTOP8_PROXY } from '../lib/mtgtop8/http'
import type { CardEntry, Deck, DeckSection } from '../lib/mtgtop8/types'
import { useCardInfo } from '../lib/queries'
import { cardKey } from '../lib/scryfall'
import { CardDialog, CardPanel, Price, PriceBox, type Anchor } from './CardPanel'
import { CardImage } from './cards'
import { useCardPreview } from './useCardPreview'
import { useSelected, useSelectionStore, type Selection } from '../lib/selection'
import { cx } from '../lib/utils'
import { useIsWide } from '../lib/useMediaQuery'

type CardSelection = Selection<CardEntry | undefined>

const count = (cards: CardEntry[]) => cards.reduce((sum, card) => sum + card.quantity, 0)

/** One line of a decklist: the whole line shows the card on hover, and opens it on click. */
const CardRow = memo(function CardRow({ card, selection }: { card: CardEntry; selection: CardSelection }) {
  // Only whether this line is the picked one: picking another card re-renders
  // the two lines whose answer changes, not the list.
  const selected = useSelected(selection, (picked) => picked === card)
  const { handlers, preview } = useCardPreview(card.name)
  return (
    <li>
      <button
        type="button"
        onClick={() => selection.set(card)}
        aria-pressed={selected}
        {...handlers}
        className={cx(
          'flex w-full gap-1.5 rounded px-1 py-0.5 text-left text-sm',
          selected ? 'bg-highlight text-highlight-fg' : 'hover:bg-surface-2 hover:text-link',
        )}
      >
        <span className="w-4 shrink-0 text-right tabular">{card.quantity}</span>
        <span className="min-w-0 truncate">{card.name}</span>
      </button>
      {preview}
    </li>
  )
})

/**
 * A group of lines under an orange header, as the site prints a decklist:
 * "4 Flooded Strand", the card shown beside the pointer on hover. A click
 * opens the card panel under the deck, and the line stays highlighted.
 */
function CardRows({ title, cards, selection }: { title: string; cards: CardEntry[]; selection: CardSelection }) {
  return (
    <div className="pb-3">
      <h3 className="break-after-avoid text-sm font-semibold text-accent uppercase">{title}</h3>
      <ul>
        {cards.map((card) => (
          <CardRow key={card.name} card={card} selection={selection} />
        ))}
      </ul>
    </div>
  )
}

/**
 * The visual view's card details, and the list's on a phone: the panel,
 * small, over the deck. It alone follows the selection.
 */
function PickedCardDialog({
  cards,
  selection,
  anchor,
}: {
  cards: CardEntry[]
  selection: CardSelection
  anchor?: { current: Anchor | undefined }
}) {
  const picked = useSelected(selection, (card) => card)
  const { data: infos } = useCardInfo(cards)
  return (
    <CardDialog
      card={picked}
      info={picked && infos?.get(cardKey(picked.name))}
      onClose={() => selection.set(undefined)}
      anchor={anchor?.current}
    />
  )
}

/**
 * The panel of the picked card, under the deck. It alone follows the
 * selection, and it loads the cards' Scryfall data, so neither a pick nor
 * that data re-renders the rest of the deck.
 */
function PickedCardPanel({ cards, selection }: { cards: CardEntry[]; selection: CardSelection }) {
  const picked = useSelected(selection, (card) => card)
  const { data: infos } = useCardInfo(cards)
  if (!picked) return null
  return (
    <div className="border-t border-line pt-4">
      <CardPanel card={picked} info={infos?.get(cardKey(picked.name))} />
    </div>
  )
}

/** The bar over the deck: what it costs at each shop the site works with. */
function PriceBar({ deck }: { deck: Deck }) {
  const { cardKingdom, manatraders, cardhoarder } = deck.prices
  return (
    <div className="flex flex-wrap justify-evenly gap-2">
      <PriceBox shop="Card Kingdom" href={deckShopUrl(deck.id, 'ck')}>
        {cardKingdom !== undefined && (
          <>
            $<Price>{cardKingdom}</Price> <span className="text-xs text-muted">(NM)</span>
          </>
        )}
      </PriceBox>
      <PriceBox shop="TCGplayer" href={deckShopUrl(deck.id, 'tcg')} />
      <PriceBox shop="Manatraders" href={deckShopUrl(deck.id, 'mt')}>
        {manatraders !== undefined && (
          <>
            <span className="text-xs text-muted">Rent for</span> $<Price>{manatraders}</Price>
          </>
        )}
      </PriceBox>
      <PriceBox shop="Cardhoarder" href={deckShopUrl(deck.id, 'ch')}>
        {cardhoarder !== undefined && (
          <>
            <Price>{cardhoarder}</Price> TIX
          </>
        )}
      </PriceBox>
    </div>
  )
}


function deckText(deck: Deck): string {
  const lines = (cards: CardEntry[]) => cards.map((card) => `${card.quantity} ${card.name}`)
  return [
    ...(deck.commanders?.length ? ['Commander', ...lines(deck.commanders), ''] : []),
    ...lines(deck.main),
    ...(deck.sideboard.length ? ['', 'Sideboard', ...lines(deck.sideboard)] : []),
  ].join('\n')
}

/** The list as MTG Arena imports it: "Deck", the lines, then "Sideboard". */
function arenaText(deck: Deck): string {
  const lines = (cards: CardEntry[]) => cards.map((card) => `${card.quantity} ${card.name}`)
  return [
    ...(deck.commanders?.length ? ['Commander', ...lines(deck.commanders), ''] : []),
    'Deck',
    ...lines(deck.main),
    ...(deck.sideboard.length ? ['', 'Sideboard', ...lines(deck.sideboard)] : []),
  ].join('\n')
}

// The toolbar's buttons: quiet until hovered, as the navbar's entries are.
const toolButton =
  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg'

/** A 16px stroke icon, drawn in the text's colour. */
function Icon({ d }: { d: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

const ICONS = {
  copy: 'M5.5 5.5V3.5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M3.5 5.5h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z',
  check: 'M3.5 8.5l3 3 6-7',
  download: 'M8 2.5v8m0 0L5 7.5m3 3 3-3M3 13.5h10',
  external: 'M9.5 2.5h4v4M13.5 2.5 7.5 8.5M12 9.5v3a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3',
  arrow: 'M3 8h10m0 0-3.5-3.5M13 8l-3.5 3.5',
  list: 'M6 4h7.5M6 8h7.5M6 12h7.5M2.75 4h.01M2.75 8h.01M2.75 12h.01',
  visual: 'M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5v4.5H9zM2.5 9h4.5v4.5H2.5zM9 9h4.5v4.5H9z',
}

/** Copies a text version of the deck, which is what the site's MTGA export hands out. */
function CopyButton({ label, text }: { label: ReactNode; text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className={toolButton}
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      <Icon d={copied ? ICONS.check : ICONS.copy} />
      {copied ? 'Copied' : label}
    </button>
  )
}

/**
 * One decklist, laid out as on the site: a toolbar, then the main deck in two
 * columns under the site's own headers and the sideboard in a third. Memoized:
 * while the next deck loads, the one on screen only fades, it does not re-render.
 */
export const DeckView = memo(function DeckView({ deck }: { deck: Deck }) {
  const [mode, setMode] = useState<'list' | 'visual'>('list')
  const selection: CardSelection = useSelectionStore<CardEntry | undefined>(undefined)
  const anchor = useRef<Anchor>(undefined)
  // On a phone, a card picked in the list opens over it, centred, rather than
  // in the panel under the deck, a long scroll away from the line tapped.
  const wide = useIsWide()
  const allCards = [...(deck.commanders ?? []), ...deck.main, ...deck.sideboard]

  const commander: DeckSection[] = deck.commanders?.length
    ? [{ title: 'Commander', cards: deck.commanders }]
    : []
  const sections = deck.sections.length ? deck.sections : [{ title: 'Main deck', cards: deck.main }]
  const sideboard: DeckSection[] = deck.sideboard.length
    ? [{ title: 'Sideboard', cards: deck.sideboard }]
    : []

  return (
    <section className="flex flex-col gap-3">
      <PriceBar deck={deck} />
      {/* The view and the counts on the left, what to do with the deck on
          the right: its exports, its archetype, its page on mtgtop8. */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line pb-3">
        <div className="flex items-center gap-4">
          {/* A segmented control: the view on display raised on a grey track. */}
          <div className="flex rounded-lg bg-surface-2 p-0.5" role="group" aria-label="View">
            {(['list', 'visual'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => {
                  // A card picked in one view does not follow into the other.
                  selection.set(undefined)
                  setMode(value)
                }}
                className={cx(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-sm font-medium capitalize transition-colors outline-none focus-visible:ring-2 focus-visible:ring-link',
                  mode === value ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg',
                )}
              >
                <Icon d={ICONS[value]} />
                {value}
              </button>
            ))}
          </div>
          <span className="text-sm text-muted">
            <strong className="font-semibold text-fg tabular">{count(deck.main)}</strong> main ·{' '}
            <strong className="font-semibold text-fg tabular">{count(deck.sideboard)}</strong> side
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {deck.arenaExport ? (
            <CopyButton label="MTGA" text={arenaText(deck)} />
          ) : (
            <CopyButton label="Copy" text={deckText(deck)} />
          )}
          <a href={`${MTGTOP8_PROXY}/${deckExportPath(deck.id)}`} className={toolButton}>
            <Icon d={ICONS.download} />
            MTGO
          </a>
          <a href={`${MTGTOP8_PROXY}/${deckDecPath(deck.id)}`} className={toolButton}>
            <Icon d={ICONS.download} />
            .dec
          </a>
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />
          {deck.archetype && (
            <Link to={`/archetype/${deck.archetype.id}?f=${deck.formatCode}`} className={toolButton}>
              {deck.archetype.name} decks
              <Icon d={ICONS.arrow} />
            </Link>
          )}
          <a
            href={originalUrl(`event?e=${deck.eventId}&d=${deck.id}&f=${deck.formatCode}`)}
            target="_blank"
            rel="noreferrer"
            className={toolButton}
          >
            mtgtop8
            <Icon d={ICONS.external} />
          </a>
        </div>
      </div>

      {mode === 'list' ? (
        <>
          <div className="grid gap-x-8 sm:grid-cols-3">
            {/* With no sideboard (the Commander formats), the main deck takes all three columns. */}
            <div
              className={cx(
                'columns-1 gap-8',
                sideboard.length ? 'sm:col-span-2 sm:columns-2' : 'sm:col-span-3 sm:columns-3',
              )}
            >
              {[...commander, ...sections].map(({ title, cards }) => (
                <CardRows key={title} title={title} cards={cards} selection={selection} />
              ))}
            </div>
            <div className={sideboard.length ? undefined : 'hidden'}>
              {sideboard.map(({ title, cards }) => (
                <CardRows key={title} title={title} cards={cards} selection={selection} />
              ))}
            </div>
          </div>
          {wide ? (
            <PickedCardPanel cards={allCards} selection={selection} />
          ) : (
            <PickedCardDialog cards={allCards} selection={selection} />
          )}
        </>
      ) : (
        <div className="flex flex-col gap-5">
          {[...commander, ...sections, ...sideboard].map(({ title, cards }) => (
            <div key={title}>
              <h3 className="mb-2 text-sm font-semibold text-accent uppercase">{title}</h3>
              <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:grid-cols-5">
                {cards.map((card) => (
                  // A click opens the card's details over the page, as the
                  // site's own visual view does.
                  <button
                    key={card.name}
                    type="button"
                    onClick={(event) => {
                      // A click by keyboard has no pointer: centred then.
                      anchor.current = event.detail ? { x: event.clientX, y: event.clientY } : undefined
                      selection.set(card)
                    }}
                    aria-label={`${card.name}, details`}
                    className="rounded-[4.75%] text-left transition-transform outline-none hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-link"
                  >
                    <CardImage name={card.name} quantity={card.quantity} />
                  </button>
                ))}
              </div>
            </div>
          ))}
          <PickedCardDialog cards={allCards} selection={selection} anchor={anchor} />
        </div>
      )}
    </section>
  )
})
