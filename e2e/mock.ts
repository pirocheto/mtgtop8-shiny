import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { Page, Route } from '@playwright/test'

/**
 * Serves mtgtop8 and Scryfall from saved data, so the suite runs offline and
 * gives the same result every time.
 *
 * The SPA reaches mtgtop8 through `/mtgtop8/*` on its own origin, so that is
 * the prefix intercepted. The pages are the parser fixtures: real HTML, in the
 * ISO-8859-1 the site serves.
 */

const FIXTURES = join(import.meta.dirname, '..', 'src', 'lib', 'mtgtop8', '__fixtures__')

// The first segment of the upstream path picks the page, and a few query
// parameters the variant; search is the one path whose method matters, the
// empty form on GET and results on POST.
function fixtureFor(url: URL, method: string): string | undefined {
  const page = url.pathname.replace(/^\/mtgtop8\//, '')
  const params = url.searchParams
  if (page === 'search') return method === 'POST' ? 'search-results.html' : 'search-form.html'
  if (page === 'format' && params.get('f') === 'cEDH') return 'format-cedh.html'
  if (page === 'cEDH_decks') {
    if (params.get('show') === 'decks') return 'commander-decks.html'
    return params.get('cid') ? 'commander-pop-ub.html' : 'commander-pop.html'
  }
  return {
    index: 'home.html',
    format: 'format.html',
    event: 'event.html',
    archetype: 'archetype.html',
    topcards: 'topcards.html',
    // The card panel's prices: always Fatal Push's, whichever card is clicked.
    card_biz: 'card-biz.html',
  }[page]
}

// A path prefix, not a glob like '**/mtgtop8/**': in dev, Vite serves the
// sources under /src/lib/mtgtop8/, and those must not be intercepted.
const isProxied = (url: URL) => url.pathname.startsWith('/mtgtop8/')

export async function mockMtgtop8(page: Page): Promise<void> {
  await page.route(isProxied, (route: Route) => {
    const request = route.request()
    const name = fixtureFor(new URL(request.url()), request.method())
    if (!name) return route.fulfill({ status: 404, body: '' })
    return route.fulfill({
      contentType: 'text/html; charset=ISO-8859-1',
      body: readFileSync(join(FIXTURES, name)),
    })
  })
}

/** Scryfall knows nothing: the deck view falls back to names, ungrouped. */
export async function mockScryfall(page: Page, cards: object[] = []): Promise<void> {
  await page.route('https://api.scryfall.com/cards/collection', (route) =>
    route.fulfill({ json: { data: cards, not_found: [] } }),
  )
  // No set to come, so the home page's spoiler stays out of the way.
  await page.route('https://api.scryfall.com/sets', (route) => route.fulfill({ json: { data: [] } }))
  // Card images and mana symbols are decoration; nothing asserts on them.
  await page.route(/https:\/\/(api\.scryfall\.com\/cards\/named|svgs\.scryfall\.io)/, (route) =>
    route.abort(),
  )
}

export async function mockMtgtop8Down(page: Page): Promise<void> {
  await page.route(isProxied, (route) => route.fulfill({ status: 502, body: 'Bad Gateway' }))
}
