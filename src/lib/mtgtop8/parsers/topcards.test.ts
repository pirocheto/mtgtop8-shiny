import { describe, expect, it } from 'vitest'
import { parseTopCards, topCardsForm } from './topcards'
import { fixture } from './testing'


describe('parseTopCards', () => {
  const topCards = parseTopCards(fixture('topcards.html'))

  it('reads the format and the periods of its own select', () => {
    expect(topCards.format).toEqual({ code: 'MO', name: 'Modern' })
    expect(topCards.periods).toHaveLength(23)
    expect(topCards.periods.at(-1)).toEqual({ id: '92', label: 'History - All PT & GP' })
    expect(topCards.period).toEqual({ id: '54', label: 'Last 2 Weeks' })
  })

  it('reads the cards', () => {
    expect(topCards.cards).toHaveLength(20)
    expect(topCards.cards[0]).toEqual({
      name: 'Arid Mesa',
      share: 34.8,
      averageCopies: 2.9,
      imagePath: '/pics/zen/211.jpg',
      cardId: 'zen211',
    })
    expect(topCards.cards[3]).toEqual({
      name: "Urza's Saga",
      share: 31,
      averageCopies: 4,
      imagePath: '/pics/mh2/259.jpg',
      cardId: 'mh2259',
    })
  })

  it('refuses a page without the form', () => {
    expect(() => parseTopCards(fixture('home.html'))).toThrow(/top cards/)
  })
})

describe('topCardsForm', () => {
  it('defaults to the maindeck with lands, first page', () => {
    expect(topCardsForm({ format: 'MO', period: '54' })).toEqual({
      format: 'MO',
      'metagame_sel[MO]': '54',
      maindeck: 'MD',
      lands: '1',
      data: '1',
      current_page: '',
      card_col: '',
      card_type: '',
      card_rarity: '',
    })
  })

  it('maps the colour, type and rarity filters', () => {
    expect(topCardsForm({ format: 'MO', period: '54', color: 'U', type: 'IN', rarity: 'M' })).toMatchObject({
      card_col: 'U',
      card_type: 'IN',
      card_rarity: 'M',
    })
  })

  it('maps the sideboard, no lands and a page', () => {
    const fields = topCardsForm({ format: 'PAU', period: '145', board: 'side', lands: false }, 3)
    expect(fields).toEqual({
      format: 'PAU',
      'metagame_sel[PAU]': '145',
      maindeck: 'SB',
      data: '1',
      current_page: '3',
      card_col: '',
      card_type: '',
      card_rarity: '',
    })
  })
})

describe('parseTopCards paging', () => {
  it('reads the current page and the highest page the pager links to', () => {
    const page = parseTopCards(fixture('topcards.html'))
    expect(page.page).toBe(1)
    expect(page.pageCount).toBeGreaterThanOrEqual(4)
  })
})
