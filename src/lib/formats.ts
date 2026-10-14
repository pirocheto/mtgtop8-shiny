import type { Format } from './mtgtop8/types'

/**
 * The formats mtgtop8 tracks, in the two rows its own menu lists them. Kept
 * static so the navigation renders before any page is fetched; the codes are
 * the `f=` values.
 */
export const MAIN_FORMATS: Format[] = [
  { code: 'ST', name: 'Standard' },
  { code: 'PI', name: 'Pioneer' },
  { code: 'MO', name: 'Modern' },
  { code: 'LE', name: 'Legacy' },
  { code: 'VI', name: 'Vintage' },
]

export const SECOND_ROW_FORMATS: Format[] = [
  { code: 'PAU', name: 'Pauper' },
  { code: 'cEDH', name: 'cEDH' },
  { code: 'EDH', name: 'Duel Commander' },
  { code: 'PREM', name: 'Premodern' },
]

/** Behind the menu's "MTG Arena" entry. */
export const ARENA_FORMATS: Format[] = [
  { code: 'EXP', name: 'Explorer' },
  { code: 'HI', name: 'Historic' },
  { code: 'ALCH', name: 'Alchemy' },
]

/** Behind the menu's "Other" entry. */
export const OTHER_FORMATS: Format[] = [
  { code: 'PEA', name: 'Peasant' },
  { code: 'HIGH', name: 'Highlander' },
  { code: 'CHL', name: 'Canadian Highlander' },
  { code: 'BL', name: 'Block' },
  { code: 'EX', name: 'Extended' },
]

export const FORMATS = [...MAIN_FORMATS, ...SECOND_ROW_FORMATS, ...ARENA_FORMATS, ...OTHER_FORMATS]

export function formatName(code: string | undefined): string {
  return FORMATS.find((format) => format.code === code)?.name ?? code ?? ''
}
