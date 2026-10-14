/**
 * Transport to mtgtop8.com.
 *
 * The site sends no CORS headers, so the browser cannot call it directly: every
 * request goes to `<base>/mtgtop8/...` on this origin, which Vite proxies in
 * dev and nginx in production (see vite.config.ts and nginx/default.conf.template).
 */

// BASE_URL carries the path prefix and its trailing slash: "/" in dev,
// "/mtgtop8-shiny/" in production.
export const MTGTOP8_PROXY = `${import.meta.env.BASE_URL}mtgtop8`

export const MTGTOP8_ORIGIN = 'https://mtgtop8.com'

export class Mtgtop8Error extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'Mtgtop8Error'
    this.status = status
  }
}

/**
 * Fetches a page and returns its text. The site serves ISO-8859-1, which
 * `response.text()` would decode as UTF-8 and mangle every accent.
 */
export async function fetchText(path: string, init?: RequestInit): Promise<string> {
  const response = await fetch(`${MTGTOP8_PROXY}/${path.replace(/^\//, '')}`, init)
  if (!response.ok) {
    throw new Mtgtop8Error(response.status, `mtgtop8 answered ${response.status} for ${path}`)
  }
  return new TextDecoder('iso-8859-1').decode(await response.arrayBuffer())
}

export async function fetchDocument(path: string, init?: RequestInit): Promise<Document> {
  return new DOMParser().parseFromString(await fetchText(path, init), 'text/html')
}

/**
 * Form-encodes in ISO-8859-1, as a browser does for a page in that charset.
 * URLSearchParams always encodes UTF-8, so "Lim-Dûl" would reach the site as
 * two garbage bytes and match nothing. Characters outside Latin-1 cannot be
 * sent at all; the site could not store them either.
 */
export function encodeLatin1Form(fields: Record<string, string>): string {
  const encode = (text: string) =>
    [...text]
      .map((char) => {
        if (/[A-Za-z0-9\-_.*]/.test(char)) return char
        if (char === ' ') return '+'
        const code = char.charCodeAt(0)
        return code < 256 ? `%${code.toString(16).toUpperCase().padStart(2, '0')}` : '%3F'
      })
      .join('')
  return Object.entries(fields)
    .map(([key, value]) => `${encode(key)}=${encode(value)}`)
    .join('&')
}

/** Posts a form the way the site's own `<form method=POST>` does. */
export function postForm(path: string, fields: Record<string, string>): Promise<Document> {
  return fetchDocument(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: encodeLatin1Form(fields),
  })
}
