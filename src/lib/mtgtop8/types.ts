/**
 * The read-only data model of mtgtop8.com, as the UI consumes it.
 *
 * mtgtop8 has no API: every value here is parsed out of its server-rendered
 * HTML (see ./parsers). Optional fields are the ones a page does not always
 * carry, so the UI must render without them.
 */

/** Format code as mtgtop8 spells it in `?f=`: ST, PI, MO, LE, VI, PAU, cEDH... */
export type FormatCode = string

export interface Format {
  code: FormatCode
  name: string
}

/** A metagame period, the `meta` query parameter: "Last 2 Weeks" is 54. */
export interface MetaPeriod {
  id: string
  label: string
}

export type EventSource = 'paper' | 'mtgo' | 'other'

export interface EventSummary {
  id: string
  formatCode: FormatCode
  name: string
  /** ISO date, YYYY-MM-DD. The site prints DD/MM/YY. */
  date: string
  /** Significance, 0 to 3 stars. */
  stars: number
  source?: EventSource
  isNew?: boolean
  location?: string
}

export interface DeckSummary {
  id: string
  eventId: string
  formatCode: FormatCode
  name: string
  player?: string
  /** As printed: "1", "3-4", "5-8"... */
  rank?: string
  archetype?: { id: string; name: string }
  event?: { name: string; date?: string; stars?: number; source?: EventSource }
  /** Site-relative thumbnail path, e.g. `/deckpics/<id>_th.jpg`. */
  thumbnailPath?: string
}

export type Trend = 'up' | 'strong-up' | 'down' | 'strong-down'

export interface ArchetypeShare {
  id: string
  name: string
  /** Percentage of the metagame, 0-100. */
  share: number
  trend?: Trend
  /** Site-relative image path, e.g. `/metas_thumbs/351.jpg`. */
  thumbnailPath?: string
}

export interface MetagameCategory {
  /** "Aggro", "Combo", "Control"... */
  name: string
  share: number
  archetypes: ArchetypeShare[]
}

export interface TopCard {
  name: string
  /** Percentage of decks playing it, 0-100. */
  share: number
  /** Average number of copies in decks that play it, when shown. */
  averageCopies?: number
  /** Site-relative image path, e.g. `/pics/zen/211.jpg`. */
  imagePath?: string
  /** The site's id of the printing, e.g. "zen211", on the top cards page. */
  cardId?: string
}

export interface Paged<T> {
  items: T[]
  page: number
  pageCount: number
}

export interface HomePage {
  /** The latest major events, grouped by format, in page order. */
  majorEvents: { format: Format; events: EventSummary[] }[]
  rogueDecks: DeckSummary[]
  stats?: { decks: number; events: number; days: number }
}

export interface FormatPage {
  format: Format
  periods: MetaPeriod[]
  /** The period the page was rendered for. */
  period: MetaPeriod
  deckCount: number
  metagame: MetagameCategory[]
  majorEvents: EventSummary[]
  recentEvents: Paged<EventSummary>
  topCards: TopCard[]
  /**
   * The Commander formats (cEDH, Duel Commander) have no breakdown in the
   * page: their metagame is a tool of its own, loaded apart, filtered by
   * colour identity or by commander. See `CommanderQuery`.
   */
  commanderMeta: boolean
}

/** Colour identity letters as the site spells them: W U B R G, and I for colourless. */
export type ColorId = 'W' | 'U' | 'B' | 'R' | 'G' | 'I'

/** The Commander metagame tool's request, `cEDH_decks?...`. */
export interface CommanderQuery {
  format: FormatCode
  period: string
  /** By popularity, alphabetically, or the latest decks one by one. */
  show: 'pop' | 'alpha' | 'decks'
  /** The colour identity to match exactly, e.g. "UB"; empty for all. */
  colors: string
  page?: number
}

/** A commander (or pair) and its share of the decks. */
export interface CommanderShare {
  archetypeId: string
  name: string
  colors: ColorId[]
  /** Per mille of the decks, as the site prints it. */
  permille: number
  thumbnailPath?: string
}

/** One deck of the "Last decks" view. */
export interface CommanderDeck {
  deckId: string
  eventId: string
  name: string
  colors: ColorId[]
  thumbnailPath?: string
}

export interface CommanderMeta {
  /** All decks of the period. */
  total: number
  /** The decks matching the filter, when one is set. */
  matching?: number
  shares: CommanderShare[]
  decks: CommanderDeck[]
  /** Only "Last decks" is paged; pageCount is a floor, as the pager is windowed. */
  page: number
  pageCount: number
}

export interface Standing {
  deckId: string
  rank: string
  deckName: string
  player: string
  /** Site-relative archetype image, e.g. `/metas_thumbs/285.jpg`. */
  thumbnailPath?: string
}

export interface CardEntry {
  quantity: number
  name: string
  /** The site's id of the printing shown, e.g. "aer057"; keys the card panel. */
  cardId?: string
}

/** A card's prices, from the site's card panel. */
export interface CardPrices {
  cardKingdom?: { usd: number; url: string }
  cardhoarder?: { tix: number; url: string }
}

/** The deck's price at each shop of the site's price bar. */
export interface DeckPrices {
  /** US dollars, near mint. */
  cardKingdom?: number
  /** US dollars, to rent it. */
  manatraders?: number
  /** MTGO tickets. */
  cardhoarder?: number
}

/** A group of the main deck as mtgtop8 prints it: "19 LANDS (24)", "27 CREATURES"... */
export interface DeckSection {
  /** The header as printed, count included. */
  title: string
  cards: CardEntry[]
}

export interface Deck {
  id: string
  eventId: string
  formatCode: FormatCode
  name: string
  player: string
  rank?: string
  archetype?: { id: string; name: string }
  main: CardEntry[]
  /** The main deck in the site's own groups, in page order. */
  sections: DeckSection[]
  sideboard: CardEntry[]
  /** Commander zone, for the formats that have one. */
  commanders?: CardEntry[]
  prices: DeckPrices
  /** The site offers an MTG Arena export, for the formats Arena plays. */
  arenaExport: boolean
}

export interface EventPage {
  id: string
  name: string
  format: Format
  date: string
  stars: number
  source?: EventSource
  playerCount?: number
  location?: string
  standings: Standing[]
  /** The deck the page was rendered for: `d=` if given, else the winner. */
  deck: Deck
}

export interface ArchetypePage {
  id: string
  name: string
  format: Format
  periods: MetaPeriod[]
  period: MetaPeriod
  /** The format's breakdown, which the page shows beside the decks; empty in the Commander formats. */
  metagame: MetagameCategory[]
  /** The Commander formats' metagame tool stands in for the breakdown, as on the format page. */
  commanderMeta: boolean
  deckCount: number
  decks: Paged<DeckSummary>
}

export interface TopCardsQuery {
  format: FormatCode
  period?: string
  board?: 'main' | 'side'
  /** Include lands. Defaults to true, as on the site. */
  lands?: boolean
  /** The site's card filters: W U B R G, or X for colourless. */
  color?: 'W' | 'U' | 'B' | 'R' | 'G' | 'X'
  /** LA, CR, PL, AR, SO, IN or EN. */
  type?: 'LA' | 'CR' | 'PL' | 'AR' | 'SO' | 'IN' | 'EN'
  /** M, R, U or C. */
  rarity?: 'M' | 'R' | 'U' | 'C'
  page?: number
}

export interface TopCardsPage {
  format: Format
  periods: MetaPeriod[]
  period: MetaPeriod
  /** 20 cards a page; `pageCount` is a lower bound, as the pager is windowed. */
  cards: TopCard[]
  page: number
  pageCount: number
}

export interface SearchQuery {
  format?: FormatCode
  archetypeId?: string
  player?: string
  eventName?: string
  deckName?: string
  /** One card name per line, as the site's textarea expects. */
  cards?: string
  board?: 'main' | 'side' | 'both'
  /** YYYY-MM-DD */
  dateStart?: string
  dateEnd?: string
  page?: number
}

export interface SearchOptions {
  formats: Format[]
  /** Archetypes selectable per format code. */
  archetypes: Record<FormatCode, { id: string; name: string }[]>
}

export interface SearchResults {
  total?: number
  decks: Paged<DeckSummary>
}
