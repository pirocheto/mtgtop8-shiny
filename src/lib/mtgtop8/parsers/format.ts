import type {
  ArchetypeShare,
  EventSource,
  EventSummary,
  Format,
  FormatPage,
  MetaPeriod,
  MetagameCategory,
  Paged,
  TopCard,
  Trend,
} from '../types'
import { clean, countStars, links, param, parseDate, parseInteger, parsePercent } from './util'

/** "DUEL COMMANDER" to "Duel Commander"; labels with lowercase ("cEDH") are kept. */
export function titleCase(label: string): string {
  if (label !== label.toUpperCase()) return label
  return label.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase())
}

/** The source icon: /graph/online/paper.png, mtgo.png, mtga.png or other.png. */
export function parseSource(root: ParentNode): EventSource | undefined {
  const src = root.querySelector('img[src*="/graph/online/"]')?.getAttribute('src') ?? ''
  const kind = src.match(/\/graph\/online\/(\w+)\.png/)?.[1]
  if (kind === 'paper') return 'paper'
  if (kind === 'mtgo') return 'mtgo'
  // MTG Arena has no value of its own in the contract.
  if (kind === 'mtga' || kind === 'other') return 'other'
  return undefined
}

/**
 * Stars as drawn in an event row. Some big events get a single `bigstar.png`
 * instead of three `star.png` (countStars would read it as one), so it maps
 * to the top of the scale.
 */
export function parseStars(root: ParentNode): number {
  if (root.querySelector('img[src*="bigstar.png"]')) return 3
  return Math.min(countStars(root), 3)
}

/**
 * One event row, as the home and format pages print them: a source icon, the
 * event link (then optionally "@ <location link>" and a NEW tag), the stars,
 * and the DD/MM/YY date in the last cell.
 */
export function parseEventRow(row: HTMLTableRowElement): EventSummary | undefined {
  const [link, place] = links(row, /event\?e=/)
  const href = link?.getAttribute('href')
  const id = param(href, 'e')
  if (!link || !id) return undefined
  const location = place && place.getAttribute('href') === href ? clean(place.textContent) : ''
  return {
    id,
    formatCode: param(href, 'f') ?? '',
    name: clean(link.textContent),
    date: parseDate(row.cells[row.cells.length - 1]?.textContent) ?? '',
    stars: parseStars(row),
    source: parseSource(row),
    isNew: row.querySelector('.new') !== null,
    location: location || undefined,
  }
}

/** The `.w_title` box whose text starts with `title` (case-insensitive) or matches it. */
export function sectionTitle(doc: Document, title: string | RegExp): Element | undefined {
  return [...doc.querySelectorAll('.w_title')].find((el) => {
    const text = clean(el.textContent)
    return typeof title === 'string' ? text.toUpperCase().startsWith(title) : title.test(text)
  })
}

/** The first element after `el` (a sibling) matching `selector`. */
function nextSibling(el: Element | undefined, selector: string): Element | undefined {
  for (let next = el?.nextElementSibling; next; next = next.nextElementSibling) {
    if (next.matches(selector)) return next
  }
  return undefined
}

function eventRows(table: Element | undefined): EventSummary[] {
  if (!table) return []
  return [...table.querySelectorAll('tr')]
    .map((row) => parseEventRow(row))
    .filter((event) => event !== undefined)
}

/**
 * The site's pager: `.Nav_cur` holds the current page and the `.Nav_norm`
 * cells the others. It only shows a window of pages around the current one,
 * so pageCount is the highest page it links to, a lower bound when far away.
 */
export function parsePager(root: ParentNode | undefined): { page: number; pageCount: number } {
  const page = parseInteger(root?.querySelector('.Nav_cur')?.textContent) ?? 1
  const numbers = [...(root?.querySelectorAll('.Nav_norm, .Nav_cur') ?? [])]
    .map((el) => clean(el.textContent))
    .filter((text) => /^\d+$/.test(text))
    .map(Number)
  return { page, pageCount: Math.max(page, ...numbers) }
}

/** Every format of the global nav menu, `/format?f=` links, in menu order. */
export function parseFormats(doc: Document): Format[] {
  const formats = new Map<string, Format>()
  for (const link of links(doc, /format\?f=/)) {
    if (!link.className.startsWith('menu_item')) continue
    const code = param(link.getAttribute('href'), 'f')
    const name = titleCase(clean(link.textContent))
    if (code && name && !formats.has(code)) formats.set(code, { code, name })
  }
  return [...formats.values()]
}

/** The format a page is about: the highlighted menu entry, named after the title. */
export function currentFormat(doc: Document): Format {
  const chosen = doc.querySelector<HTMLAnchorElement>('a.menu_item_chosen[href*="f="]')
  const code =
    param(chosen?.getAttribute('href'), 'f') ??
    param(links(doc, /[?&]meta=\d+/)[0]?.getAttribute('href'), 'f') ??
    ''
  // <title> reads "Modern events and metagame @ mtgtop8.com".
  const fromTitle = clean(doc.title).match(/^(.+?) (?:events and metagame|most played cards)/)?.[1]
  return { code, name: fromTitle ?? titleCase(clean(chosen?.textContent)) }
}

const TRENDS: Record<string, Trend> = {
  up_strong: 'strong-up',
  up_light: 'up',
  down_light: 'down',
  down_strong: 'strong-down',
}

function parseArchetype(link: HTMLAnchorElement): ArchetypeShare | undefined {
  const id = param(link.getAttribute('href'), 'a')
  if (!id) return undefined
  // The archetype's box: thumbnail, name link, then "9 %" and a trend icon.
  // On an archetype page, that archetype's box is .chosen_tr instead.
  const box = link.closest('.hover_tr, .chosen_tr') ?? link.parentElement?.parentElement ?? link
  const shareText = [...box.querySelectorAll('div')]
    .map((div) => clean(div.textContent))
    .find((text) => /^\d+(?:[.,]\d+)? ?%$/.test(text))
  const trendSrc = box.querySelector('img[src*="/graph/up_"], img[src*="/graph/down_"]')
  const trendKey = trendSrc?.getAttribute('src')?.match(/\/graph\/((?:up|down)_\w+)\.png/)?.[1]
  const thumb = box.querySelector('img[src*="/metas_thumbs/"]')?.getAttribute('src')
  return {
    id,
    name: clean(link.textContent),
    share: parsePercent(shareText) ?? 0,
    trend: trendKey ? TRENDS[trendKey] : undefined,
    thumbnailPath: thumb ?? undefined,
  }
}

/**
 * Category headers ("AGGRO 40%", `.meta_arch`) and archetype boxes are
 * siblings, so walking both in document order groups the archetypes.
 */
export function parseMetagame(doc: Document): MetagameCategory[] {
  const categories: MetagameCategory[] = []
  const nodes = doc.querySelectorAll<HTMLElement>('.meta_arch, a[href*="archetype?a="]')
  for (const node of nodes) {
    if (node.classList.contains('meta_arch')) {
      const text = clean(node.textContent)
      categories.push({
        name: titleCase(text.replace(/\s*\d+(?:[.,]\d+)?\s*%.*$/, '')),
        share: parsePercent(text) ?? 0,
        archetypes: [],
      })
      continue
    }
    const archetype = parseArchetype(node as HTMLAnchorElement)
    if (!archetype) continue
    if (categories.length === 0) categories.push({ name: '', share: 0, archetypes: [] })
    categories[categories.length - 1].archetypes.push(archetype)
  }
  return categories.filter((category) => category.archetypes.length > 0)
}

/** The metagame period picker: links to `?f=..&meta=N`, the current one `.chosen_tr`. */
function parsePeriods(doc: Document): { periods: MetaPeriod[]; period?: MetaPeriod } {
  const root = doc.querySelector('#metas_list') ?? doc
  const periods: MetaPeriod[] = []
  let period: MetaPeriod | undefined
  for (const link of links(root, /[?&]meta=\d+/)) {
    const id = param(link.getAttribute('href'), 'meta')
    if (!id || periods.some((p) => p.id === id)) continue
    const entry = { id, label: clean(link.textContent) }
    periods.push(entry)
    // .chosen_tr marks it, or, on the Commander pages, a yellow background.
    const chosen = link.querySelector('.chosen_tr, [style*="#ffdd33"]') ?? (link.classList.contains('chosen_tr') ? link : null)
    if (chosen) period = entry
  }
  return { periods, period }
}

/**
 * "Most played cards" on the format page: card images only, linking to
 * mtgpics (`card?ref=zen211`), with the share in `.most_perc`. The page does
 * not print the card names.
 */
function parseFormatTopCards(doc: Document): TopCard[] {
  const title = sectionTitle(doc, 'MOST PLAYED CARDS')
  const root = nextSibling(title, 'div') ?? title?.parentElement
  if (!root) return []
  return [...root.querySelectorAll('.most_perc')].flatMap((perc) => {
    const box = perc.closest('a') ?? perc.parentElement
    const img = box?.querySelector('img[src*="/pics/"]')?.getAttribute('src') ?? undefined
    const share = parsePercent(perc.textContent)
    return share === undefined ? [] : [{ name: '', share, imagePath: img }]
  })
}

/** The "1120 decks" line under the period picker of the metagame column. */
export function parseDeckCount(doc: Document): number {
  const count = [...doc.querySelectorAll('div.S14')]
    .map((div) => clean(div.textContent).match(/^([\d,. ]+) decks?$/)?.[1])
    .find((text) => text !== undefined)
  return parseInteger(count) ?? 0
}

export function parseFormat(doc: Document): FormatPage {
  const metagame = parseMetagame(doc)
  // The Commander formats load their metagame apart, into div#cEDH_decks.
  const commanderMeta = doc.querySelector('#cEDH_decks') !== null
  if (metagame.length === 0 && !commanderMeta) {
    throw new Error('Not a format page: no metagame breakdown found')
  }

  const { periods, period } = parsePeriods(doc)

  const majorTitle = sectionTitle(doc, 'LAST MAJOR EVENTS')
  // Titled "LAST 20 EVENTS" on the first page, "Events 21 to 40" on the next.
  const recentTitle = sectionTitle(doc, /^(?:last \d+ events|events \d+ to \d+)/i)
  const recentTable = nextSibling(recentTitle, 'table')
  // The pager is the div right after the events table.
  const pager = recentTable?.nextElementSibling?.querySelector('.Nav_cur')
    ? recentTable.nextElementSibling
    : undefined
  const recentEvents: Paged<EventSummary> = {
    items: eventRows(recentTable),
    ...parsePager(pager ?? undefined),
  }

  return {
    format: currentFormat(doc),
    periods,
    period: period ?? periods[0] ?? { id: '', label: '' },
    deckCount: parseDeckCount(doc),
    metagame,
    majorEvents: eventRows(nextSibling(majorTitle, 'table')),
    recentEvents,
    topCards: parseFormatTopCards(doc),
    commanderMeta,
  }
}
