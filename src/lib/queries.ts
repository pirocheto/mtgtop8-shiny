import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { mtgtop8 } from './mtgtop8/api'
import type { CardEntry, CommanderQuery, SearchQuery, TopCardsQuery } from './mtgtop8/types'
import { fetchCards } from './scryfall'
import { fetchSpoiledCards, fetchUpcomingSets } from './spoilers'

// keepPreviousData keeps the current page on screen while the next period or
// page loads. The cache lifetime is set once, in main.tsx.

export const useHome = () => useQuery({ queryKey: ['home'], queryFn: mtgtop8.home })

export const useFormat = (code: string, period?: string, page?: number) =>
  useQuery({
    queryKey: ['format', code, period, page],
    queryFn: () => mtgtop8.format(code, period, page),
    placeholderData: keepPreviousData,
  })

export const useEvent = (eventId: string, deckId?: string) =>
  useQuery({
    queryKey: ['event', eventId, deckId],
    queryFn: () => mtgtop8.event(eventId, deckId),
    placeholderData: keepPreviousData,
  })

export const useArchetype = (id: string, format: string, period?: string, page?: number) =>
  useQuery({
    queryKey: ['archetype', id, format, period, page],
    queryFn: () => mtgtop8.archetype(id, format, period, page),
    placeholderData: keepPreviousData,
  })

export const useTopCards = (query: TopCardsQuery) =>
  useQuery({
    queryKey: ['topcards', query],
    queryFn: () => mtgtop8.topCards(query),
    // Without a period the site answers an empty list, so wait for one.
    enabled: Boolean(query.period),
    placeholderData: keepPreviousData,
  })

export const useCardPrices = (card: CardEntry | undefined) =>
  useQuery({
    queryKey: ['card-prices', card?.cardId, card?.name],
    queryFn: () => mtgtop8.cardPrices(card!.cardId!, card!.name),
    enabled: Boolean(card?.cardId),
    // Prices barely move within a session.
    staleTime: 60 * 60 * 1000,
  })

export const useCommanderMeta = (query: CommanderQuery | undefined) =>
  useQuery({
    queryKey: ['commander-meta', query],
    queryFn: () => mtgtop8.commanderMeta(query!),
    // It needs the period the format page resolved to.
    enabled: Boolean(query?.period),
    placeholderData: keepPreviousData,
  })

export const useSearchOptions = () =>
  useQuery({
    queryKey: ['search-options'],
    queryFn: mtgtop8.searchOptions,
    // The formats and archetypes lists barely move.
    staleTime: 60 * 60 * 1000,
  })

export const useSearch = (query: SearchQuery) =>
  useQuery({
    queryKey: ['search', query],
    queryFn: () => mtgtop8.search(query),
    placeholderData: keepPreviousData,
  })

/** Scryfall data for every card of a list, keyed by `cardKey(name)`. */
export const useCardInfo = (cards: CardEntry[]) => {
  const names = [...new Set(cards.map((card) => card.name))].sort()
  return useQuery({
    queryKey: ['scryfall', names],
    queryFn: () => fetchCards(names),
    enabled: names.length > 0,
    // Refused, Scryfall asks to wait a minute: two tries, well apart, rather
    // than none (the deck would stay bare until a reload) or quick ones
    // (which only count against the limit).
    retry: 2,
    retryDelay: (attempt) => (attempt + 1) * 30_000,
    // Card data does not change; keep it for the session.
    staleTime: Infinity,
  })
}

/** The sets not out yet, from Scryfall; they change at most once a day. */
// Scryfall limits how often it may be asked, and a retry right after a
// refusal only counts against that limit: the spoiler's queries never retry
// on their own, and are kept a long while.
export const useUpcomingSets = () =>
  useQuery({
    queryKey: ['upcoming-sets'],
    queryFn: () => fetchUpcomingSets(),
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 6 * 60 * 60 * 1000,
    retry: false,
  })

export const useSpoiledCards = (code: string | undefined) =>
  useQuery({
    queryKey: ['spoiled-cards', code],
    queryFn: () => fetchSpoiledCards(code!),
    enabled: Boolean(code),
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: false,
  })
