/**
 * The metagame tool of the Commander formats (cEDH, Duel Commander), which
 * the format page loads into div#cEDH_decks:
 *
 * - `cEDH_decks?f=&show=&cid=&meta=&gamerid1=&gamerid2=&cEDH_cp=` (POST, the
 *   parameters in the query string): a "713 decks" line, or "11 <symbols>
 *   decks / 713" once filtered, then one div.hover_tr per row. "pop" and
 *   "alpha" rows are commanders with their share in per mille; "decks" rows
 *   are single decks, paged 50 at a time.
 */
import type { ColorId, CommanderDeck, CommanderMeta, CommanderQuery, CommanderShare } from '../types'
import { parsePager } from './format'
import { clean, param, parseInteger } from './util'

const COLOR_IDS = new Set<string>(['W', 'U', 'B', 'R', 'G', 'I'])

/** The request the site's ReloadDecks() makes, path and query. */
export function commanderMetaPath(query: CommanderQuery): string {
  const params = new URLSearchParams({
    f: query.format,
    show: query.show,
    cid: query.colors,
    meta: query.period,
    // The site's search by commander, which this app does not offer.
    gamerid1: '',
    gamerid2: '',
    cEDH_cp: String(query.page ?? 1),
  })
  return `cEDH_decks?${params.toString()}`
}

/** Colour identity symbols: graph/manas/<letter>.png. */
function colorsOf(root: Element): ColorId[] {
  return [...root.querySelectorAll('img[src*="/manas/"]')]
    .map((img) => img.getAttribute('src')?.match(/\/manas\/([A-Z])\.png$/)?.[1] ?? '')
    .filter((letter): letter is ColorId => COLOR_IDS.has(letter))
}

export function parseCommanderMeta(doc: Document): CommanderMeta {
  // "713 decks", or "11 <UB> decks / 713" when a filter is set.
  const counter = [...doc.querySelectorAll('div.S14')].find((div) => /\bdecks?\b/.test(clean(div.textContent)))
  const counts = clean(counter?.textContent).match(/^([\d,.]+)\s*decks?(?:\s*\/\s*([\d,.]+))?/)
  if (!counts) throw new Error('Not an mtgtop8 commander metagame: no deck count found')
  const total = parseInteger(counts[2] ?? counts[1]) ?? 0
  const matching = counts[2] ? parseInteger(counts[1]) : undefined

  const shares: CommanderShare[] = []
  const decks: CommanderDeck[] = []
  for (const row of doc.querySelectorAll('div.hover_tr')) {
    const link = row.querySelector<HTMLAnchorElement>('a[href]')
    const href = link?.getAttribute('href')
    if (!link || !href) continue
    const thumbnailPath = row.querySelector('img[src*="/metas_thumbs/"]')?.getAttribute('src') ?? undefined
    const name = clean(link.textContent)
    const archetypeId = param(href, 'a')
    const deckId = param(href, 'd')
    const eventId = param(href, 'e')
    if (archetypeId) {
      // "108 ‰", the sign in its own span.
      const permille = [...row.querySelectorAll('div')]
        .map((div) => clean(div.textContent))
        .find((text) => /^\d+(?:\.\d+)?\s*‰$/.test(text))
      shares.push({
        archetypeId,
        name,
        colors: colorsOf(row),
        permille: Number.parseFloat(permille ?? '0'),
        thumbnailPath,
      })
    } else if (deckId && eventId) {
      decks.push({ deckId, eventId, name, colors: colorsOf(row), thumbnailPath })
    }
  }

  const pager = doc.querySelector('.Nav_cur')?.parentElement ?? undefined
  return { total, matching, shares, decks, ...parsePager(pager) }
}
