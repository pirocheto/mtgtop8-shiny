/**
 * A card's prices, from the frame the site's card panel embeds:
 * `card_biz?cid=<cardId>&p=<name>`. One shop link per price, its value in
 * span.O14. The card itself (scan, type, text) comes from Scryfall, which the
 * decklist has already loaded.
 */
import type { CardPrices } from '../types'
import { clean } from './util'

export function parseCardPrices(biz: Document): CardPrices {
  const prices: CardPrices = {}
  for (const link of biz.querySelectorAll('a[href]')) {
    const url = link.getAttribute('href') ?? ''
    const value = Number(clean(link.querySelector('.O14')?.textContent))
    if (!value) continue
    if (url.includes('cardkingdom.com')) prices.cardKingdom = { usd: value, url }
    else if (url.includes('cardhoarder.com')) prices.cardhoarder = { tix: value, url }
  }
  return prices
}
