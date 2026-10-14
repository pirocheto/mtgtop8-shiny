import { useState, useSyncExternalStore } from 'react'

/**
 * A value picked in a list (the card shown in a panel, say), held outside
 * React state. Each component reads only what it needs of it ("is this row
 * the picked one?"), so picking another one re-renders the two rows whose
 * answer changed and whatever shows the value, and not the list's parent.
 */
export interface Selection<T> {
  get(): T
  set(value: T): void
  subscribe(listener: () => void): () => void
}

export function createSelection<T>(initial: T): Selection<T> {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    get: () => value,
    set(next) {
      if (Object.is(next, value)) return
      value = next
      for (const listener of listeners) listener()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/** A selection that lives as long as the component that creates it. */
export function useSelectionStore<T>(initial: T): Selection<T> {
  const [selection] = useState(() => createSelection(initial))
  return selection
}

/**
 * What a component needs of the selection, re-rendering it only when that
 * changes. `pick` must return a primitive or the stored value itself.
 */
export function useSelected<T, R>(selection: Selection<T>, pick: (value: T) => R): R {
  return useSyncExternalStore(selection.subscribe, () => pick(selection.get()))
}
