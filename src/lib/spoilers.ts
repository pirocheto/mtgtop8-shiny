/**
 * Spoilers of the sets to come, from Scryfall (https://scryfall.com/docs/api):
 * its set list says which sets are not out yet, and a search ordered by
 * `spoiled` gives a set's cards from the latest revealed.
 */

const SCRYFALL = 'https://api.scryfall.com'

export interface UpcomingSet {
  code: string
  name: string
  /** YYYY-MM-DD */
  releasedAt: string
  /** Scryfall's set symbol, an SVG. */
  iconUrl: string
  /** The set's page on Scryfall, its whole spoiler. */
  url: string
  cardCount: number
  /** An expansion, core set or masters set, rather than a side product. */
  main: boolean
}

export interface SpoiledCard {
  name: string
  imageUrl: string
  url: string
}

interface ScryfallSet {
  code: string
  name: string
  released_at?: string
  set_type: string
  card_count: number
  icon_svg_uri: string
  scryfall_uri: string
  digital: boolean
}

interface ScryfallCard {
  name: string
  scryfall_uri: string
  image_uris?: { normal: string }
  card_faces?: { image_uris?: { normal: string } }[]
}

// The kinds of set that get a spoiler season; tokens, promos and the like do not.
const SPOILED_TYPES = new Set(['expansion', 'core', 'masters', 'draft_innovation', 'commander', 'funny'])
const MAIN_TYPES = new Set(['expansion', 'core', 'masters'])

async function scryfall<T>(path: string): Promise<T> {
  const response = await fetch(`${SCRYFALL}${path}`, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Scryfall answered ${response.status}`)
  return (await response.json()) as T
}

/** The paper sets not out yet that already have cards revealed, soonest first. */
export async function fetchUpcomingSets(today = new Date().toISOString().slice(0, 10)): Promise<UpcomingSet[]> {
  const { data } = await scryfall<{ data: ScryfallSet[] }>('/sets')
  return data
    .filter(
      (set) =>
        !set.digital && set.card_count > 0 && SPOILED_TYPES.has(set.set_type) && (set.released_at ?? '') > today,
    )
    .sort((a, b) => (a.released_at ?? '').localeCompare(b.released_at ?? ''))
    .map((set) => ({
      code: set.code,
      name: set.name,
      releasedAt: set.released_at ?? '',
      iconUrl: set.icon_svg_uri,
      url: set.scryfall_uri,
      cardCount: set.card_count,
      main: MAIN_TYPES.has(set.set_type),
    }))
}

/** A set's cards, the latest revealed first, basic lands left out. */
export async function fetchSpoiledCards(code: string, limit = 8): Promise<SpoiledCard[]> {
  const query = new URLSearchParams({ q: `set:${code} -t:basic`, order: 'spoiled', dir: 'desc' })
  const { data } = await scryfall<{ data: ScryfallCard[] }>(`/cards/search?${query.toString()}`)
  return data.slice(0, limit).flatMap((card) => {
    const imageUrl = card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal
    return imageUrl ? [{ name: card.name, imageUrl, url: card.scryfall_uri }] : []
  })
}
