type LogoMarkProps = {
  size?: number
  className?: string
}

/** The GO SPAce leaf glyph, on its rounded green tile. */
export function LogoMark({ size = 30, className = '' }: LogoMarkProps) {
  return (
    <div
      className={`flex flex-none items-center justify-center rounded-lg bg-green-500 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.57}
        height={size * 0.57}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 21c4-3.5 7-7.6 7-11.6A7 7 0 0 0 5 9.4C5 13.4 8 17.5 12 21z" />
        <circle cx="12" cy="9.2" r="2.4" />
      </svg>
    </div>
  )
}
