/**
 * Card data and images from Scryfall (https://scryfall.com/docs/api).
 *
 * mtgtop8 knows card names only: no type, no mana cost, and images on a
 * separate "visual" page per deck. Scryfall answers all of that for up to 75
 * names per request, and allows cross-origin calls, so the browser asks it
 * directly. Its guidelines ask for no more than ~10 requests a second, which a
 * page of a few batched lookups stays well under.
 */

const SCRYFALL = 'https://api.scryfall.com'
const BATCH = 75

export type CardType =
  | 'Creature'
  | 'Planeswalker'
  | 'Battle'
  | 'Instant'
  | 'Sorcery'
  | 'Artifact'
  | 'Enchantment'
  | 'Land'
  | 'Other'

export interface CardInfo {
  name: string
  manaCost?: string
  cmc: number
  typeLine: string
  /** Rules text, a paragraph per line, symbols written "{T}"; the front face's for two-faced cards. */
  oracleText: string
  /** The type the card is grouped under in a decklist. */
  type: CardType
  colors: string[]
  image?: { small: string; normal: string; large: string }
  scryfallUrl: string
}

// The order matters: an "Artifact Creature" is listed with the creatures, an
// "Enchantment Land" with the lands... the order decklists conventionally use.
const TYPE_PRIORITY: CardType[] = [
  'Land',
  'Creature',
  'Planeswalker',
  'Battle',
  'Instant',
  'Sorcery',
  'Artifact',
  'Enchantment',
]

export const TYPE_ORDER: CardType[] = [
  'Creature',
  'Planeswalker',
  'Battle',
  'Instant',
  'Sorcery',
  'Artifact',
  'Enchantment',
  'Land',
  'Other',
]

function mainType(typeLine: string): CardType {
  // Only the front face counts: "Creature // Land" is played as a creature.
  const front = typeLine.split('//')[0]
  return TYPE_PRIORITY.find((type) => front.includes(type)) ?? 'Other'
}

interface ScryfallImageUris {
  small: string
  normal: string
  large: string
}

interface ScryfallCard {
  name: string
  mana_cost?: string
  cmc: number
  type_line: string
  oracle_text?: string
  colors?: string[]
  image_uris?: ScryfallImageUris
  card_faces?: {
    mana_cost?: string
    type_line?: string
    oracle_text?: string
    colors?: string[]
    image_uris?: ScryfallImageUris
  }[]
  scryfall_uri: string
}

/**
 * Lookup key for a name. Split and double-faced cards are matched on their
 * front face: Scryfall finds "Fire" but not "Fire // Ice", and mtgtop8 spells
 * them either way.
 */
export function cardKey(name: string): string {
  return name.split('//')[0].trim().toLowerCase()
}

function toCardInfo(card: ScryfallCard): CardInfo {
  const front = card.card_faces?.[0]
  const image = card.image_uris ?? front?.image_uris
  return {
    name: card.name,
    manaCost: card.mana_cost || front?.mana_cost || undefined,
    cmc: card.cmc,
    typeLine: card.type_line,
    oracleText: card.oracle_text ?? front?.oracle_text ?? '',
    type: mainType(card.type_line),
    colors: card.colors ?? front?.colors ?? [],
    image: image && { small: image.small, normal: image.normal, large: image.large },
    scryfallUrl: card.scryfall_uri,
  }
}

// Every card Scryfall has told us about, kept in the browser across visits:
// a card already known is never asked for again, whichever deck it is in.
// That is what keeps the app under Scryfall's rate limit. Cards barely
// change, so a month; a name Scryfall does not know is asked again after a
// day, in case it was a new card not in yet.
// The version changes with what a card holds, so older entries are fetched again.
const STORE_KEY = 'scryfall-cards-v2'
const FOUND_FOR = 30 * 24 * 60 * 60 * 1000
const NOT_FOUND_FOR = 24 * 60 * 60 * 1000
// Past this many cards, the oldest go first; a few thousand fit easily in
// localStorage's few megabytes.
const MAX_STORED = 5000

interface Stored {
  info: CardInfo | null
  at: number
}

function loadStore(): Map<string, Stored> {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return new Map(raw ? (JSON.parse(raw) as [string, Stored][]) : [])
  } catch {
    // Private browsing, storage turned off, a broken entry: start empty.
    return new Map()
  }
}

let store: Map<string, Stored> | undefined

function saveStore(cards: Map<string, Stored>) {
  const entries = [...cards.entries()].sort((a, b) => b[1].at - a[1].at).slice(0, MAX_STORED)
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(entries))
  } catch {
    // Full or unavailable: the cards stay known for this visit only.
  }
}

const fresh = (entry: Stored | undefined, now: number) =>
  entry !== undefined && now - entry.at < (entry.info ? FOUND_FOR : NOT_FOUND_FOR)

/**
 * Looks cards up by name. The map is keyed by `cardKey(name)`; a name Scryfall
 * does not know is simply absent, and the UI falls back to text. Only the
 * cards not already known are asked for.
 */
export async function fetchCards(names: string[]): Promise<Map<string, CardInfo>> {
  store ??= loadStore()
  const known = store
  const now = Date.now()
  const keys = [...new Set(names.map(cardKey))]
  const missing = keys.filter((key) => !fresh(known.get(key), now))

  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH)
    const response = await fetch(`${SCRYFALL}/cards/collection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ identifiers: batch.map((name) => ({ name })) }),
    })
    if (!response.ok) throw new Error(`Scryfall answered ${response.status}`)
    const { data } = (await response.json()) as { data: ScryfallCard[] }
    // What Scryfall did not answer is remembered as unknown, for a while.
    for (const key of batch) known.set(key, { info: null, at: now })
    for (const card of data) known.set(cardKey(card.name), { info: toCardInfo(card), at: now })
  }
  if (missing.length) saveStore(known)

  const cards = new Map<string, CardInfo>()
  for (const key of keys) {
    const info = known.get(key)?.info
    if (info) cards.set(key, info)
  }
  return cards
}

/** For tests: forget the cards known, in memory and in the browser. */
export function clearCardStore() {
  store = undefined
  try {
    localStorage.removeItem(STORE_KEY)
  } catch {
    // Nothing to clear.
  }
}

/**
 * Image of a card by name. For a card already looked up, its image on
 * Scryfall's image server, which has no rate limit; otherwise the API's
 * redirect to it, which counts against the limit as any API call does, and
 * which a page of forty cards would soon exceed if every image went that way.
 */
export function cardImageUrl(name: string, version: 'small' | 'normal' = 'normal'): string {
  store ??= loadStore()
  const known = store.get(cardKey(name))?.info?.image?.[version]
  if (known) return known
  const front = name.split('//')[0].trim()
  return `${SCRYFALL}/cards/named?format=image&version=${version}&exact=${encodeURIComponent(front)}`
}
