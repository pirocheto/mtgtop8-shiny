import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'

import { ARENA_FORMATS, MAIN_FORMATS, OTHER_FORMATS, SECOND_ROW_FORMATS } from '../lib/formats'
import type { Format } from '../lib/mtgtop8/types'
import { useIsCurrentFormat } from '../lib/currentFormat'
import { cx } from '../lib/utils'
import { FetchingBar } from './FetchingBar'

// The formats, kept quiet: grey text that darkens on hover, the current one
// alone in the selection yellow.
const navLink = ({ isActive }: { isActive: boolean }) =>
  cx(
    'rounded-lg px-3 py-1 text-sm font-semibold whitespace-nowrap transition-colors',
    isActive ? 'bg-highlight text-highlight-fg' : 'text-muted hover:text-fg',
  )

// An entry of those lists: a full-width row, in the hover grey of every other list.
const menuItem = ({ isActive }: { isActive: boolean }) =>
  cx(
    'rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors',
    isActive ? 'bg-highlight text-highlight-fg' : 'hover:bg-surface-2',
  )

/**
 * A menu entry that opens a list of formats, as "MTG Arena" and "Other" do on
 * the site: on hover, or on keyboard focus.
 */
function FormatMenu({ label, formats }: { label: string; formats: Format[] }) {
  const menu = useRef<HTMLDivElement>(null)
  const location = useLocation()
  // Once a format is picked, the link keeps the focus, which would keep the
  // menu open: let go of it.
  useEffect(() => {
    const focused = document.activeElement
    if (focused instanceof HTMLElement && menu.current?.contains(focused)) focused.blur()
  }, [location])
  const active = useIsCurrentFormat(formats.map((format) => format.code))

  return (
    <div ref={menu} className="group relative flex justify-center">
      <button type="button" aria-haspopup="true" className={cx(navLink({ isActive: active }), 'cursor-default')}>
        {label} ▾
      </button>
      {/* The top padding bridges the gap to the button, so the pointer can
          travel down to the list without it closing. */}
      <div className="invisible absolute top-full left-0 z-40 pt-2 opacity-0 transition-opacity duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        <div className="flex w-56 flex-col gap-0.5 rounded-xl border border-line bg-surface p-1.5">
          {formats.map((format) => (
            <FormatLink key={format.code} format={format} className={menuItem} />
          ))}
        </div>
      </div>
    </div>
  )
}


/**
 * A format of the navbar, highlighted while the page is about it: its own
 * pages, and its events, decks and archetypes too.
 */
function FormatLink({ format, className }: { format: Format; className: typeof navLink }) {
  const active = useIsCurrentFormat([format.code])
  const link = useRef<HTMLAnchorElement>(null)
  // In the phone's scrolling row, the current format is brought into view,
  // wherever it sits; within the row only, as scrollIntoView would scroll
  // the page as well. Elsewhere the parent does not scroll: nothing to do.
  useEffect(() => {
    const element = link.current
    const row = element?.parentElement
    if (!active || !element || !row || row.scrollWidth <= row.clientWidth) return
    row.scrollLeft = element.offsetLeft - row.offsetLeft - (row.clientWidth - element.offsetWidth) / 2
  }, [active])
  return (
    <Link
      ref={link}
      to={`/format/${format.code}`}
      aria-current={active ? 'page' : undefined}
      className={className({ isActive: active })}
    >
      {format.name}
    </Link>
  )
}

const formatLink = (format: Format) => <FormatLink key={format.code} format={format} className={navLink} />

/**
 * Back to the top on each new page. A component of its own, rendering
 * nothing, so that following the location does not re-render the layout.
 */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

/** The magnifier ahead of "Search", and alone on the phone's row. */
const searchIcon = (
  <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4">
    <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

/**
 * The formats on a phone: every one of them, menus flattened, on a single
 * row that scrolls sideways, so the page starts right under it.
 */
function PhoneFormats() {
  return (
    <div
      className="-ml-4 flex min-w-0 flex-1 gap-1 overflow-x-auto pl-4 [mask-image:linear-gradient(to_right,transparent,black_1rem,black_calc(100%-1.5rem),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {[...MAIN_FORMATS, ...SECOND_ROW_FORMATS, ...ARENA_FORMATS, ...OTHER_FORMATS].map(formatLink)}
    </div>
  )
}

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollToTop />
      <FetchingBar />
      <header className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-8 gap-y-2 px-4 pt-3 sm:px-6 sm:pt-5">
        {/* Centred on its own row: the icon, then the name and the tagline
            stacked beside it, both starting at the same edge. Smaller on a
            phone, where the screen is for the decks. */}
        <Link to="/" className="mx-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-8 sm:size-12" />
          <span className="flex flex-col leading-tight">
            <span className="font-display text-xl font-bold tracking-tight sm:text-3xl">
              MTGTop8 <span className="text-accent">Shiny</span>
            </span>
            <span className="hidden text-sm text-muted sm:block">netdecking with the stars</span>
          </span>
        </Link>
        {/* The formats and the search on a row of their own, under the logo:
            one scrolling line on a phone, wrapped with menus from sm up. */}
        <nav
          className="order-last flex w-full items-center gap-x-1 gap-y-1 sm:mt-3 sm:flex-wrap"
          aria-label="Formats"
        >
          <div className="contents max-sm:hidden">
            {MAIN_FORMATS.map(formatLink)}
            {SECOND_ROW_FORMATS.map(formatLink)}
            <FormatMenu label="MTG Arena" formats={ARENA_FORMATS} />
            <FormatMenu label="Other" formats={OTHER_FORMATS} />
          </div>
          <div className="contents sm:hidden">
            <PhoneFormats />
          </div>
          {/* The way to the search page closes the row, at its right end;
              on a phone, the icon alone, kept in view beside the scroller. */}
          <NavLink
            to="/search"
            aria-label="Search"
            // Drawn as the formats are, an icon ahead.
            className={({ isActive }) => cx(navLink({ isActive }), 'ml-auto flex shrink-0 items-center gap-1.5')}
          >
            {searchIcon}
            <span className="max-sm:hidden">Search</span>
          </NavLink>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-3 sm:px-6 sm:py-4">
        <Outlet />
      </main>

      <footer>
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-4 py-6 text-xs text-muted sm:px-6">
          <span>
            Data from{' '}
            <a href="https://mtgtop8.com" className="underline hover:text-fg" target="_blank" rel="noreferrer">
              mtgtop8.com
            </a>
            , card data and images from{' '}
            <a href="https://scryfall.com" className="underline hover:text-fg" target="_blank" rel="noreferrer">
              Scryfall
            </a>
            .
          </span>
          <span>
            Not affiliated with Wizards of the Coast. Magic: The Gathering is a trademark of Wizards of the
            Coast LLC.
          </span>
          {/* On a phone the corner button would sit over the lists: the link
              lives down here instead. */}
          <a
            href="https://github.com/pirocheto/mtgtop8-shiny"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-fg sm:hidden"
          >
            Source code on GitHub
          </a>
        </div>
      </footer>

      {/* The way to the source, pinned to the bottom right corner, under the
          card previews and the open selects. Not on a phone, where it would
          cover the end of the rows. */}
      <a
        href="https://github.com/pirocheto/mtgtop8-shiny"
        target="_blank"
        rel="noreferrer"
        aria-label="Source code on GitHub"
        title="Source code on GitHub"
        className="fixed right-4 bottom-4 z-40 rounded-full border border-line bg-surface p-2.5 text-muted shadow-lg transition-colors hover:text-fg max-sm:hidden"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-5" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
      </a>
    </div>
  )
}
