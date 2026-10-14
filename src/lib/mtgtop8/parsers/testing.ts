import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const FIXTURES = join(import.meta.dirname, '..', '__fixtures__')

/** A saved mtgtop8 page, decoded as the site serves it (ISO-8859-1). */
export function fixtureText(name: string): string {
  return new TextDecoder('iso-8859-1').decode(readFileSync(join(FIXTURES, name)))
}

export function fixture(name: string): Document {
  return new DOMParser().parseFromString(fixtureText(name), 'text/html')
}
