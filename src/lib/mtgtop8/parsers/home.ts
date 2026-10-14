import type { DeckSummary, EventSummary, Format, HomePage } from '../types'
import { parseEventRow, sectionTitle } from './format'
import { clean, links, param } from './util'

/** Major events: one row per event, the first cell holding the format in bold. */
function parseMajorEvents(doc: Document): HomePage['majorEvents'] {
  const table = sectionTitle(doc, 'LAST MAJOR EVENTS')?.nextElementSibling
  if (!table || table.tagName !== 'TABLE') return []
  const groups = new Map<string, { format: Format; events: EventSummary[] }>()
  for (const row of table.querySelectorAll('tr')) {
    const event = parseEventRow(row)
    if (!event) continue
    const name = clean(row.querySelector('b')?.textContent) || event.formatCode
    let group = groups.get(event.formatCode)
    if (!group) {
      group = { format: { code: event.formatCode, name }, events: [] }
      groups.set(event.formatCode, group)
    }
    group.events.push(event)
  }
  return [...groups.values()]
}

/**
 * Rogue decks: each one is a name link and a thumbnail link to the same
 * `event?e=&d=&f=` URL, the format name in a <b> before the name.
 */
function parseRogueDecks(doc: Document): DeckSummary[] {
  const decks = new Map<string, DeckSummary>()
  for (const link of links(doc, /event\?e=\d+&d=\d+/)) {
    const href = link.getAttribute('href')
    const id = param(href, 'd')
    const eventId = param(href, 'e')
    if (!id || !eventId) continue
    let deck = decks.get(id)
    if (!deck) {
      deck = { id, eventId, formatCode: param(href, 'f') ?? '', name: '' }
      decks.set(id, deck)
    }
    const name = clean(link.textContent)
    if (name) deck.name = name
    // The site writes it relative ("deckpics/895929_th.jpg").
    const thumb = link.querySelector('img')?.getAttribute('src')
    if (thumb) deck.thumbnailPath = thumb.startsWith('/') ? thumb : `/${thumb}`
  }
  return [...decks.values()].filter((deck) => deck.name)
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
}

/**
 * "On the last seven days, mtgtop8.com updated its database with 3482 decks
 * that performed in 448 events worldwide."
 */
function parseStats(doc: Document): HomePage['stats'] {
  const text = clean(doc.body?.textContent)
  const match = text.match(/last (\w+) days.*?([\d,.]+) decks.*?([\d,.]+) events/i)
  if (!match) return undefined
  const [, daysText, decks, events] = match
  const days = /^\d+$/.test(daysText) ? Number(daysText) : NUMBER_WORDS[daysText.toLowerCase()]
  if (days === undefined) return undefined
  const toNumber = (value: string) => Number(value.replace(/[^\d]/g, ''))
  return { decks: toNumber(decks), events: toNumber(events), days }
}

export function parseHome(doc: Document): HomePage {
  if (!sectionTitle(doc, 'LAST MAJOR EVENTS') && !sectionTitle(doc, 'LAST ROGUE DECKS')) {
    throw new Error('Not the mtgtop8 home page: no major events nor rogue decks found')
  }
  return {
    majorEvents: parseMajorEvents(doc),
    rogueDecks: parseRogueDecks(doc),
    stats: parseStats(doc),
  }
}
