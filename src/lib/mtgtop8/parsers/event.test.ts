import { describe, expect, it } from 'vitest'
import { parseDeckExport, parseEvent } from './event'
import { fixture, fixtureText } from './testing'

const qty = (cards: { quantity: number; name: string }[], name: string) =>
  cards.find((c) => c.name === name)?.quantity
const total = (cards: { quantity: number }[]) => cards.reduce((sum, c) => sum + c.quantity, 0)

describe('parseEvent', () => {
  it('reads a paper Modern event and its winning deck', () => {
    const event = parseEvent(fixture('event.html'))
    expect(event.id).toBe('92202')
    expect(event.name).toBe('Regional Championship - CAMS - T13')
    expect(event.location).toBe('Necrotower Gamecenter (Mexico, Mexico)')
    expect(event.format).toEqual({ code: 'MO', name: 'Modern' })
    expect(event.date).toBe('2026-10-10')
    expect(event.stars).toBe(3)
    expect(event.source).toBe('paper')
    expect(event.playerCount).toBe(184)

    expect(event.standings).toHaveLength(32)
    expect(event.standings[0]).toEqual({
      deckId: '900393',
      rank: '1',
      deckName: 'Esper Blink',
      player: 'Allan Ayapan',
      thumbnailPath: '/metas_thumbs/285.jpg',
    })
    expect(event.standings.map((s) => s.rank).slice(0, 9)).toEqual([
      '1', '2', '3-4', '3-4', '5-8', '5-8', '5-8', '5-8', '9-16',
    ])
    expect(event.standings.at(-1)?.rank).toBe('17-32')
    expect(event.standings[10].player).toBe('Edgar Emmanuel Rangel Páez')

    const deck = event.deck
    expect(deck).toMatchObject({
      id: '900393',
      eventId: '92202',
      formatCode: 'MO',
      name: 'Esper Blink',
      player: 'Allan Ayapan',
      rank: '1',
      archetype: { id: '285', name: 'Blink' },
    })
    expect(total(deck.main)).toBe(60 + 1) // the page prints "MD 61"
    expect(total(deck.sideboard)).toBe(15)
    expect(qty(deck.main, 'Flooded Strand')).toBe(4)
    expect(qty(deck.main, 'Teferi, Time Raveler')).toBe(2)
    expect(qty(deck.main, 'Consign to Memory')).toBe(1)
    expect(qty(deck.sideboard, 'Consign to Memory')).toBe(3)
    expect(qty(deck.sideboard, 'Elesh Norn, Mother of Machines')).toBe(1)
    expect(deck.commanders).toBeUndefined()
  })

  it('reads the same event when the page names its deck with d=', () => {
    const event = parseEvent(fixture('event-deck.html'))
    expect(event.deck.id).toBe('900393')
    expect(event.standings).toHaveLength(32)
  })

  it('keeps the main deck in the groups the site prints', () => {
    const { deck } = parseEvent(fixture('event-deck.html'))
    expect(deck.sections.map((section) => section.title)).toEqual([
      '19 LANDS (24)',
      '27 CREATURES',
      '13 INSTANTS AND SORC.',
      '2 OTHER SPELLS',
    ])
    expect(deck.sections.flatMap((section) => section.cards)).toEqual(deck.main)
  })

  it('reads the price bar, the card ids and the exports on offer', () => {
    const { deck } = parseEvent(fixture('event-deck.html'))
    expect(deck.prices).toEqual({ cardKingdom: 1072, manatraders: 34.95, cardhoarder: 63 })
    expect(deck.main.find((card) => card.name === 'Fatal Push')?.cardId).toBe('aer057')
    expect(deck.main.every((card) => card.cardId)).toBe(true)
    // Modern is not played on Arena; Pioneer is.
    expect(deck.arenaExport).toBe(false)
    expect(parseEvent(fixture('event-pioneer.html')).deck.arenaExport).toBe(true)
  })

  it('reads an event that dates its decks instead of ranking them', () => {
    const event = parseEvent(fixture('event-rogue-corner.html'))
    expect(event.name).toBe("The Rogue Corner - October '26")
    expect(event.standings.slice(0, 2).map((s) => [s.rank, s.deckName])).toEqual([
      ['Oct 5th', 'BUG Company'],
      ['Oct 2nd', 'Helmut Zemo Aggro'],
    ])
    expect(event.deck).toMatchObject({ id: '895929', name: 'BUG Company', player: 'Aurélien Lion', rank: undefined })
  })

  it('reads the deck the page shows, not the winner', () => {
    const event = parseEvent(fixture('event-deck-2nd.html'))
    expect(event.standings[0].deckId).toBe('900393')
    expect(event.deck).toMatchObject({
      id: '900394',
      name: 'Instant Reanimator',
      player: 'Dagoberto Silva',
      rank: '2',
      archetype: { id: '312', name: 'Instant Reanimator' },
    })
    expect(total(event.deck.main)).toBe(60)
    expect(total(event.deck.sideboard)).toBe(15)
  })

  it('fills the commander zone of a cEDH deck', () => {
    const event = parseEvent(fixture('event-cedh.html'))
    expect(event).toMatchObject({
      id: '92067',
      name: 'Collectible Ventures: S.N.L. - Mages 10K Birthday Bash',
      location: "Mage's Sanctum (Waco, TX)",
      format: { code: 'cEDH', name: 'cEDH' },
      date: '2026-10-10',
      playerCount: 94,
      source: 'paper',
    })
    expect(event.standings).toHaveLength(32)
    expect(event.deck.commanders).toMatchObject([{ quantity: 1, name: 'Kinnan, Bonder Prodigy' }])
    expect(event.deck.archetype).toEqual({ id: '1246', name: 'Kinnan, Bonder Prodigy' })
    expect(total(event.deck.main)).toBe(99)
    expect(event.deck.sideboard).toEqual([])
    expect(qty(event.deck.main, "Gaea's Cradle")).toBe(1)
  })

  it('fills the commander zone of a Duel Commander deck', () => {
    const event = parseEvent(fixture('event-duel-commander.html'))
    expect(event.format).toEqual({ code: 'EDH', name: 'Duel Commander' })
    expect(event.stars).toBe(1)
    expect(event.standings).toHaveLength(4)
    // The title escapes the apostrophe twice; the DOM decodes it once.
    expect(event.deck.name).toBe("Brigid, Clachan's Hearth")
    expect(event.deck.commanders).toHaveLength(1)
    expect(total(event.deck.main)).toBe(99)
  })

  it('reads an MTGO Challenge', () => {
    const event = parseEvent(fixture('event-mtgo-challenge.html'))
    expect(event).toMatchObject({
      id: '92130',
      name: 'MTGO Challenge 32',
      format: { code: 'PAU', name: 'Pauper' },
      date: '2026-10-11',
      stars: 2,
      source: 'mtgo',
      playerCount: 58,
    })
    expect(event.location).toBeUndefined()
    expect(event.standings).toHaveLength(16)
    expect(event.standings[8]).toEqual({
      deckId: '899763',
      rank: '9',
      deckName: 'Balustrade Spy',
      player: 'Dr_dej96',
      thumbnailPath: '/metas_thumbs/2596.jpg',
    })
    expect(event.deck).toMatchObject({
      id: '899757',
      name: 'Dimir Faeries',
      player: 'Purgatory_01',
      archetype: { id: '517', name: 'Dimir Control' },
    })
    expect(qty(event.deck.main, 'Island')).toBe(10)
    expect(qty(event.deck.sideboard, 'Hydroblast')).toBe(4)
  })

  it('leaves the player count out when the page has none', () => {
    const event = parseEvent(fixture('event-mtgo-league.html'))
    expect(event.name).toBe('MTGO League')
    expect(event.date).toBe('2026-10-12')
    expect(event.playerCount).toBeUndefined()
    expect(event.standings).toHaveLength(8)
  })

  it('rejects a page that is not an event', () => {
    expect(() => parseEvent(fixture('home.html'))).toThrow(/not an mtgtop8 event page/i)
  })
})

describe('parseDeckExport', () => {
  it('splits the MTGO export at its Sideboard line', () => {
    const { main, sideboard } = parseDeckExport(fixtureText('deck-export.txt'))
    expect(total(main)).toBe(61)
    expect(total(sideboard)).toBe(15)
    expect(main[0]).toEqual({ quantity: 4, name: 'Overlord of the Balemurk' })
    expect(qty(main, 'Consign to Memory')).toBe(1)
    expect(qty(sideboard, 'Consign to Memory')).toBe(3)
  })

  it('puts a commander in the sideboard, as the site exports it', () => {
    const { main, sideboard } = parseDeckExport(fixtureText('deck-export-cedh.txt'))
    expect(total(main)).toBe(99)
    expect(sideboard).toEqual([{ quantity: 1, name: 'Kinnan, Bonder Prodigy' }])
  })

  it('tolerates blank lines, LF endings and a missing sideboard', () => {
    expect(parseDeckExport('\n4 Thoughtseize\n2 Solitude\n\n')).toEqual({
      main: [
        { quantity: 4, name: 'Thoughtseize' },
        { quantity: 2, name: 'Solitude' },
      ],
      sideboard: [],
    })
    // Without a Sideboard line, a blank line splits the lists, as on MTGO.
    expect(parseDeckExport('4 Thoughtseize\n\n2 Duress\n')).toEqual({
      main: [{ quantity: 4, name: 'Thoughtseize' }],
      sideboard: [{ quantity: 2, name: 'Duress' }],
    })
    expect(parseDeckExport('4 Thoughtseize\r\n\r\nSideboard\r\n\r\n2 Duress\r\n').sideboard).toEqual([
      { quantity: 2, name: 'Duress' },
    ])
    expect(parseDeckExport('')).toEqual({ main: [], sideboard: [] })
  })
})
