/**
 * The search page, `/search`: a POST form (`search_form`) and, once
 * submitted, the matching decks 25 per page under a "<n> decks matching"
 * title. The server also reads the same fields from a GET query string.
 */
import type { Format, SearchOptions, SearchQuery, SearchResults } from '../types'
import { parseDeckRows, parsePageNav } from './archetype'
import { clean, parseInteger } from './util'

const PAGE_SIZE = 25

/**
 * Competition levels, the `compet_check[...]` boxes: P Professional, M Major,
 * C Competitive, R Regular. All are checked on the site, and sending none is
 * treated the same as sending all.
 */
const LEVELS = ['P', 'M', 'C', 'R'] as const

function searchFormOf(doc: Document): HTMLFormElement {
  const form = doc.querySelector<HTMLFormElement>('form[name=search_form]')
  if (!form) throw new Error('Not an mtgtop8 search page')
  return form
}

export function parseSearchOptions(doc: Document): SearchOptions {
  const form = searchFormOf(doc)

  // "All" has an empty value; COMF/NCOMF ("All (non-)Commander formats") are
  // real filters and kept.
  const formats: Format[] = [...form.querySelectorAll('select[name=format] option')]
    .map((option) => ({ code: option.getAttribute('value') ?? '', name: clean(option.textContent) }))
    .filter((format) => format.code)

  // One hidden select per format, `archetype_sel[MO]`, shown by the page's JS.
  // Some exist for formats missing from the format select (EDHP).
  const archetypes: SearchOptions['archetypes'] = {}
  for (const select of form.querySelectorAll('select[name^="archetype_sel["]')) {
    const code = select.getAttribute('name')?.match(/^archetype_sel\[(.+)\]$/)?.[1]
    if (!code) continue
    archetypes[code] = [...select.querySelectorAll('option')]
      .map((option) => ({ id: option.getAttribute('value') ?? '', name: clean(option.textContent) }))
      .filter((archetype) => archetype.id)
  }

  return { formats, archetypes }
}

/** "2026-09-01" to "01/09/2026", the D/M/Y the site expects (ISO is ignored). */
function siteDate(iso: string | undefined): string {
  const match = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : ''
}

/**
 * The fields to POST to `/search` (form-urlencoded, as `search_form` sends
 * them). Unchecked boxes are omitted, as a browser does.
 */
export function searchForm(query: SearchQuery): Record<string, string> {
  const fields: Record<string, string> = {
    current_page: query.page && query.page > 1 ? String(query.page) : '',
    event_titre: query.eventName ?? '',
    deck_titre: query.deckName ?? '',
    player: query.player ?? '',
    format: query.format ?? '',
  }
  // The archetype select is keyed by format; the site honours it on its own.
  if (query.format && query.archetypeId) fields[`archetype_sel[${query.format}]`] = query.archetypeId
  for (const level of LEVELS) fields[`compet_check[${level}]`] = '1'
  const board = query.board ?? 'main'
  if (board !== 'side') fields.MD_check = '1'
  if (board !== 'main') fields.SB_check = '1'
  // Card lines must be CRLF-separated: with bare LF the card filter is dropped.
  fields.cards = (query.cards ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\r\n')
  fields.date_start = siteDate(query.dateStart)
  fields.date_end = siteDate(query.dateEnd)
  return fields
}

export function parseSearchResults(doc: Document): SearchResults {
  searchFormOf(doc)
  const titleEl = [...doc.querySelectorAll('.w_title')].find((el) => /decks? matching/.test(clean(el.textContent)))
  const total = titleEl ? parseInteger(titleEl.textContent) : undefined

  const table = doc.querySelector('form[name=compare_decks] table')
  const items = table ? parseDeckRows(table) : []

  // The site prints the total, so the page count is exact here, unlike the
  // nav's 7-page window.
  const nav = parsePageNav(doc)
  const pageCount = total === undefined ? nav.pageCount : Math.max(1, Math.ceil(total / PAGE_SIZE))

  return { total, decks: { items, page: nav.page, pageCount } }
}
