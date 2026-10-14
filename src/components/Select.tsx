import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'

import { cx } from '../lib/utils'

export interface SelectOption {
  value: string
  label: string
}

/**
 * A dropdown whose list the page draws itself, rather than the system's menu,
 * so it looks the same everywhere. It follows the listbox pattern: the button
 * opens the list, the arrows move through it, Enter picks, Escape or a click
 * outside closes it.
 */
export function Select({
  value,
  options,
  onChange,
  label,
  disabled = false,
  className,
}: {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  /** Read by assistive technology; the button shows the value. */
  label: string
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )
  const [active, setActive] = useState(selectedIndex)
  const root = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const id = useId()

  // Close on a click anywhere else.
  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      const target = event.target as Node
      // The list is drawn elsewhere in the page: a click in it is not outside.
      if (!root.current?.contains(target) && !list.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  // Keep the active option in view as the arrows move through a long list.
  // Within the list only: scrollIntoView would scroll the page as well,
  // which closes the list.
  useEffect(() => {
    const box = list.current
    const option = box?.children[active] as HTMLElement | undefined
    if (!open || !box || !option) return
    if (option.offsetTop < box.scrollTop) box.scrollTop = option.offsetTop
    else if (option.offsetTop + option.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTop = option.offsetTop + option.offsetHeight - box.clientHeight
    }
  }, [open, active])

  // Where the list goes: under the button, drawn over the page so that no
  // block it sits in can clip it, and opening leftwards near the right edge.
  const [place, setPlace] = useState<{ top: number; left?: number; right?: number; minWidth: number }>()
  const measure = () => {
    const box = button.current?.getBoundingClientRect()
    if (!box) return
    const roomRight = window.innerWidth - box.left
    setPlace({
      top: box.bottom + 4,
      minWidth: box.width,
      ...(roomRight < 320 ? { right: window.innerWidth - box.right } : { left: box.left }),
    })
  }
  const openList = () => {
    measure()
    setActive(selectedIndex)
    setOpen(true)
  }

  // The list follows the button as the page scrolls or resizes.
  useEffect(() => {
    if (!open) return
    const follow = (event: Event) => {
      if (event.type === 'scroll' && list.current?.contains(event.target as Node)) return
      measure()
    }
    window.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow)
    return () => {
      window.removeEventListener('scroll', follow, true)
      window.removeEventListener('resize', follow)
    }
  }, [open])

  const pick = (index: number) => {
    const option = options[index]
    setOpen(false)
    button.current?.focus()
    if (option && option.value !== value) onChange(option.value)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault()
        openList()
      }
      return
    }
    const moves: Record<string, () => number> = {
      ArrowDown: () => Math.min(options.length - 1, active + 1),
      ArrowUp: () => Math.max(0, active - 1),
      Home: () => 0,
      End: () => options.length - 1,
    }
    if (moves[event.key]) {
      event.preventDefault()
      setActive(moves[event.key]())
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      pick(active)
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      setOpen(false)
    }
  }

  const current = options[selectedIndex]

  return (
    <div ref={root} className={cx('relative inline-flex max-w-full', className)}>
      <button
        ref={button}
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={cx(
          'flex w-full max-w-full cursor-pointer items-center gap-2 rounded-lg border bg-surface py-1.5 pr-2.5 pl-3 text-left text-sm font-medium transition-colors',
          'focus:ring-2 focus:ring-link/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          open ? 'border-link' : 'border-line hover:border-link/40',
        )}
      >
        <span className="min-w-0 flex-1 truncate">{current?.label ?? ''}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className={cx('size-4 shrink-0 text-muted transition-transform', open && 'rotate-180')}
        >
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open &&
        place &&
        createPortal(
          <ul
            ref={list}
            id={`${id}-list`}
            role="listbox"
            aria-label={label}
            style={place}
            className="fixed z-50 max-h-72 max-w-[calc(100vw-2rem)] overflow-auto rounded-lg border border-line bg-surface py-1"
          >
            {options.map((option, index) => {
              const selected = option.value === value
              return (
                <li
                  key={option.value}
                  id={`${id}-${index}`}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActive(index)}
                  // mousedown, so the button keeps the focus.
                  onMouseDown={(event) => {
                    event.preventDefault()
                    pick(index)
                  }}
                  className={cx(
                    'flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm whitespace-nowrap',
                    index === active && 'bg-surface-2',
                    selected && 'font-semibold text-link',
                  )}
                >
                  <span className="w-4 shrink-0 text-center">{selected ? '✓' : ''}</span>
                  {option.label}
                </li>
              )
            })}
          </ul>,
          document.body,
        )}
    </div>
  )
}
