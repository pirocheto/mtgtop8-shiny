import { readFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { join } from 'node:path'

import type { Connect, Plugin } from 'vite'

/**
 * Answers `/mtgtop8/*` from saved pages instead of proxying to mtgtop8.com.
 *
 * The pages are the parser fixtures: real HTML saved from the site, in the
 * ISO-8859-1 it serves, so the app runs on genuine markup without a network.
 * There is one saved page per kind, sometimes a few: every format shows the
 * Modern metagame, every archetype UR Aggro, and so on. The ids the fixtures
 * link to pick the matching page where there is one, so clicking through the
 * app mostly lands somewhere consistent.
 *
 * Only the pages are mocked: images (archetype thumbnails, card pictures) still
 * come from the site through the proxy.
 *
 * Off by default: `MTGTOP8_MOCK=true` turns it on, to work offline or on fixed data.
 */

const FIXTURES = join(import.meta.dirname, 'src', 'lib', 'mtgtop8', '__fixtures__')

// Events with a page of their own, by id. Anything else is the Modern RC.
// The Pioneer one is the deck with an MTG Arena export.
const EVENTS: Record<string, string> = {
  '92067': 'event-cedh.html',
  '92133': 'event-duel-commander.html',
  '92130': 'event-mtgo-challenge.html',
  '92146': 'event-mtgo-league.html',
  '92228': 'event-pioneer.html',
}

function fixtureFor(page: string, params: URLSearchParams, method: string): string | undefined {
  switch (page) {
    case 'index':
      return 'home.html'
    case 'format':
      if (params.get('f') === 'LI') return 'format-limited.html'
      if (params.get('f') === 'cEDH' || params.get('f') === 'EDH') return 'format-cedh.html'
      return Number(params.get('cp')) > 1 ? 'format-page2.html' : 'format.html'
    case 'event': {
      const event = EVENTS[params.get('e') ?? '']
      if (event) return event
      return params.get('d') === '900394' ? 'event-deck-2nd.html' : 'event-deck.html'
    }
    case 'archetype': {
      if (params.get('f') === 'cEDH' || params.get('f') === 'EDH') return 'archetype-cedh.html'
      if (params.get('a') === '192') return 'archetype-single-page.html'
      const current = Number(params.get('current_page'))
      if (current >= 50) return 'archetype-all-page50.html'
      return current > 1 ? 'archetype-page2.html' : 'archetype.html'
    }
    case 'topcards':
      return 'topcards.html'
    case 'search':
      if (method !== 'POST') return 'search-form.html'
      return Number(params.get('current_page')) > 1 ? 'search-results-page2.html' : 'search-results.html'
    // The Commander metagame tool: one saved answer per view, and the UB list
    // for any colour filter.
    case 'cEDH_decks':
      if (params.get('show') === 'decks') return 'commander-decks.html'
      return params.get('cid') ? 'commander-pop-ub.html' : 'commander-pop.html'
    case 'mtgo':
      return params.get('d') === '899241' ? 'deck-export-cedh.txt' : 'deck-export.txt'
  }
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  // Latin-1, as the app encodes its form posts; only ASCII fields are read.
  return Buffer.concat(chunks).toString('latin1')
}

/**
 * `delay` is how long each page takes to come, in ms: mtgtop8 itself takes
 * half a second to two, and an instant mock would hide every loading state.
 */
export function mtgtop8Mock(prefix: string, delay = 800): Plugin {
  const handle: Connect.NextHandleFunction = (req, res: ServerResponse, next) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (!url.pathname.startsWith(`${prefix}/`)) return next()
    const page = url.pathname.slice(prefix.length + 1)

    void (async () => {
      const params = new URLSearchParams(url.search)
      if (req.method === 'POST') {
        for (const [key, value] of new URLSearchParams(await readBody(req))) params.set(key, value)
      }
      const name = fixtureFor(page, params, req.method ?? 'GET')
      // Images and anything else without a saved page go on to the proxy.
      if (!name) return next()
      // As slow as the site, so the loaders show in dev as they will live.
      await new Promise((resolve) => setTimeout(resolve, delay))
      const type = name.endsWith('.txt') ? 'text/plain' : 'text/html'
      res.setHeader('Content-Type', `${type}; charset=ISO-8859-1`)
      res.end(readFileSync(join(FIXTURES, name)))
    })().catch(next)
  }

  return {
    name: 'mtgtop8-mock',
    // Before Vite's own middlewares, so the proxy never sees these requests.
    configureServer: (server) => {
      server.middlewares.use(handle)
    },
    configurePreviewServer: (server) => {
      server.middlewares.use(handle)
    },
  }
}
