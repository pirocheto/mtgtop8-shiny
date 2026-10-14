import { expect, test } from '@playwright/test'

import { mockMtgtop8, mockMtgtop8Down, mockScryfall } from './mock'

// The main read flows, against saved mtgtop8 pages (see e2e/mock.ts). The
// parsers have their own unit tests; these check that the pages wire them up.

test.beforeEach(async ({ page }) => {
  await mockScryfall(page)
})

test('home lists the latest major events and rogue decks', async ({ page }) => {
  await mockMtgtop8(page)
  await page.goto('/')

  await expect(page.getByText('3,482')).toBeVisible()
  await expect(page.getByRole('link', { name: /Regional Championship - CAMS - T13/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /BUG Company/ })).toBeVisible()
})

test('a format shows its metagame, events and top cards', async ({ page }) => {
  await mockMtgtop8(page)
  await page.goto('/format/MO')

  await expect(page.getByRole('heading', { name: 'Modern' })).toBeVisible()
  await expect(page.getByRole('link', { name: /UR Aggro/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Combo' })).toBeVisible()
  await expect(page.getByText('Last 20 events')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Most played cards' })).toBeVisible()
})

test('a Commander format filters its metagame by colour identity', async ({ page }) => {
  await mockMtgtop8(page)
  await page.goto('/format/cEDH')

  await expect(page.getByText('713 decks')).toBeVisible()
  await expect(page.getByRole('link', { name: /^Partner WUBR / })).toBeVisible()

  await page.getByRole('button', { name: 'Blue' }).click()
  await page.getByRole('button', { name: 'Black' }).click()
  await expect(page.getByRole('button', { name: 'Black' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(/^11\s*decks \/ 713$/)).toBeVisible()
  await expect(page.getByRole('link', { name: /Yuriko, the Tiger's Shadow/ })).toBeVisible()
})

test('an event shows its standings and the winning deck', async ({ page }) => {
  await mockMtgtop8(page)
  await page.goto('/event/92202')

  await expect(page.getByRole('heading', { name: 'Regional Championship - CAMS - T13' })).toBeVisible()
  // Written twice, in the column and in a line for narrower screens: one shows.
  await expect(page.getByText('184 players - 10/10/26').filter({ visible: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Standings · 32' })).toBeAttached()
  await expect(page.getByText('19 LANDS (24)')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Esper Blink' })).toBeVisible()
  await expect(page.getByText('Flooded Strand')).toBeVisible()
  await expect(page.getByText('Sideboard', { exact: true })).toBeVisible()
})

test('clicking a card line opens its panel, with prices', async ({ page }) => {
  await mockMtgtop8(page)
  // The card's text comes from Scryfall, its prices from mtgtop8.
  await mockScryfall(page, [
    {
      name: 'Fatal Push',
      mana_cost: '{B}',
      cmc: 1,
      type_line: 'Instant',
      oracle_text:
        'Destroy target creature if it has mana value 2 or less.\nRevolt — Destroy that creature if it has mana value 4 or less instead if a permanent left the battlefield under your control this turn.',
      colors: ['B'],
      scryfall_uri: 'https://scryfall.com/card/aer/57/fatal-push',
    },
  ])
  await page.goto('/event/92202')

  await expect(page.getByRole('link', { name: /Card Kingdom\s*\$\s*1072/ })).toBeVisible()
  await page.getByRole('button', { name: /Fatal Push/ }).click()
  await expect(page.getByRole('button', { name: /Fatal Push/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(/^Revolt — Destroy that creature/)).toBeVisible()
  await expect(page.getByRole('link', { name: /Cardhoarder\s*1\.01 TIX/ })).toBeVisible()
})

test('clicking a standing opens that deck', async ({ page }) => {
  await mockMtgtop8(page)
  await page.goto('/event/92202')

  await page.getByRole('link', { name: /Instant Reanimator/ }).first().click()
  await expect(page).toHaveURL(/\/event\/92202\/deck\/\d+$/)
})

test('an archetype lists its decks', async ({ page }) => {
  await mockMtgtop8(page)
  await page.goto('/archetype/351?f=MO')

  await expect(page.getByRole('heading', { name: 'UR Aggro decks' })).toBeVisible()
  await expect(page.getByRole('row')).not.toHaveCount(0)
})

test('a search shows its results', async ({ page }) => {
  await mockMtgtop8(page)
  await page.goto('/search')

  await page.getByRole('textbox', { name: 'Cards' }).fill('Solitude')
  await page.getByRole('button', { name: 'Search' }).click()

  await expect(page).toHaveURL(/cards=Solitude/)
  await expect(page.getByRole('heading', { name: /^\d[\d,]* decks? matching$/ })).toBeVisible()
})

test('the navbar button opens the search page', async ({ page }) => {
  await mockMtgtop8(page)
  await page.goto('/format/MO')

  await page.getByRole('link', { name: 'Search', exact: true }).click()

  await expect(page).toHaveURL(/\/search$/)
  await expect(page.getByRole('link', { name: 'Search', exact: true })).toHaveAttribute('aria-current', 'page')
})

test('says so when mtgtop8 cannot be reached', async ({ page }) => {
  await mockMtgtop8Down(page)
  await page.goto('/format/MO')

  await expect(page.getByText("Couldn't load this from mtgtop8.")).toBeVisible()
})

// On a phone, what the page is for comes first, the side columns open in
// drawers, and a tapped card opens where it can be seen.
test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('an event shows its deck, and its standings in a drawer', async ({ page }) => {
    await mockMtgtop8(page)
    await page.goto('/event/92202')

    await expect(page.getByText('19 LANDS (24)')).toBeInViewport()
    await page.getByRole('button', { name: /Fatal Push/ }).tap()
    await expect(page.getByRole('dialog', { name: 'Fatal Push' })).toBeInViewport()
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: /Standings/ }).tap()
    const standings = page.getByRole('dialog', { name: 'Standings · 32' })
    await expect(standings).toBeInViewport()
    await standings.getByRole('link', { name: /Instant Reanimator/ }).first().tap()
    await expect(standings).toBeHidden()
    await expect(page).toHaveURL(/\/deck\//)
  })

  test('an archetype shows its decks, and the breakdown in a drawer', async ({ page }) => {
    await mockMtgtop8(page)
    await page.goto('/archetype/1?f=MO')

    await expect(page.getByRole('heading', { name: /decks$/i })).toBeInViewport()
    await page.getByRole('button', { name: 'Metagame', exact: true }).tap()
    const drawer = page.getByRole('dialog', { name: 'Metagame breakdown' })
    await expect(drawer.getByRole('heading', { name: /^aggro/i })).toBeInViewport()
  })

  test('a search is made from a drawer, which closes on the results', async ({ page }) => {
    await mockMtgtop8(page)
    await page.goto('/search')

    await page.getByRole('button', { name: /Search filters/ }).tap()
    const drawer = page.getByRole('dialog', { name: 'Search filters' })
    await drawer.getByRole('textbox', { name: 'Cards' }).fill('Solitude')
    await drawer.getByRole('button', { name: 'Search', exact: true }).tap()

    await expect(page).toHaveURL(/cards=Solitude/)
    await expect(drawer).toBeHidden()
    await expect(page.getByRole('heading', { name: /^\d[\d,]* decks? matching$/ })).toBeInViewport()
  })
})
