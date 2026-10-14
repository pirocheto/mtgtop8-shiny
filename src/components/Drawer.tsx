import { useId, type ReactNode } from 'react'

/** The look of the buttons that open a drawer: a quiet chip with an icon ahead. */
export const drawerButton =
  'inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-surface-2'

/** The icon of those buttons: a list, the side panel it opens. */
export function DrawerIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2.5 4h11M2.5 8h11M2.5 12h7" />
    </svg>
  )
}

/**
 * A side column brought over the page on a narrow screen: it slides in from
 * the left, under a title bar like the blocks', and scrolls on its own. A
 * native modal <dialog>, which keeps the focus inside while open and gives
 * it back to the button on closing; Escape, the ✕ or a tap beside it closes
 * it. On opening, what is current in it (the deck on display, say) is
 * brought into view.
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
}) {
  const titleId = useId()
  return (
    <dialog
      aria-labelledby={titleId}
      ref={(dialog) => {
        if (!dialog) return
        if (open && !dialog.open) {
          dialog.showModal()
          dialog.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'center' })
        } else if (!open && dialog.open) dialog.close()
      }}
      onClose={onClose}
      // A tap on the backdrop lands on the dialog itself, not its content.
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className={[
        'm-0 h-dvh max-h-none w-[min(24rem,88vw)] max-w-none overflow-hidden border-r border-line bg-surface p-0 text-fg shadow-2xl shadow-black/30',
        // Slid in from the left edge, and out again; the backdrop fades. Open,
        // no translation at all, so that what is fixed inside it (an open
        // select's list) is placed against the window, not the drawer.
        '-translate-x-full transition-[translate,display,overlay] transition-discrete duration-200 ease-out open:translate-none starting:open:-translate-x-full',
        'backdrop:bg-black/0 backdrop:transition-[background-color,display,overlay] backdrop:transition-discrete backdrop:duration-200 open:backdrop:bg-black/40 starting:open:backdrop:bg-black/0',
      ].join(' ')}
    >
      <div className="flex h-full flex-col">
        <header className="flex min-h-11 shrink-0 items-center justify-between gap-3 bg-bar py-1.5 pr-1.5 pl-4 text-bar-fg">
          <h2 id={titleId} className="text-sm font-bold tracking-wide uppercase">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg px-3 py-1.5 text-bar-fg/80 hover:bg-white/10 hover:text-bar-fg"
          >
            ✕
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </dialog>
  )
}
