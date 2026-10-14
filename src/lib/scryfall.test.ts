import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearCardStore, fetchCards } from './scryfall'

const card = (name: string) => ({
  name,
  cmc: 1,
  type_line: 'Instant',
  oracle_text: '',
  scryfall_uri: `https://scryfall.com/card/x/1/${name}`,
})

describe('fetchCards', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    // An in-memory localStorage: Node's own global one, which needs a file
    // to work, would shadow jsdom's.
    const items = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => void items.set(key, value),
      removeItem: (key: string) => void items.delete(key),
    })
    clearCardStore()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  const answer = (names: string[], notFound: string[] = []) =>
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: names.map(card), not_found: notFound.map((name) => ({ name })) })),
    )
  const asked = (call: number): string[] =>
    JSON.parse(fetchMock.mock.calls[call][1].body).identifiers.map((id: { name: string }) => id.name)

  it('asks Scryfall only for the cards it does not know yet', async () => {
    answer(['Fatal Push', 'Solitude'])
    const first = await fetchCards(['Fatal Push', 'Solitude'])
    expect([...first.keys()]).toEqual(['fatal push', 'solitude'])

    answer(['Thoughtseize'])
    const second = await fetchCards(['Solitude', 'Thoughtseize'])

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(asked(1)).toEqual(['thoughtseize'])
    expect([...second.keys()]).toEqual(['solitude', 'thoughtseize'])
  })

  it('does not ask again for a name Scryfall did not know', async () => {
    answer([], ['Not A Card'])
    expect((await fetchCards(['Not A Card'])).size).toBe(0)
    expect((await fetchCards(['Not A Card'])).size).toBe(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('keeps the cards across visits, in the browser', async () => {
    answer(['Fatal Push'])
    await fetchCards(['Fatal Push'])
    expect(localStorage.getItem('scryfall-cards-v2')).toContain('Fatal Push')
  })

  it('asks for nothing when every card is known', async () => {
    answer(['Fatal Push'])
    await fetchCards(['Fatal Push'])
    await fetchCards(['Fatal Push'])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
