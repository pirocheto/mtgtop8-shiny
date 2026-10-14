import type { MetaPeriod, TopCard, TopCardsPage, TopCardsQuery } from '../types'
import { parsePager } from './format'
import { clean, parsePercent } from './util'

/**
 * The card's mtgtop8 id ("zen211": set code then collector number) to its
 * image. Only the plain 3+3 shape is mapped: longer ids (double-faced cards
 * such as "sos1017") do not follow the rule and the site serves no image.
 */
function imagePath(cardId: string | undefined): string | undefined {
  const match = cardId?.match(/^([a-z0-9]{3})(\d{3})$/i)
  return match ? `/pics/${match[1].toLowerCase()}/${match[2]}.jpg` : undefined
}

/**
 * Card rows carry their id in `onclick="AffCard('zen211',...)"` and three
 * cells: name, share ("34.8 %") and average copies ("2.9").
 */
function parseCards(doc: Document): TopCard[] {
  return [...doc.querySelectorAll<HTMLTableRowElement>('tr[onclick*="AffCard"]')].flatMap((row) => {
    const [nameCell, shareCell, avgCell] = row.cells
    const name = clean(nameCell?.textContent)
    const share = parsePercent(shareCell?.textContent)
    if (!name || share === undefined) return []
    const average = Number(clean(avgCell?.textContent).replace(',', '.'))
    const cardId = row.getAttribute('onclick')?.match(/AffCard\('([^']+)'/)?.[1]
    return [
      {
        name,
        share,
        averageCopies: clean(avgCell?.textContent) && Number.isFinite(average) ? average : undefined,
        imagePath: imagePath(cardId),
        cardId,
      },
    ]
  })
}

export function parseTopCards(doc: Document): TopCardsPage {
  const form = doc.querySelector('form[name="topcards_form"]')
  const formatOption = doc.querySelector<HTMLOptionElement>('select[name="format"] option[selected]')
  if (!form || !formatOption?.value) {
    throw new Error('Not a top cards page: no topcards form with a selected format')
  }
  const code = formatOption.value

  // One hidden `metagame_sel[XX]` select per format; the current format's is shown.
  const select =
    doc.querySelector<HTMLSelectElement>(`select[name="metagame_sel[${code}]"]`) ??
    [...doc.querySelectorAll<HTMLSelectElement>('select[name^="metagame_sel"]')].find((s) =>
      /display:\s*block/.test(s.getAttribute('style') ?? ''),
    )
  const options = [...(select?.querySelectorAll('option') ?? [])]
  const periods: MetaPeriod[] = options.map((option) => ({
    id: option.getAttribute('value') ?? '',
    label: clean(option.textContent),
  }))
  // Without a period the site renders no cards and selects nothing.
  const selected = options.findIndex((option) => option.hasAttribute('selected'))

  return {
    format: { code, name: clean(formatOption.textContent) },
    periods,
    period: periods[selected] ?? periods[0] ?? { id: '', label: '' },
    cards: parseCards(doc),
    // Same pager markup as the format page's event list.
    ...parsePager(doc),
  }
}

/**
 * The POST body `topcards_form` sends (url-encode it, e.g. with
 * URLSearchParams). The period is required: without `metagame_sel[XX]` the
 * site answers with an empty list. An absent `lands` excludes the lands.
 * The page is 1-based; the site shows 20 cards per page.
 */
export function topCardsForm(query: TopCardsQuery, page?: number): Record<string, string> {
  const fields: Record<string, string> = {
    format: query.format,
    [`metagame_sel[${query.format}]`]: query.period ?? '',
    maindeck: query.board === 'side' ? 'SB' : 'MD',
    data: '1',
    current_page: page && page > 1 ? String(page) : '',
    card_col: query.color ?? '',
    card_type: query.type ?? '',
    card_rarity: query.rarity ?? '',
  }
  if (query.lands !== false) fields.lands = '1'
  return fields
}
