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
