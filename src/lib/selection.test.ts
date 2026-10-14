import { describe, expect, it, vi } from 'vitest'

import { createSelection } from './selection'

describe('createSelection', () => {
  it('tells its listeners when the value changes, and only then', () => {
    const selection = createSelection<string | undefined>(undefined)
    const listener = vi.fn()
    const unsubscribe = selection.subscribe(listener)

    selection.set('Fatal Push')
    expect(selection.get()).toBe('Fatal Push')
    expect(listener).toHaveBeenCalledTimes(1)

    // The same value again is no change.
    selection.set('Fatal Push')
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    selection.set('Solitude')
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
