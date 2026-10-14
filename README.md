<div align="center">

# ⚛️ MTGTop8 Shiny

**A modern, read-only frontend for [mtgtop8.com](https://mtgtop8.com): Magic: The Gathering tournament results, decklists and metagame.**

![React](https://img.shields.io/badge/React-19-blue.svg?style=for-the-badge&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-blue.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-blue.svg?style=for-the-badge&logo=vite&logoColor=white)
![nginx](https://img.shields.io/badge/nginx-1.29-blue.svg?style=for-the-badge&logo=nginx&logoColor=white)

</div>

---

## Features

- **[React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org)** on **[Vite](https://vite.dev)**
- **[Tailwind CSS v4](https://tailwindcss.com)** — via the Vite plugin, no config file
- **[oxlint](https://oxc.rs/docs/guide/usage/linter)** — Linting, plus `tsc -b` for type checking
- **Every read page of mtgtop8** — home, format metagame, events and decklists, archetypes, most played cards, deck search
- **Typed data layer** — `src/lib/mtgtop8/`, one HTML parser per page type, unit tested against saved pages
- **Card data from [Scryfall](https://scryfall.com)** — card images and types, for the hover previews and the visual view of a deck
- **[Playwright](https://playwright.dev) end-to-end tests** — against saved mtgtop8 pages, so the suite runs offline. Local only, see [Testing](#testing)
- **Production-ready Dockerfile** — Multi-stage (Vite build, then nginx), unprivileged image, no Node in the runtime
- **Path-prefix aware, on both sides** — Vite bakes it into the asset URLs at build time, nginx serves under it at run time

---

## Requirements

- [Node.js](https://nodejs.org) 22+ and npm (the image uses 24)

---

## Getting Started

### 1. Configure environment

```bash
cp .env.example .env.local
```

`.env.production` holds the committed defaults of a production build, and is
tracked. `.env.local` is yours and is gitignored.

### 2. Install dependencies

```bash
make install
```

### 3. Run it

```bash
make dev
```

The SPA is on <http://localhost:5173>, and `/mtgtop8/*` is proxied to
<https://mtgtop8.com>, as nginx does in production. See
[Where the data comes from](#where-the-data-comes-from).

To work offline, or on fixed data, set `MTGTOP8_MOCK=true` in `.env.local` or
on the command line: `/mtgtop8/*` is then answered from the real pages saved
in `src/lib/mtgtop8/__fixtures__/` (see `vite.mtgtop8-mock.ts`), every format
showing the same Modern metagame, every archetype the same decks.

To see what the container actually serves, prefix and all:

```bash
make image start
```

---

## The two prefixes

The reverse proxy routes `/<prefix>` and `/<prefix>/*` to this service **without
rewriting the path**, so everything is served under that prefix. Two different
sides have to know it, and they learn it at two different times:

| Side | Variable | When | Where |
|---|---|---|---|
| The bundle | `VITE_BASE_PATH` | **build** — Vite bakes it into every asset URL | `.env.production`, overridable per environment with the image's `BASE_PATH` build arg |
| nginx | `BASE_PATH` | **run** — envsubst renders the site config at container start | the container's environment |

**The two must be equal, and both must equal the routed prefix.**

The image defaults the run-time prefix to the one its bundle was built for, so
a plain `docker run` cannot drift on its own — the entrypoint prints the value
it defaulted to. What is not defended is setting them to *different* values:

- build prefix wrong → the browser asks for assets under a path nobody routes, and you get a blank page with 404s in the console,
- run prefix wrong → nginx answers the asset requests with `index.html`, which is a **200 with a `text/html` content type** and a blank page. Nothing appears in the logs, so check the content type of a `.js` request when a deployed SPA renders nothing.

`make image start` passes the same value to both, which is why it is the way to
reproduce a deployment locally.

A SPA has no server side, so `VITE_BASE_PATH` cannot be changed without
rebuilding the image. Build one image per environment, with the `BASE_PATH`
build arg set to that environment's prefix.

## Testing

End-to-end tests with [Playwright](https://playwright.dev), in `e2e/`. Once per
clone, because the browsers are not in `node_modules`:

```bash
make test-e2e-install
```

Then:

```bash
make test-e2e      # headless, what you run before pushing
make test-e2e-ui   # watch mode, for writing them
```

`make test-e2e` starts the dev server itself, and reuses one you already have
running.

The tests **intercept mtgtop8 and Scryfall** (`e2e/mock.ts`) and answer with
the saved pages the parsers are tested on, so the suite runs offline, gives the
same result every time, and can cover mtgtop8 being down.

The parsers have their own unit tests, `make test`, which need no browser.

> **The end-to-end tests run locally.** Their script is `test:e2e`, not `test`,
> so that a CI `npm test` step runs the unit tests and not these.

### Driving the app from an agent

[`.mcp.json`](.mcp.json) declares the [Playwright MCP
server](https://github.com/microsoft/playwright-mcp), so an agent working in
this repository can open the app, click through it, read the console and take
screenshots, rather than reasoning about the UI without seeing it. Claude Code
picks the file up from the repository root; VS Code reads the same server from
[`.vscode/mcp.json`](.vscode/mcp.json), and the two have to be edited together.

It is for **exploring and debugging** a running app. The committed suite in
`e2e/` is what proves the app works; the MCP server is how you find out why it
does not.

`--isolated` keeps the browser profile in memory, so a session leaves no
cookies or logins behind on disk.

> The server needs a browser `make test-e2e-install` does not leave behind.
> Install it once:
>
> ```bash
> make mcp-install
> ```
>
> Two reasons, and neither is a second browser. Playwright ships Chromium in
> two variants: the full `Google Chrome for Testing`, and a smaller
> `chrome-headless-shell` it prefers when running headless, which cannot run
> headed at all. The MCP server is **headed by default**, since an agent
> exploring an app wants to see it, so it wants the full one. And it pins its
> own Playwright version, which is usually ahead of the project's, so it wants
> that version's build rather than the one `npm ci` matches.
>
> A first navigation otherwise fails by naming an executable path that does not
> exist.

## Where the data comes from

mtgtop8 has **no API**. Everything it shows is server-rendered HTML, in
ISO-8859-1, without CORS headers. So:

- **Transport.** The browser calls `<prefix>/mtgtop8/<path>` on this origin,
  which Vite (in dev and `vite preview`) and nginx (in the image) forward to
  `https://mtgtop8.com/<path>`. `src/lib/mtgtop8/http.ts` decodes the Latin-1
  and encodes form posts in Latin-1 too, or accented names would match nothing.
- **Parsing.** `src/lib/mtgtop8/parsers/` turns each page type into the types
  of `src/lib/mtgtop8/types.ts`, with `DOMParser`. The markup is table soup, so
  the parsers lean on links, whose query strings carry the ids. Each parser is
  tested against real pages saved in `src/lib/mtgtop8/__fixtures__/`.
- **Cards.** mtgtop8 knows card names only. Images, mana costs and types come
  from the [Scryfall API](https://scryfall.com/docs/api), in batches of 75 names,
  directly from the browser (Scryfall allows CORS).

| Page | mtgtop8 request |
|---|---|
| Home | `GET /index` |
| Format | `GET /format?f=MO&meta=<period>&cp=<page>` |
| Event and deck | `GET /event?e=<event>&d=<deck>` |
| Archetype | `GET /archetype?a=<id>&f=MO&meta=<period>&current_page=<page>` |
| Most played cards | `POST /topcards` (a period is required, or the list is empty) |
| Search | `GET /search` for the form, `POST /search` for results |
| Deck download | `GET /mtgo?d=<deck>`, plain text |

### Caching

Neither site is asked twice for what the app already has:

| Where | What | For how long |
|---|---|---|
| nginx, shared by every visitor | mtgtop8 pages, POST forms included (keyed on the form) | 5 min, and the last copy while the site is down |
| nginx, and the browser | mtgtop8 images (thumbnails, deck pictures, scans) | 7 days |
| The browser (`localStorage`) | Every page read, as parsed data | shown at once for a day, refreshed after 5 min |
| The browser (`localStorage`) | Scryfall's cards, one by one | 30 days; a name Scryfall does not know, a day |

Scryfall rate-limits its API, and a refusal comes back without CORS headers,
so the browser only sees "Failed to fetch". Its cards are therefore cached
per card, a deck only asking for the ones not known yet, and its queries
never retry on their own. A new build drops the browser's page cache, so a
parser change never meets data shaped for the previous one. The nginx
cache's `X-Cache` header (`HIT`, `MISS`, `STALE`...) says what it did.

**When mtgtop8 changes its markup, a parser breaks.** Save the new page as a
fixture, watch its test fail, and fix the parser against it.

Some page counts are lower bounds: the site's pagers show a window of pages and
never the last one, so the UI keeps offering "Next" after a full page.

---

## Project Structure

```
.
├── src/
│   ├── components/         # Shared UI: layout, deck view, lists
│   ├── pages/              # One per route
│   ├── lib/mtgtop8/        # Transport, parsers, fixtures, types
│   ├── lib/scryfall.ts     # Card data and images
│   ├── App.tsx
│   └── main.tsx
├── e2e/                    # Playwright tests, on saved mtgtop8 pages
├── public/                 # Copied to the bundle root as-is
├── nginx/
│   └── default.conf.template   # Rendered at container start, see the Dockerfile
├── docker-entrypoint.d/
│   └── 10-default-base-path.envsh  # Defaults the run-time prefix to the build's
├── .env.production         # Build-time config: the two prefixes. TRACKED.
├── .mcp.json               # Playwright MCP server, for agents working here
├── Dockerfile              # Vite build, then nginx
└── Makefile
```

## Commands

| Command | What it does |
|---|---|
| `make install` | Install the dependencies |
| `make dev` | Vite dev server, `/mtgtop8` proxied |
| `make build` | Build the SPA into `dist/` |
| `make preview` | Build, then serve it with Vite's preview server |
| `make lint` | oxlint and `tsc -b` |
| `make test` | Run the parser unit tests |
| `make test-e2e-install` | Install the browser Playwright drives, once per clone |
| `make test-e2e` | Run the end-to-end tests |
| `make test-e2e-ui` | Run them in watch mode |
| `make mcp-install` | Install the browser the Playwright MCP server drives |
| `make image` | Build the Docker image |
| `make start` | Run that image as a deployment would |

---

## Deploying to Vercel

The site can also run on [Vercel](https://vercel.com), whose free Hobby plan
covers a personal project like this one. [`vercel.json`](vercel.json) does
what nginx does in the image:

- **The proxy.** `/mtgtop8/*` is rewritten to `https://mtgtop8.com/*`, query
  string and POST body included, so the browser keeps reading mtgtop8 through
  the site's own origin.
- **The SPA fallback.** Any other path that is not a file gets `index.html`.
- **The prefix.** The build runs with `VITE_BASE_PATH=/`, for the root of the
  domain: a `/` is stripped to nothing, where an empty value would fall back
  to the prefix in `.env.production`.
- **Caching.** Hashed assets for a year, mtgtop8's images for a week,
  `index.html` never. There is no shared cache of mtgtop8's pages as nginx
  keeps; each browser still keeps them five minutes.

Once, import the repository on vercel.com (sign in with GitHub). Every push to
`main` then deploys, and every pull request gets a preview URL.

---

## License

[MIT](LICENSE). Not affiliated with mtgtop8.com, Scryfall, or Wizards of the
Coast. Magic: The Gathering is a trademark of Wizards of the Coast LLC.
