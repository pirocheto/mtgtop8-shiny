import { useRef, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'

import { cardImageUrl } from '../lib/scryfall'

// The preview's size: w-60, at a card's 488:680 ratio.
const PREVIEW_W = 240
const PREVIEW_H = 335
const GAP = 16

/**
 * Below and to the right of the cursor, so the line being read and the ones
 * under it stay visible; above it when there is no room below, to its left
 * when there is none on the right.
 */
function previewPosition({ x, y }: { x: number; y: number }) {
  const roomRight = x + GAP + PREVIEW_W <= window.innerWidth
  const roomBelow = y + GAP + PREVIEW_H <= window.innerHeight
  return {
    left: roomRight ? x + GAP : Math.max(0, x - GAP - PREVIEW_W),
    top: roomBelow ? y + GAP : Math.max(0, y - GAP - PREVIEW_H),
  }
}

/**
 * The card's image beside the pointer while it is over an element: spread the
 * handlers on that element (a whole line, not just the name) and render the
 * preview anywhere. It sits in a portal, so no overflow can clip it.
 */
export function useCardPreview(name: string) {
  // Only showing or hiding the preview goes through React. Following the
  // pointer writes the position on the image itself: a render per pixel
  // moved would re-render the whole line for nothing.
  const [shown, setShown] = useState(false)
  const image = useRef<HTMLImageElement>(null)
  const last = useRef({ x: 0, y: 0 })

  // Written on the element, never through its style prop, so that a render
  // of the line (a click on it, say) does not move the preview back.
  const apply = (element: HTMLImageElement | null) => {
    if (!element) return
    const { left, top } = previewPosition(last.current)
    element.style.left = `${left}px`
    element.style.top = `${top}px`
  }

  const place = (x: number, y: number) => {
    last.current = { x, y }
    apply(image.current)
  }

  // A mouse only: a finger has no hover, and a tap would leave the preview
  // stuck over the list until the next one.
  const handlers = {
    onPointerEnter: (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      place(event.clientX, event.clientY)
      setShown(true)
    },
    onPointerMove: (event: PointerEvent) => event.pointerType === 'mouse' && place(event.clientX, event.clientY),
    onPointerLeave: () => setShown(false),
  }
  const preview =
    shown &&
    createPortal(
      <img
        ref={(element) => {
          image.current = element
          // Where the pointer came in; it follows from there without renders.
          apply(element)
        }}
        src={cardImageUrl(name)}
        alt={name}
        className="pointer-events-none fixed z-50 w-60 rounded-[4.75%] shadow-2xl shadow-black/60"
      />,
      document.body,
    )
  return { handlers, preview }
}
