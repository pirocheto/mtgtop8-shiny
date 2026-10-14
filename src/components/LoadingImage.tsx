import { useState } from 'react'

import { cx } from '../lib/utils'
import { Spin } from './Spin'

/**
 * An image from the network that says it is coming: a black box, as the site
 * draws its pictures, with a small white spinner, then the image fading in
 * once it is there. `className` sizes and shapes the box (it is the one
 * clipped and rounded); the image fills it. An image that fails leaves the
 * black box, without the spinner.
 */
export function LoadingImage({
  src,
  alt,
  className,
  imgClassName,
  title,
  spinner = true,
}: {
  src: string
  alt: string
  className?: string
  imgClassName?: string
  title?: string
  /** Off for thumbnails, too small for one: black, then the image as it comes, no fade. */
  spinner?: boolean
}) {
  // Keyed on the source, so another image starts loading from scratch.
  const [settled, setSettled] = useState<string>()
  const loaded = settled === src
  return (
    <span className={cx('relative block overflow-hidden bg-black', className)}>
      {spinner && !loaded && (
        <Spin onDark className="absolute top-1/2 left-1/2 -translate-1/2" />
      )}
      <img
        // An image the browser already has may be complete before React
        // attaches onLoad: the ref catches that case.
        ref={(img) => {
          if (img?.complete && img.naturalWidth > 0 && settled !== src) setSettled(src)
        }}
        src={src}
        alt={alt}
        title={title}
        loading="lazy"
        onLoad={() => setSettled(src)}
        onError={(event) => {
          event.currentTarget.style.visibility = 'hidden'
          setSettled(src)
        }}
        className={cx(
          'block size-full object-cover transition-[opacity,transform] duration-300',
          // A thumbnail shows as it comes, without fading in.
          spinner && !loaded && 'opacity-0',
          imgClassName,
        )}
      />
    </span>
  )
}
