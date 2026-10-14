/**
 * The archetype page, `archetype?a=<id>&meta=<period>&f=<format>`: the
 * metagame breakdown on the left, as on the format page, and the archetype's
 * decks on the right, 20 per page.
 */
import type { ArchetypePage, DeckSummary, MetaPeriod, Paged } from '../types'
import { parseDeckCount, parseMetagame } from './format'
import { clean, countStars, links, param, parseDate } from './util'

/**
 * Site-relative path of an archetype page, without the leading slash.
 *
 * Pagination is a POST form (`nav_form`, field `current_page`) on the site,
 * but the server reads `current_page` from the query string just as well, so
 * a plain GET link reaches any page.
 */
export function archetypePath(id: string, format: string, period?: string, page?: number): string {
  const query = new URLSearchParams({ a: id })
  if (period) query.set('meta', period)
  query.set('f', format)
  if (page && page > 1) query.set('current_page', String(page))
  return `archetype?${query}`
}

export function parseArchetype(doc: Document): ArchetypePage {
  // The period menu links back to this page with every period: `?f=MO&meta=54&a=351`.
  const periodLinks = links(doc.getElementById('metas_list') ?? doc, /[?&]meta=\d+/).filter((a) =>
    param(a.getAttribute('href'), 'a'),
  )
  const table = doc.querySelector('form[name=compare_decks] table')
  if (!periodLinks.length || !table) throw new Error('Not an mtgtop8 archetype page')

  const firstHref = periodLinks[0].getAttribute('href')
  const id = param(firstHref, 'a') ?? ''
  const formatCode = param(firstHref, 'f') ?? ''

  const periods: MetaPeriod[] = periodLinks.map((a) => ({
    id: param(a.getAttribute('href'), 'meta') ?? '',
    label: clean(a.textContent),
  }))
  const chosen = periodLinks.find((a) => a.querySelector('.chosen_tr'))
  const period = chosen ? periods[periodLinks.indexOf(chosen)] : periods[0]

  // The table title is "<name> decks", the word trailing the corner divs.
  const titleEl = table.querySelector('.w_title')
  const name = clean(titleEl?.firstChild?.textContent) || clean(titleEl?.textContent).replace(/ decks$/, '')

  // <title> reads "Modern UR Aggro decklists @ mtgtop8.com".
  const title = clean(doc.title).replace(/ decklists.*$/, '')
  const formatName = title.endsWith(` ${name}`) ? title.slice(0, -name.length - 1) : formatCode

  const archetype = { id, name }
  const items = parseDeckRows(table).map((deck) => ({ ...deck, archetype }))

  return {
    id,
    name,
    format: { code: formatCode, name: formatName },
    periods,
    period,
    // The Commander formats have none in the page: their tool is loaded apart.
    metagame: parseMetagame(doc),
    commanderMeta: doc.querySelector('#cEDH_decks') !== null,
    deckCount: parseDeckCount(doc),
    decks: { items, ...parsePageNav(doc) },
  }
}

/**
 * The deck rows shared by the archetype and search pages: `tr.hover_tr` rows
 * whose columns are named by a header row (Deck, Player, Format, Event, Level,
 * Rank, Date), the search page having an extra Format column.
 */
export function parseDeckRows(table: Element): DeckSummary[] {
  const rows = [...table.querySelectorAll('tr')]
  const header = rows.find((tr) => [...tr.cells].some((td) => clean(td.textContent) === 'Deck'))
  const columns = header ? [...header.cells].map((td) => clean(td.textContent)) : []
  const cell = (tr: HTMLTableRowElement, column: string) => {
    const index = columns.indexOf(column)
    return index >= 0 ? tr.cells[index] : undefined
  }

  const decks: DeckSummary[] = []
  for (const tr of rows) {
    const deckLink = links(tr, /[?&]d=\d+/)[0]
    if (!deckLink) continue
    const deckHref = deckLink.getAttribute('href')
    const eventLink = links(tr, /event\?e=/).find((a) => !param(a.getAttribute('href'), 'd'))
    const level = cell(tr, 'Level')
    // The search page appends the venue to the event name: "MMM @ TC (Osaka, Japan)".
    const eventName = clean(eventLink?.textContent).split(' @ ')[0]
    const date = parseDate(cell(tr, 'Date')?.textContent)
    decks.push({
      id: param(deckHref, 'd') ?? '',
      eventId: param(deckHref, 'e') ?? '',
      formatCode: param(deckHref, 'f') ?? '',
      name: clean(deckLink.textContent),
      player: clean(tr.querySelector('a.player')?.textContent) || undefined,
      rank: clean(cell(tr, 'Rank')?.textContent) || undefined,
      event: {
        name: eventName,
        ...(date && { date }),
        ...(level && { stars: countStars(level) }),
      },
    })
  }
  return decks
}

/**
 * The page links: `.Nav_cur` is the current page, `.Nav_norm` the others,
 * `.Nav_PN`/`.Nav_PN_no` Prev and Next. The site only shows a window of 7
 * pages on each side of the current one and never the last page, so when the
 * list is longer the count here is a lower bound. No nav at all means a single
 * page.
 */
export function parsePageNav(root: ParentNode): Pick<Paged<unknown>, 'page' | 'pageCount'> {
  const page = Number(clean(root.querySelector('.Nav_cur')?.textContent)) || 1
  const numbers = [...root.querySelectorAll('.Nav_cur, .Nav_norm')]
    .map((el) => Number(clean(el.textContent)))
    .filter((n) => Number.isInteger(n) && n > 0)
  return { page, pageCount: Math.max(page, ...numbers) }
}
