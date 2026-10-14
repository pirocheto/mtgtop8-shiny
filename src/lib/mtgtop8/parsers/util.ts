/**
 * Small helpers shared by the page parsers. mtgtop8's markup is table soup
 * with few classes and no ids worth trusting, so parsers lean on links (whose
 * query strings carry the ids) and on text, and these keep that consistent.
 */

/** Collapses whitespace, including the &nbsp; the site uses for spacing. */
export function clean(text: string | null | undefined): string {
  return (text ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
}

/** Reads one query parameter out of an href, relative or absolute. */
export function param(href: string | null | undefined, name: string): string | undefined {
  if (!href) return undefined
  const query = href.includes('?') ? href.slice(href.indexOf('?') + 1) : ''
  return new URLSearchParams(query).get(name) ?? undefined
}

/** The links of `root` whose href matches, e.g. links(doc, /event\?e=/). */
export function links(root: ParentNode, pattern: RegExp): HTMLAnchorElement[] {
  return [...root.querySelectorAll<HTMLAnchorElement>('a[href]')].filter((a) =>
    pattern.test(a.getAttribute('href') ?? ''),
  )
}

/** "11/10/26" (DD/MM/YY, the site's format) to "2026-10-11". */
export function parseDate(text: string | null | undefined): string | undefined {
  const match = clean(text).match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (!match) return undefined
  const [, day, month, year] = match
  const fullYear = year.length === 2 ? `20${year}` : year
  return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

/** "42 %" or "42%" to 42. */
export function parsePercent(text: string | null | undefined): number | undefined {
  const match = clean(text).match(/(\d+(?:[.,]\d+)?)\s*%/)
  return match ? Number(match[1].replace(',', '.')) : undefined
}

/** First integer in the text, ignoring thousands separators. */
export function parseInteger(text: string | null | undefined): number | undefined {
  const match = clean(text).match(/\d[\d,. ]*/)
  return match ? Number(match[0].replace(/[^\d]/g, '')) : undefined
}

/** Star rating: the site draws one `star.png` image per star. */
export function countStars(root: ParentNode): number {
  return root.querySelectorAll('img[src*="star.png"]').length
}
