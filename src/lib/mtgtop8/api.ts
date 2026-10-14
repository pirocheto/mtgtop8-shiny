/**
 * The read side of mtgtop8.com: one function per page, each fetching the HTML
 * through the proxy and handing it to its parser.
 */

import { fetchDocument, postForm } from './http'
import { archetypePath, parseArchetype } from './parsers/archetype'
import { parseCardPrices } from './parsers/card'
import { commanderMetaPath, parseCommanderMeta } from './parsers/commander'
import { parseEvent } from './parsers/event'
import { parseFormat } from './parsers/format'
import { parseHome } from './parsers/home'
import { parseSearchOptions, parseSearchResults, searchForm } from './parsers/search'
import { parseTopCards, topCardsForm } from './parsers/topcards'
import type { CommanderQuery, SearchQuery, TopCardsQuery } from './types'

function query(path: string, params: Record<string, string | number | undefined>): string {
  const defined = Object.entries(params).filter(([, value]) => value !== undefined && value !== '')
  return `${path}?${new URLSearchParams(defined.map(([k, v]) => [k, String(v)])).toString()}`
}

export const mtgtop8 = {
  home: async () => parseHome(await fetchDocument('index')),

  format: async (code: string, period?: string, page?: number) =>
    parseFormat(await fetchDocument(query('format', { f: code, meta: period, cp: page }))),

  event: async (eventId: string, deckId?: string) =>
    parseEvent(await fetchDocument(query('event', { e: eventId, d: deckId }))),

  archetype: async (id: string, format: string, period?: string, page?: number) =>
    parseArchetype(await fetchDocument(archetypePath(id, format, period, page))),

  topCards: async (topCardsQuery: TopCardsQuery) =>
    parseTopCards(await postForm('topcards', topCardsForm(topCardsQuery, topCardsQuery.page))),

  /** A card's prices, for the panel a click on a decklist line opens. */
  cardPrices: async (cardId: string, name: string) =>
    parseCardPrices(await fetchDocument(query('card_biz', { cid: cardId, p: name }))),

  // The Commander formats' metagame tool. The site POSTs with the parameters
  // in the query string and an empty body; a GET answers nothing.
  commanderMeta: async (commanderQuery: CommanderQuery) =>
    parseCommanderMeta(await fetchDocument(commanderMetaPath(commanderQuery), { method: 'POST' })),

  searchOptions: async () => parseSearchOptions(await fetchDocument('search')),

  search: async (searchQuery: SearchQuery) =>
    parseSearchResults(await postForm('search', searchForm(searchQuery))),
}

/** The plain-text decklist mtgtop8 offers for download, through the proxy. */
export function deckExportPath(deckId: string): string {
  return `mtgo?d=${deckId}`
}

/** The `.dec` file the site offers for download, through the proxy. */
export function deckDecPath(deckId: string): string {
  return `dec?d=${deckId}`
}

/** A shop of the price bar: ck, tcg, mt or ch. The site redirects to it. */
export function deckShopUrl(deckId: string, shop: 'ck' | 'tcg' | 'mt' | 'ch'): string {
  return originalUrl(`shop?d=${deckId}&s=${shop}`)
}

/** The same page on mtgtop8 itself, for "view on mtgtop8" links. */
export function originalUrl(path: string): string {
  return `https://mtgtop8.com/${path}`
}
