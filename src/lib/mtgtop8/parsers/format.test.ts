import { describe, expect, it } from 'vitest'
import { parseFormat, parseFormats } from './format'
import { fixture } from './testing'


describe('parseFormat', () => {
  const format = parseFormat(fixture('format.html'))

  it('reads the format and the metagame periods', () => {
    expect(format.format).toEqual({ code: 'MO', name: 'Modern' })
    expect(format.periods).toHaveLength(23)
    expect(format.periods[1]).toEqual({ id: '51', label: 'Last 2 Months' })
    expect(format.period).toEqual({ id: '54', label: 'Last 2 Weeks' })
    expect(format.deckCount).toBe(1120)
  })

  it('groups the archetypes by category', () => {
    expect(format.metagame.map((c) => [c.name, c.share, c.archetypes.length])).toEqual([
      ['Aggro', 40, 20],
      ['Control', 18, 13],
      ['Combo', 42, 20],
    ])
    const [aggro, control] = format.metagame
    expect(aggro.archetypes[0]).toEqual({
      id: '351',
      name: 'UR Aggro',
      share: 9,
      trend: undefined,
      thumbnailPath: '/metas_thumbs/351.jpg',
    })
    expect(aggro.archetypes[1]).toMatchObject({ id: '300', name: '4/5c Aggro', trend: 'up' })
    expect(aggro.archetypes.find((a) => a.id === '918')).toMatchObject({ trend: 'strong-up' })
    expect(aggro.archetypes.find((a) => a.id === '285')).toMatchObject({ trend: 'strong-down' })
    expect(aggro.archetypes.find((a) => a.id === '231')?.share).toBe(0.9)
    expect(control.archetypes[1]).toMatchObject({ id: '188', name: 'UrzaTron', share: 3, trend: 'down' })
  })

  it('reads the last major events', () => {
    expect(format.majorEvents).toHaveLength(5)
    expect(format.majorEvents[0]).toEqual({
      id: '92202',
      formatCode: 'MO',
      name: 'Regional Championship - CAMS - T13',
      date: '2026-10-10',
      stars: 3,
      source: 'paper',
      isNew: true,
      location: 'Necrotower Gamecenter (Mexico, Mexico)',
    })
    expect(format.majorEvents[4]).toMatchObject({ id: '91677', date: '2026-10-03', isNew: false })
  })

  it('reads the last 20 events and their pager', () => {
    const { items, page, pageCount } = format.recentEvents
    expect(items).toHaveLength(20)
    expect(items[0]).toMatchObject({
      id: '92206',
      name: 'MTGO Challenge 16',
      date: '2026-10-13',
      stars: 1,
      source: 'mtgo',
      location: undefined,
    })
    expect(items.find((e) => e.id === '92167')?.source).toBe('other')
    expect(items.find((e) => e.id === '92204')?.stars).toBe(2)
    expect([page, pageCount]).toEqual([1, 4])
  })

  it('reads the most played cards', () => {
    expect(format.topCards).toHaveLength(10)
    expect(format.topCards[0]).toEqual({ name: '', share: 35, imagePath: '/pics/zen/211.jpg' })
  })

  it('reads the second page of events', () => {
    const page2 = parseFormat(fixture('format-page2.html'))
    expect(page2.recentEvents.items).toHaveLength(20)
    expect(page2.recentEvents.items[0]).toMatchObject({ id: '92163', date: '2026-10-10' })
    expect(page2.recentEvents.page).toBe(2)
    expect(page2.recentEvents.pageCount).toBe(5)
  })

  it('refuses a page without a metagame', () => {
    expect(() => parseFormat(fixture('home.html'))).toThrow(/no metagame/)
  })
})

describe('parseFormats', () => {
  it('lists the formats of the nav menu once each', () => {
    const formats = parseFormats(fixture('home.html'))
    expect(formats).toHaveLength(17)
    expect(formats).toContainEqual({ code: 'MO', name: 'Modern' })
    expect(formats).toContainEqual({ code: 'EDH', name: 'Duel Commander' })
    expect(formats).toContainEqual({ code: 'cEDH', name: 'cEDH' })
    expect(formats).toContainEqual({ code: 'CHL', name: 'Canadian Highlander' })
    // Limited links to format_limited, without a code.
    expect(formats.some((f) => f.name === 'Limited')).toBe(false)
  })
})
