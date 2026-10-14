import type { ReactNode } from 'react'

import { cardImageUrl } from '../lib/scryfall'
import { cx } from '../lib/utils'
import { useCardPreview } from './useCardPreview'

/** "{2}{W/U}{B}" drawn with Scryfall's own symbol set. */
export function ManaCost({ cost, className }: { cost?: string; className?: string }) {
  if (!cost) return null
  const symbols = [...cost.matchAll(/\{([^}]+)\}/g)].map((match) => match[1])
  return (
    <span className={cx('inline-flex items-center gap-px', className)}>
      {symbols.map((symbol, i) => (
        <img
          key={i}
          src={`https://svgs.scryfall.io/card-symbols/${symbol.replace('/', '')}.svg`}
          alt={`{${symbol}}`}
          className="size-3.5"
          loading="lazy"
        />
      ))}
    </span>
  )
}

/** Rules text with its "{T}", "{1}"... symbols drawn, a paragraph per line. */
export function RulesText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {text.split('\n').map((line, i) => (
        <p key={i}>
          {line.split(/(\{[^}]+\})/).map((part, j) =>
            /^\{[^}]+\}$/.test(part) ? (
              <ManaCost key={j} cost={part} className="mx-px align-[-2px]" />
            ) : (
              part
            ),
          )}
        </p>
      ))}
    </div>
  )
}

/** A card name that shows the card's image while hovered. */
export function CardName({ name, className }: { name: string; className?: string }) {
  const { handlers, preview } = useCardPreview(name)
  return (
    <>
      <span className={cx('cursor-default hover:text-link', className)} {...handlers}>
        {name}
      </span>
      {preview}
    </>
  )
}

/**
 * One of mtgtop8's own scans. They are cropped inside the card's border, with
 * square corners, so rounding the image itself would cut into the frame: as
 * the site does, the scan sits square in a black frame and the frame is
 * rounded, which redraws the border.
 */
export function SiteCardScan({
  src,
  alt,
  className,
  children,
}: {
  /** None yet: the frame is drawn empty, at the scan's size, until it comes. */
  src?: string
  alt: string
  className?: string
  children?: ReactNode
}) {
  return (
    <div className={cx('relative rounded-[6%/4.3%] bg-black p-[4.5%]', className)}>
      {src ? (
        <img src={src} alt={alt} title={alt} loading="lazy" className="block aspect-[200/285] w-full object-cover" />
      ) : (
        <div role="img" aria-label={alt} className="aspect-[200/285] w-full" />
      )}
      {children}
    </div>
  )
}

/** A full card image, with a text fallback while it loads or when unknown. */
export function CardImage({
  name,
  quantity,
  className,
}: {
  name: string
  quantity?: number
  className?: string
}) {
  return (
    <figure className={cx('relative', className)}>
      {/* A card, plain: nothing drawn under it while it loads. */}
      <img
        src={cardImageUrl(name)}
        alt={name}
        loading="lazy"
        className="block aspect-[488/680] w-full rounded-[4.75%]"
      />
      {quantity !== undefined && (
        <figcaption className="absolute top-2 right-2 rounded-full bg-black/80 px-2 py-0.5 text-xs font-bold text-white tabular">
          ×{quantity}
        </figcaption>
      )}
    </figure>
  )
}

const COLOR_CLASS: Record<string, string> = {
  W: 'bg-mana-w',
  U: 'bg-mana-u',
  B: 'bg-mana-b',
  R: 'bg-mana-r',
  G: 'bg-mana-g',
}

/** Colour pips, e.g. for a deck's colours. Colourless when empty. */
export function ColorPips({ colors }: { colors: string[] }) {
  const shown = colors.length ? colors : ['C']
  return (
    <span className="inline-flex -space-x-1">
      {shown.map((color) => (
        <span
          key={color}
          className={cx('size-3.5 rounded-full ring-2 ring-surface', COLOR_CLASS[color] ?? 'bg-mana-c')}
          title={color}
        />
      ))}
    </span>
  )
}
