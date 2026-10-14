import { describe, expect, it } from 'vitest'

import { parseCardPrices } from './card'
import { fixture } from './testing'

describe('parseCardPrices', () => {
  it('reads the prices and where to buy the card', () => {
    const prices = parseCardPrices(fixture('card-biz.html'))
    expect(prices.cardKingdom?.usd).toBe(0.99)
    expect(prices.cardKingdom?.url).toMatch(/^https:\/\/www\.cardkingdom\.com\//)
    expect(prices.cardhoarder?.tix).toBe(1.01)
    expect(prices.cardhoarder?.url).toMatch(/^https:\/\/www\.cardhoarder\.com\//)
  })

  it('reads nothing from a page without prices', () => {
    expect(parseCardPrices(fixture('event.html'))).toEqual({})
  })
})
