import { describe, expect, it } from 'vitest'
import { archetypePath, parseArchetype } from './archetype'
import { fixture } from './testing'

describe('parseArchetype', () => {
  const page = parseArchetype(fixture('archetype.html'))

  it('flags the Commander tool in place of a breakdown', () => {
    const cedh = parseArchetype(fixture('archetype-cedh.html'))
    expect(cedh.commanderMeta).toBe(true)
    expect(cedh.metagame).toEqual([])
    expect(cedh.format.code).toBe('cEDH')
    expect(cedh.decks.items.length).toBeGreaterThan(0)
    expect(page.commanderMeta).toBe(false)
  })

  it('reads the metagame column beside the decks', () => {
    expect(page.deckCount).toBe(1120)
    expect(page.metagame.map((c) => c.name)).toEqual(['Aggro', 'Control', 'Combo'])
    // The archetype on display is boxed differently, and must lose nothing.
    expect(page.metagame[0].archetypes[0]).toMatchObject({
      id: '351',
      name: 'UR Aggro',
      share: 9,
      thumbnailPath: '/metas_thumbs/351.jpg',
    })
  })

  it('reads the archetype and its format', () => {
    expect(page.id).toBe('351')
    expect(page.name).toBe('UR Aggro')
    expect(page.format).toEqual({ code: 'MO', name: 'Modern' })
  })

  it('reads the periods and the selected one', () => {
    expect(page.periods).toHaveLength(23)
    expect(page.periods[1]).toEqual({ id: '51', label: 'Last 2 Months' })
    expect(page.periods.at(-1)).toEqual({ id: '92', label: 'History - All PT & GP' })
    expect(page.period).toEqual({ id: '54', label: 'Last 2 Weeks' })
  })

  it('reads the decks of the first page', () => {
    expect(page.decks.items).toHaveLength(20)
    expect(page.decks.items[0]).toEqual({
      id: '900440',
      eventId: '92204',
      formatCode: 'MO',
      name: 'UR Cutter Prowess',
      player: 'makaaaa',
      rank: '5-8',
      archetype: { id: '351', name: 'UR Aggro' },
      event: { name: 'MTGO Challenge 32', date: '2026-10-13', stars: 2 },
    })
    expect(page.decks.items[4]).toMatchObject({
      id: '900045',
      player: 'Fishsauce',
      rank: '3-4',
      event: { name: 'Monday LP Ver N°1 - bixotrock', stars: 1, date: '2026-10-12' },
    })
    expect(page.decks.items.at(-1)).toMatchObject({ id: '898920', player: 'Mia Leaf' })
  })

  it('reads the pagination', () => {
    expect(page.decks.page).toBe(1)
    expect(page.decks.pageCount).toBe(6)
  })

  it('reads a later page', () => {
    const page2 = parseArchetype(fixture('archetype-page2.html'))
    expect(page2.id).toBe('351')
    expect(page2.decks.page).toBe(2)
    expect(page2.decks.pageCount).toBe(6)
    expect(page2.decks.items).toHaveLength(20)
    expect(page2.decks.items[0].id).toBe('898937')
  })

  it('gives a lower bound past the 7-page nav window', () => {
    const page50 = parseArchetype(fixture('archetype-all-page50.html'))
    expect(page50.period).toEqual({ id: '44', label: 'All Modern Decks' })
    expect(page50.decks.page).toBe(50)
    expect(page50.decks.pageCount).toBe(57)
  })

  it('reads a single page list, which has no nav', () => {
    const merfolk = parseArchetype(fixture('archetype-single-page.html'))
    expect(merfolk.id).toBe('192')
    expect(merfolk.name).toBe('Merfolk')
    expect(merfolk.decks.items).toHaveLength(2)
    expect(merfolk.decks.page).toBe(1)
    expect(merfolk.decks.pageCount).toBe(1)
  })

  it('throws on another page', () => {
    expect(() => parseArchetype(fixture('event.html'))).toThrow('Not an mtgtop8 archetype page')
  })
})

describe('archetypePath', () => {
  it('builds GET paths, the page in current_page', () => {
    expect(archetypePath('351', 'MO')).toBe('archetype?a=351&f=MO')
    expect(archetypePath('351', 'MO', '54')).toBe('archetype?a=351&meta=54&f=MO')
    expect(archetypePath('351', 'MO', '54', 1)).toBe('archetype?a=351&meta=54&f=MO')
    expect(archetypePath('351', 'MO', '54', 2)).toBe('archetype?a=351&meta=54&f=MO&current_page=2')
  })
})
