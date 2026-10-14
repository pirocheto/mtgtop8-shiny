import type { ReactNode } from 'react'

import type { CardEntry } from '../lib/mtgtop8/types'
import { useCardPrices } from '../lib/queries'
import type { CardInfo } from '../lib/scryfall'
import { cx } from '../lib/utils'
import { CardImage, ManaCost, RulesText } from './cards'
import { SourceBadge } from './ui'
import { Spin } from './Spin'

/**
 * A shop and its price, as the site draws them: a dark label beside a light
 * box. Without a price the box says so, rather than staying blank.
 */
export function PriceBox({ shop, href, children }: { shop: string; href?: string; children?: ReactNode }) {
  const box = 'flex items-stretch overflow-hidden rounded-md border border-fg/80 text-xs'
  const content = (
    <>
      <span className="flex items-center bg-fg/85 px-2 py-0.5 font-semibold whitespace-nowrap text-bg">{shop}</span>
      <span className="flex-1 self-center bg-surface px-1.5 text-center whitespace-nowrap">
        {children || (
          <span className="text-xs text-muted" title="No price for this shop">
            N/A
          </span>
        )}
      </span>
    </>
  )
  // Without a shop page to open, the box is not a link.
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className={cx(box, 'hover:border-link')}>
      {content}
    </a>
  ) : (
    <div className={box}>{content}</div>
  )
}

export const Price = ({ children }: { children: ReactNode }) => (
  <span className="text-sm font-medium text-accent tabular">{children}</span>
)

/**
 * The card shown beside a list of cards: the one hovered (or clicked) last. The card itself comes from
 * Scryfall, already loaded for the list and its scan already cached by the
 * hover preview, so it shows at once; only the prices come from the site,
 * filled in when it answers.
 */
export function CardPanel({
  card,
  info,
  compact = false,
}: {
  card: CardEntry
  info?: CardInfo
  /** Smaller, for the panel that opens over the visual view. */
  compact?: boolean
}) {
  const { data: prices, isPending, error } = useCardPrices(card)
  // While the site answers, "…"; once it has, its price or N/A.
  const loading = Boolean(card.cardId) && isPending && !error
  return (
    <div className={cx('grid', compact ? 'gap-4 sm:grid-cols-[10rem_1fr]' : 'gap-6 sm:grid-cols-[16rem_1fr]')}>
      <div className="flex justify-center">
        <CardImage name={card.name} className={compact ? 'w-40' : 'w-64'} />
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="w-14">
              <SourceBadge source="paper" />
            </span>
            <PriceBox shop="Card Kingdom" href={prices?.cardKingdom?.url}>
              {loading ? (
                <Spin className="align-[-3px]" />
              ) : (
                prices?.cardKingdom && (
                  <>
                    $<Price>{prices.cardKingdom.usd}</Price> <span className="text-xs text-muted">(NM)</span>
                  </>
                )
              )}
            </PriceBox>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-14">
              <SourceBadge source="mtgo" />
            </span>
            <PriceBox shop="Cardhoarder" href={prices?.cardhoarder?.url}>
              {loading ? (
                <Spin className="align-[-3px]" />
              ) : (
                prices?.cardhoarder && (
                  <>
                    <Price>{prices.cardhoarder.tix}</Price> TIX
                  </>
                )
              )}
            </PriceBox>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold">{info?.name ?? card.name}</h3>
            <ManaCost cost={info?.manaCost} className="[&>img]:size-5" />
          </div>
          {info && (
            <>
              <div className="text-sm text-muted">{info.typeLine}</div>
              <RulesText text={info.oracleText} className="mt-1 text-sm" />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/** Where the pointer was when a card was clicked, to open its details there. */
export type Anchor = { x: number; y: number }

/**
 * A card's panel, small, opened over the page where the card was clicked, as
 * the site's own visual view does, and kept on screen near the edges;
 * centred without an anchor (the keyboard, a phone). A click outside or
 * Escape closes it. A native <dialog>, which keeps the focus inside while
 * open and gives it back to the card on closing; its backdrop is clear, so
 * the page stays in view, but for a phone's, where the panel covers most of it.
 */
export function CardDialog({
  card,
  info,
  onClose,
  anchor,
}: {
  card?: CardEntry
  info?: CardInfo
  onClose: () => void
  anchor?: Anchor
}) {
  // Under and beside the pointer, flipped above it near the bottom of the
  // window and slid in from the edges; centred when opened by the keyboard.
  const place = (dialog: HTMLDialogElement) => {
    const gap = 12
    const { width, height } = dialog.getBoundingClientRect()
    const at = anchor ?? { x: window.innerWidth / 2, y: (window.innerHeight - height) / 2 - gap }
    const left = Math.min(Math.max(gap, at.x - width / 2), window.innerWidth - width - gap)
    const below = at.y + gap
    const top = below + height + gap <= window.innerHeight ? below : Math.max(gap, at.y - gap - height)
    Object.assign(dialog.style, { inset: 'auto', left: `${left}px`, top: `${top}px` })
  }

  return (
    <dialog
      ref={(dialog) => {
        if (!dialog) return
        if (card && !dialog.open) {
          dialog.showModal()
          place(dialog)
        } else if (!card && dialog.open) dialog.close()
      }}
      onClose={onClose}
      // A click on the backdrop lands on the dialog itself, not its content.
      onClick={(event) => event.target === event.currentTarget && onClose()}
      aria-label={card?.name}
      className="m-0 max-h-[calc(100dvh-1.5rem)] w-[min(34rem,calc(100vw-1.5rem))] overflow-y-auto rounded-xl border border-line bg-surface p-0 shadow-2xl shadow-black/25 backdrop:bg-black/40 sm:backdrop:bg-transparent"
    >
      {card && (
        <div className="relative p-4 text-sm">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-2 right-2 z-10 rounded-lg px-2.5 py-1 text-muted hover:bg-surface-2 hover:text-fg"
          >
            ✕
          </button>
          <CardPanel card={card} info={info} compact />
        </div>
      )}
    </dialog>
  )
}
