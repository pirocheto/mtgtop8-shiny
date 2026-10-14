import { cx } from '../lib/utils'

/**
 * The one spinner of the site: a thin ring, its turning part in the link
 * blue. `sm` sits inline (a count, a price, an image), `md` stands for a
 * whole block. `onDark` is for the blue title bars, where it turns white.
 */
export function Spin({
  size = 'sm',
  onDark = false,
  className,
}: {
  size?: 'sm' | 'md'
  onDark?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-block shrink-0 animate-spin rounded-full border-2',
        size === 'sm' ? 'size-4' : 'size-6',
        onDark ? 'border-white/30 border-t-white' : 'border-line border-t-link',
        className,
      )}
    />
  )
}
