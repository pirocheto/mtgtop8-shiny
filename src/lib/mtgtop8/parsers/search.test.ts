import { describe, expect, it } from 'vitest'
import { parseSearchOptions, parseSearchResults, searchForm } from './search'
import { fixture } from './testing'

describe('parseSearchOptions', () => {
  const options = parseSearchOptions(fixture('search-form.html'))

  it('reads the formats, without "All"', () => {
    expect(options.formats).toHaveLength(21)
    expect(options.formats[0]).toEqual({ code: 'COMF', name: 'All Commander formats' })
    expect(options.formats).toContainEqual({ code: 'MO', name: 'Modern' })
    expect(options.formats).toContainEqual({ code: 'EDH', name: 'Duel Commander' })
    expect(options.formats.at(-1)).toEqual({ code: 'LI', name: 'Limited' })
  })

  it('reads the archetypes of each format', () => {
    expect(Object.keys(options.archetypes)).toHaveLength(19)
    expect(options.archetypes.MO).toHaveLength(111)
    expect(options.archetypes.MO[0]).toEqual({ id: '300', name: '4/5c Aggro' })
    expect(options.archetypes.MO).toContainEqual({ id: '351', name: 'UR Aggro' })
    expect(options.archetypes.LE).toHaveLength(92)
    expect(options.archetypes.PAU).toContainEqual({ id: '2568', name: 'Careful Pili-Pala' })
    expect(options.archetypes.cEDH).toHaveLength(1079)
  })

  it('throws on another page', () => {
    expect(() => parseSearchOptions(fixture('event.html'))).toThrow('Not an mtgtop8 search page')
  })
})

describe('searchForm', () => {
  it('sends the site defaults for an empty query', () => {
    expect(searchForm({})).toEqual({
      current_page: '',
      event_titre: '',
      deck_titre: '',
      player: '',
      format: '',
      'compet_check[P]': '1',
      'compet_check[M]': '1',
      'compet_check[C]': '1',
      'compet_check[R]': '1',
      MD_check: '1',
      cards: '',
      date_start: '',
      date_end: '',
    })
  })

  it('maps every field of a full query', () => {
    expect(
      searchForm({
        format: 'MO',
        archetypeId: '351',
        player: 'makaaaa',
        eventName: 'Challenge',
        deckName: 'Prowess',
        cards: 'Solitude\nFury\n',
        board: 'both',
        dateStart: '2026-09-01',
        dateEnd: '2026-09-15',
        page: 2,
      }),
    ).toEqual({
      current_page: '2',
      event_titre: 'Challenge',
      deck_titre: 'Prowess',
      player: 'makaaaa',
      format: 'MO',
      'archetype_sel[MO]': '351',
      'compet_check[P]': '1',
      'compet_check[M]': '1',
      'compet_check[C]': '1',
      'compet_check[R]': '1',
      MD_check: '1',
      SB_check: '1',
      cards: 'Solitude\r\nFury',
      date_start: '01/09/2026',
      date_end: '15/09/2026',
    })
  })

  it('checks only the sideboard box for a sideboard search', () => {
    const fields = searchForm({ cards: 'Solitude', board: 'side' })
    expect(fields.SB_check).toBe('1')
    expect(fields).not.toHaveProperty('MD_check')
  })
})

describe('parseSearchResults', () => {
  const results = parseSearchResults(fixture('search-results.html'))

  it('reads the total and the pagination', () => {
    expect(results.total).toBe(13456)
    expect(results.decks.page).toBe(1)
    expect(results.decks.pageCount).toBe(539)
  })

  it('reads the deck rows', () => {
    expect(results.decks.items).toHaveLength(25)
    expect(results.decks.items[0]).toEqual({
      id: '900456',
      eventId: '92206',
      formatCode: 'MO',
      name: 'Scepter Chant',
      player: 'nahuel10',
      rank: '1',
      event: { name: 'MTGO Challenge 16', date: '2026-10-13', stars: 1 },
    })
    // The venue the site appends after " @ " is dropped from the event name.
    expect(results.decks.items[6]).toMatchObject({
      id: '899119',
      player: 'Tai Akio',
      event: { name: 'MMM', date: '2026-10-11' },
    })
  })

  it('reads a later page', () => {
    const page2 = parseSearchResults(fixture('search-results-page2.html'))
    expect(page2.total).toBe(13456)
    expect(page2.decks.page).toBe(2)
    expect(page2.decks.pageCount).toBe(539)
    expect(page2.decks.items).toHaveLength(25)
    expect(page2.decks.items[0].id).toBe('898880')
  })

  it('reads a short last page', () => {
    const last = parseSearchResults(fixture('search-results-last-page.html'))
    expect(last.total).toBe(109)
    expect(last.decks.page).toBe(5)
    expect(last.decks.pageCount).toBe(5)
    expect(last.decks.items).toHaveLength(9)
    expect(last.decks.items.every((deck) => deck.event?.date === '2026-09-01')).toBe(true)
  })

  it('reads an empty result', () => {
    expect(parseSearchResults(fixture('search-results-empty.html'))).toEqual({
      total: 0,
      decks: { items: [], page: 1, pageCount: 1 },
    })
  })

  it('reads the bare form page, which lists every deck', () => {
    const all = parseSearchResults(fixture('search-form.html'))
    expect(all.total).toBe(623768)
    expect(all.decks.pageCount).toBe(24951)
    expect(all.decks.items).toHaveLength(25)
  })

  it('throws on another page', () => {
    expect(() => parseSearchResults(fixture('event.html'))).toThrow('Not an mtgtop8 search page')
  })
})
