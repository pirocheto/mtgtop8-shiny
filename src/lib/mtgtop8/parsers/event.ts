/**
 * The event page, `event?e=<id>&f=<format>[&d=<deckId>]`: the event header,
 * its standings in the left column, and one deck list on the right.
 */
import type { CardEntry, Deck, DeckPrices, DeckSection, EventPage, EventSource, Standing } from '../types'
import { clean, countStars, links, param, parseDate, parseInteger } from './util'

export function parseEvent(doc: Document): EventPage {
  // The page header: event name, then "#<rank> <deck> - <player>", then the
  // ←/→ arrows to the neighbouring decks, each in a div.event_title.
  const titles = [...doc.querySelectorAll('.event_title')]
  // div.meta_arch holds "<format name> <stars> <source icon>"; the div right
  // after it holds "<n> players - DD/MM/YY" (no player count for leagues).
  const meta = doc.querySelector('.meta_arch')
  if (titles.length === 0 || !meta) throw new Error('Not an mtgtop8 event page: no event header found')

  const standings = parseStandings(doc)
  const eventLink = links(doc, /[?&]e=\d+/)[0]?.getAttribute('href')
  const id = param(eventLink, 'e')
  const formatCode = param(eventLink, 'f')
  if (!id || !formatCode) throw new Error('Not an mtgtop8 event page: no event id found')

  // "Name @ Venue (City, Country)": the location is only there for paper events.
  const heading = clean(titles[0].textContent)
  const at = heading.lastIndexOf(' @ ')
  const name = at >= 0 ? heading.slice(0, at) : heading
  const location = at >= 0 ? heading.slice(at + 3) || undefined : undefined

  const info = clean(meta.nextElementSibling?.textContent)
  const players = info.match(/(\d[\d,.]*)\s*players?/i)
  const date = parseDate(info)
  if (!date) throw new Error('Not an mtgtop8 event page: no event date found')

  return {
    id,
    name,
    format: { code: formatCode, name: clean(meta.textContent) },
    date,
    stars: countStars(meta),
    source: parseSource(meta),
    playerCount: players ? parseInteger(players[1]) : undefined,
    location,
    standings,
    deck: parseDeck(doc, titles, standings, id, formatCode),
  }
}

/** The source icon is `/graph/online/<paper|mtgo|...>.png`. */
function parseSource(root: Element): EventSource | undefined {
  const src = root.querySelector('img[src*="/graph/online/"]')?.getAttribute('src')
  const kind = src?.match(/\/graph\/online\/(\w+)\.png/)?.[1]
  if (!kind) return undefined
  return kind === 'paper' || kind === 'mtgo' ? kind : 'other'
}

function parseStandings(doc: Document): Standing[] {
  // Each row is a div.hover_tr (div.chosen_tr for the deck shown), but deck
  // list lines reuse .hover_tr too, hence the .deck_line exclusion.
  const rows = doc.querySelectorAll('div.chosen_tr, div.hover_tr:not(.deck_line)')
  const standings: Standing[] = []
  for (const row of rows) {
    const deckLink = links(row, /[?&]d=\d+/).find((a) => clean(a.textContent))
    const deckId = param(deckLink?.getAttribute('href'), 'd')
    if (!deckLink || !deckId) continue
    standings.push({
      deckId,
      rank: rankCell(row),
      deckName: clean(deckLink.textContent),
      player: clean(row.querySelector('a.player')?.textContent),
      thumbnailPath: row.querySelector('img[src*="/metas_thumbs/"]')?.getAttribute('src') ?? undefined,
    })
  }
  return standings
}

/**
 * The row's first cell: the rank ("1", "3-4"), or, in the Rogue Corner's
 * monthly events, the day the deck was played ("Oct<br>5th"). The deck name
 * is in a .S14 too, so the cell is found by position, not by class.
 */
function rankCell(row: Element): string {
  const cell = row.firstElementChild?.firstElementChild
  if (!cell || cell.querySelector('a')) return ''
  const copy = cell.cloneNode(true) as Element
  for (const br of copy.querySelectorAll('br')) br.replaceWith(' ')
  return clean(copy.textContent)
}

function parseDeck(
  doc: Document,
  titles: Element[],
  standings: Standing[],
  eventId: string,
  formatCode: string,
): Deck {
  const chosenRow = doc.querySelector('div.chosen_tr')
  const chosenId = chosenRow ? param(links(chosenRow, /[?&]d=\d+/)[0]?.getAttribute('href'), 'd') : undefined
  // The export links (`mtgo?d=`, `dec?d=`) always name the deck on display.
  const exportId = param(links(doc, /^\/?mtgo\?d=/)[0]?.getAttribute('href'), 'd')
  const id = exportId ?? chosenId ?? standings[0]?.deckId
  if (!id) throw new Error('Not an mtgtop8 event page: no deck found')
  const standing = standings.find((s) => s.deckId === id)

  // "#2 Instant Reanimator - <a class=player_big>Player</a>"
  const title = titles.find((t) => t.querySelector('a.player_big'))
  const player = clean(title?.querySelector('a.player_big')?.textContent) || standing?.player || ''
  let rank = standing?.rank
  let name = standing?.deckName ?? ''
  if (title) {
    const playerLink = title.querySelector('a.player_big')
    const before = clean(
      [...title.childNodes]
        .slice(0, playerLink ? [...title.childNodes].indexOf(playerLink) : undefined)
        .map((n) => n.textContent)
        .join(''),
    )
    // "#2 Instant Reanimator -", or "# BUG Company -" when the event does
    // not rank its decks (the Rogue Corner).
    const match = before.match(/^#(?:(\S+)\s+)?\s*(.*?)\s*-?$/)
    if (match) {
      rank = match[1]
      name = match[2] || name
    }
  }

  // The archetype link reads "<archetype> decks".
  const archetypeLink = links(doc, /^\/?archetype\?a=\d+/)[0]
  const archetypeId = param(archetypeLink?.getAttribute('href'), 'a')
  const archetype = archetypeLink && archetypeId
    ? { id: archetypeId, name: clean(archetypeLink.textContent).replace(/\s+decks$/i, '') }
    : undefined

  const { main, sections, sideboard, commanders } = parseCards(doc)
  return {
    id,
    eventId,
    formatCode,
    name,
    player,
    rank,
    archetype,
    main,
    sections,
    sideboard,
    commanders: commanders.length > 0 ? commanders : undefined,
    prices: parsePrices(doc),
    // The button only exists for the formats Arena plays; its id is also
    // named in a script on every page, hence the element lookup.
    arenaExport: doc.querySelector('#MTGA_button_div') !== null,
  }
}

/**
 * The price bar over the deck: one div.Nav_buy per shop, opening
 * `shop?d=<deck>&s=<ck|tcg|mt|ch>`, its price in span.O14. TCGplayer's is
 * filled in by a script later, so it is never in the page.
 */
function parsePrices(doc: Document): DeckPrices {
  const prices: DeckPrices = {}
  for (const box of doc.querySelectorAll('div.Nav_buy[onclick]')) {
    const shop = box.getAttribute('onclick')?.match(/[?&]s=(\w+)/)?.[1]
    const price = Number(clean(box.querySelector('.O14')?.textContent).replace(/,/g, ''))
    if (!price) continue
    if (shop === 'ck') prices.cardKingdom = price
    else if (shop === 'mt') prices.manatraders = price
    else if (shop === 'ch') prices.cardhoarder = price
  }
  return prices
}

function parseCards(doc: Document) {
  const main: CardEntry[] = []
  const sideboard: CardEntry[] = []
  const commanders: CardEntry[] = []
  const sections: DeckSection[] = []
  // Cards are div.deck_line "4 <span class=L14>Name</span>", in columns, after
  // div.O14 headers: "19 LANDS (24)", "27 CREATURES"..., "SIDEBOARD", and
  // "COMMANDER" first in commander formats. The line id is "md<card>" or
  // "sb<card>", but commanders are "sb" too, so the headers decide.
  let section: CardEntry[] | undefined
  for (const node of doc.querySelectorAll('div.O14, div.deck_line')) {
    if (!node.classList.contains('deck_line')) {
      const header = clean(node.textContent).toUpperCase()
      if (header.startsWith('COMMANDER')) section = commanders
      else if (header.startsWith('SIDEBOARD')) section = sideboard
      else if (/[A-Z]/.test(header)) {
        section = main
        sections.push({ title: header, cards: [] })
      }
      continue
    }
    const nameNode = node.querySelector('.L14')
    const cardName = clean(nameNode?.textContent)
    const quantity = parseInteger(node.textContent)
    if (!cardName || quantity === undefined) continue
    const target = section ?? (node.id.startsWith('sb') ? sideboard : main)
    // onclick="AffCard('aer057','Fatal+Push',...)": the printing's id.
    const cardId = node.getAttribute('onclick')?.match(/AffCard\('([^']+)'/)?.[1]
    const entry: CardEntry = cardId ? { quantity, name: cardName, cardId } : { quantity, name: cardName }
    target.push(entry)
    if (target === main) {
      // A main deck line before any header still gets a group of its own.
      if (sections.length === 0) sections.push({ title: 'MAIN DECK', cards: [] })
      sections[sections.length - 1].cards.push(entry)
    }
  }
  return { main, sections, sideboard, commanders }
}

/**
 * The plain-text export at `/mtgo?d=<deckId>`: "4 Card Name" lines, CRLF, then
 * a "Sideboard" line. Commander decks put their commander in the sideboard.
 */
export function parseDeckExport(text: string): { main: CardEntry[]; sideboard: CardEntry[] } {
  const main: CardEntry[] = []
  const sideboard: CardEntry[] = []
  const lines = text.split(/\r?\n/).map((line) => clean(line))
  // Without a "Sideboard" line, a blank line after the main deck starts it,
  // as in MTGO's own format.
  const hasMarker = lines.some((line) => /^sideboard:?$/i.test(line))
  let target = main
  for (const line of lines) {
    if (/^sideboard:?$/i.test(line)) {
      target = sideboard
      continue
    }
    if (!line) {
      if (!hasMarker && main.length > 0) target = sideboard
      continue
    }
    const match = line.match(/^(\d+)x?\s+(.+)$/)
    if (match) target.push({ quantity: Number(match[1]), name: match[2] })
  }
  return { main, sideboard }
}
