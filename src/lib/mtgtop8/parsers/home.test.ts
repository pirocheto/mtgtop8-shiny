import { describe, expect, it } from 'vitest'
import { parseHome } from './home'
import { fixture } from './testing'


describe('parseHome', () => {
  const home = parseHome(fixture('home.html'))

  it('groups the major events by format, in page order', () => {
    expect(home.majorEvents.map((g) => [g.format, g.events.length])).toEqual([
      [{ code: 'ST', name: 'Standard' }, 2],
      [{ code: 'MO', name: 'Modern' }, 4],
      [{ code: 'PAU', name: 'Pauper' }, 4],
    ])
    expect(home.majorEvents[0].events[0]).toEqual({
      id: '92221',
      formatCode: 'ST',
      name: 'Champions Cup Premium Qualifier',
      date: '2026-10-11',
      stars: 3,
      source: 'paper',
      isNew: true,
      location: 'TC (Tokyo, Japan)',
    })
    expect(home.majorEvents[0].events[1]).toMatchObject({ id: '92055', source: 'mtgo' })
    // The last Modern row comes after the Pauper ones on the page.
    expect(home.majorEvents[1].events[3]).toMatchObject({
      id: '91607',
      date: '2026-10-03',
      isNew: false,
      location: undefined,
    })
    // A single bigstar.png counts as the top of the scale.
    expect(home.majorEvents[2].events[0]).toMatchObject({ id: '92219', stars: 3 })
  })

  it('reads the rogue decks', () => {
    expect(home.rogueDecks).toHaveLength(6)
    expect(home.rogueDecks[0]).toMatchObject({ id: '895929', eventId: '91562', name: 'BUG Company' })
    expect(home.rogueDecks).toContainEqual({
      id: '895296',
      eventId: '91564',
      formatCode: 'PI',
      name: 'Mardu Yorion Control',
      thumbnailPath: '/deckpics/895296_th.jpg',
    })
    expect(home.rogueDecks.at(-1)).toMatchObject({ id: '888489', name: 'Bant Blink' })
  })

  it('reads the 7-day stats', () => {
    expect(home.stats).toEqual({ decks: 3482, events: 448, days: 7 })
  })

  it('refuses a page that is not the home page', () => {
    expect(() => parseHome(fixture('topcards.html'))).toThrow(/home page/)
  })
})
