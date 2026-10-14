import { describe, expect, it } from 'vitest'

import { commanderMetaPath, parseCommanderMeta } from './commander'
import { parseFormat } from './format'
import { fixture } from './testing'

describe('parseCommanderMeta', () => {
  it('reads the commanders by popularity', () => {
    const meta = parseCommanderMeta(fixture('commander-pop.html'))
    expect(meta.total).toBe(713)
    expect(meta.matching).toBeUndefined()
    expect(meta.shares).toHaveLength(133)
    expect(meta.decks).toEqual([])
    expect(meta.shares[0]).toEqual({
      archetypeId: '1158',
      name: 'Partner WUBR',
      colors: ['W', 'U', 'B', 'R'],
      permille: 108,
      thumbnailPath: '/metas_thumbs/1158.jpg',
    })
    expect(meta.shares[1]).toMatchObject({ name: 'Kinnan, Bonder Prodigy', colors: ['G', 'U'], permille: 70.1 })
  })

  it('reads a colour identity filter', () => {
    const meta = parseCommanderMeta(fixture('commander-pop-ub.html'))
    expect(meta.total).toBe(713)
    expect(meta.matching).toBe(11)
    expect(meta.shares[0]).toMatchObject({ name: "Yuriko, the Tiger's Shadow", colors: ['U', 'B'], permille: 9.8 })
    expect(meta.shares.every((share) => share.colors.join('') === 'UB')).toBe(true)
  })

  it('reads the latest decks and their pager', () => {
    const meta = parseCommanderMeta(fixture('commander-decks.html'))
    expect(meta.shares).toEqual([])
    expect(meta.decks).toHaveLength(50)
    expect(meta.decks[0]).toEqual({
      deckId: '900390',
      eventId: '92201',
      name: 'Kinnan, Bonder Prodigy',
      colors: ['G', 'U'],
      thumbnailPath: '/metas_thumbs/1246.jpg',
    })
    expect(meta.page).toBe(1)
    expect(meta.pageCount).toBe(5)
  })

  it('refuses a page that is not the tool', () => {
    expect(() => parseCommanderMeta(fixture('event.html'))).toThrow(/commander metagame/)
  })
})

describe('commanderMetaPath', () => {
  it('asks for what the site asks for', () => {
    expect(
      commanderMetaPath({ format: 'cEDH', period: '327', show: 'decks', colors: 'UB', page: 2 }),
    ).toBe('cEDH_decks?f=cEDH&show=decks&cid=UB&meta=327&gamerid1=&gamerid2=&cEDH_cp=2')
  })
})

describe('parseFormat on a Commander format', () => {
  it('flags the metagame tool instead of failing', () => {
    const format = parseFormat(fixture('format-cedh.html'))
    expect(format.commanderMeta).toBe(true)
    expect(format.metagame).toEqual([])
    expect(format.format.code).toBe('cEDH')
    expect(format.period).toEqual({ id: '327', label: 'Last 2 Weeks' })
    expect(format.majorEvents.length).toBeGreaterThan(0)
  })

  it('leaves the other formats as they are', () => {
    expect(parseFormat(fixture('format.html')).commanderMeta).toBe(false)
  })
})
