import { MTGTOP8_PROXY } from './mtgtop8/http'

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

/** An image hosted by mtgtop8, through the same proxy as the pages. */
export function siteImage(path: string): string {
  return `${MTGTOP8_PROXY}/${path.replace(/^\//, '')}`
}

// DD/MM/YY, as the site prints its dates.
const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
})

export function formatDate(iso: string | undefined): string {
  if (!iso) return ''
  const date = new Date(`${iso}T00:00:00`)
  return Number.isNaN(date.getTime()) ? iso : DATE_FORMAT.format(date)
}

/**
 * For memo(): props equal by content. Every answer from the site is a new
 * object, even when it says the same as the last one (another page of the
 * same list, another deck of the same event): this keeps such a block from
 * re-rendering. For props of plain data only, no functions.
 */
export function sameContent<P extends object>(a: P, b: P): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}
