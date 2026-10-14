import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { cx } from '../lib/utils'
import { Select } from './Select'
import type { EventSource, MetaPeriod, Trend } from '../lib/mtgtop8/types'
import { useDelayed } from '../lib/useDelayed'
import { Spin } from './Spin'

/**
 * A block under a title bar. While `loading` (past a short delay), a spinner
 * turns in the bar and the content fades, so it reads as being updated
 * rather than as stale.
 */
export function Panel({
  title,
  action,
  children,
  className,
  loading = false,
}: {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  loading?: boolean
}) {
  // A quick load shows nothing: no blink of fading and spinner.
  const busy = useDelayed(loading)
  return (
    <section className={cx('overflow-hidden rounded-xl border border-line bg-surface', className)}>
      {title && (
        <TitleBar action={action} loading={busy}>
          {title}
        </TitleBar>
      )}
      <div aria-busy={busy} className={cx('transition-opacity duration-150', busy && 'opacity-50')}>
        {children}
      </div>
    </section>
  )
}

/** A block's heading as the site draws it: a centred bar, in capitals. */
export function TitleBar({
  children,
  action,
  className,
  loading = false,
}: {
  children: ReactNode
  action?: ReactNode
  className?: string
  loading?: boolean
}) {
  return (
    <header
      className={cx(
        'relative flex min-h-9 items-center justify-center bg-bar px-24 py-1.5 text-bar-fg',
        className,
      )}
    >
      <h2 className="text-center text-sm font-bold tracking-wide uppercase">{children}</h2>
      {loading && (
        <span role="status" aria-label="Loading" className="absolute left-3 flex">
          <Spin onDark />
        </span>
      )}
      {action && <div className="absolute right-3 text-xs">{action}</div>}
    </header>
  )
}

export function PageTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      {eyebrow && <div className="text-sm font-medium text-link">{eyebrow}</div>}
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      {children && <div className="text-muted">{children}</div>}
    </div>
  )
}

export function Stars({ count }: { count: number }) {
  if (!count) return null
  return (
    <span className="text-star" title={`${count} star${count > 1 ? 's' : ''}`}>
      {'★'.repeat(count)}
      <span className="text-line">{'★'.repeat(Math.max(0, 3 - count))}</span>
    </span>
  )
}

const SOURCE_LABEL: Record<EventSource, string> = {
  paper: 'Paper',
  mtgo: 'MTGO',
  other: 'Online',
}

// Solid, one colour per source: paper in the site's yellow, MTGO in its
// blue, and the other online platforms in violet, apart from both.
const SOURCE_CLASS: Record<EventSource, string> = {
  paper: 'bg-highlight text-highlight-fg',
  mtgo: 'bg-link text-white',
  other: 'bg-online text-white',
}

export function SourceBadge({ source }: { source?: EventSource }) {
  if (!source) return null
  return (
    <span
      className={cx(
        'rounded-md px-1.5 py-0.5 text-[11px] font-bold tracking-wide uppercase',
        SOURCE_CLASS[source],
      )}
    >
      {SOURCE_LABEL[source]}
    </span>
  )
}

export function TrendArrow({ trend }: { trend?: Trend }) {
  if (!trend) return null
  const up = trend.endsWith('up')
  const strong = trend.startsWith('strong')
  return (
    <span
      className={cx('text-xs', up ? 'text-up' : 'text-down', !strong && 'opacity-60')}
      title={`${strong ? 'Strongly ' : ''}${up ? 'rising' : 'falling'}`}
    >
      {up ? '▲' : '▼'}
    </span>
  )
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-muted" role="status">
      <Spin size="md" />
      {label}
    </div>
  )
}

export function ErrorState({
  error,
  onRetry,
  source = 'mtgtop8',
  hint,
}: {
  error: unknown
  onRetry?: () => void
  /** Who did not answer, named in the message. */
  source?: string
  /** What to do about it, in place of the raw error. */
  hint?: string
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-down/30 bg-down/5 px-6 py-12 text-center">
      <p className="font-medium">Couldn't load this from {source}.</p>
      <p className="max-w-md text-sm text-muted">
        {hint ?? (error instanceof Error ? error.message : String(error))}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-surface-2"
        >
          Try again
        </button>
      )}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-5 py-10 text-center text-sm text-muted">{children}</p>
}

/** A bar for a share of 0-100, scaled against `max` so the leader fills it. */
export function ShareBar({ value, max = 100 }: { value: number; max?: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className="h-full rounded-full bg-accent"
        style={{ width: `${Math.max(2, (value / (max || 100)) * 100)}%` }}
      />
    </div>
  )
}

export function PeriodSelect({
  periods,
  value,
  onChange,
}: {
  periods: MetaPeriod[]
  value?: string
  onChange: (id: string) => void
}) {
  if (!periods.length) return null
  return (
    <Select
      label="Metagame period"
      value={value ?? periods[0].id}
      options={periods.map((period) => ({ value: period.id, label: period.label }))}
      onChange={onChange}
    />
  )
}

export function Pagination({
  page,
  pageCount,
  onChange,
  open = false,
}: {
  page: number
  pageCount: number
  onChange: (page: number) => void
  /** The count is only a lower bound: keep offering the next page. */
  open?: boolean
}) {
  if (pageCount <= 1 && !open) return null
  const button =
    'rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-surface-2 disabled:opacity-40 disabled:hover:bg-transparent'
  return (
    <nav className="flex items-center justify-center gap-3 py-4" aria-label="Pagination">
      <button type="button" className={button} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← Previous
      </button>
      <span className="tabular text-sm text-muted">
        Page {page}
        {!open && ` of ${pageCount}`}
      </span>
      <button
        type="button"
        className={button}
        disabled={!open && page >= pageCount}
        onClick={() => onChange(page + 1)}
      >
        Next →
      </button>
    </nav>
  )
}

export function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="hover:text-link">
      {children}
    </Link>
  )
}
