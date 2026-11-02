import { useEffect, useRef, useState } from 'react'

/**
 * Measures a chart's wrapping element at its real rendered width via
 * ResizeObserver, so the SVG inside can set its viewBox to that same real
 * pixel size instead of a fixed virtual width stretched to fit — the one
 * thing that was turning circles into ellipses and text into mush (a fixed
 * viewBox width with `width="100%"` scales X and Y by different factors
 * whenever the container isn't exactly that virtual width, which in a
 * responsive grid is always). Attach `ref` to the wrapping element (not the
 * `<svg>` itself) and use `width` as both the SVG's viewBox width and its
 * internal layout math — then 1 SVG unit is exactly 1 screen pixel, so no
 * distortion is possible at any size.
 */
export function useChartWidth(fallbackWidth = 600) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(fallbackWidth)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width
      if (measured) setWidth(measured)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, width }
}
