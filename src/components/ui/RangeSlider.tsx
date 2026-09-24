const THUMB_CLASSES =
  '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-green-600 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_1px_3px_rgba(0,0,0,0.25)] ' +
  '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-green-600 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_1px_3px_rgba(0,0,0,0.25)] ' +
  '[&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-track]:bg-transparent'

type RangeSliderProps = {
  min: number
  max: number
  step?: number
  value: [number, number]
  onChange: (value: [number, number]) => void
  formatLabel?: (value: number) => string
}

export function RangeSlider({ min, max, step = 1, value, onChange, formatLabel = String }: RangeSliderProps) {
  const [lo, hi] = value
  const loPct = ((lo - min) / (max - min)) * 100
  const hiPct = ((hi - min) / (max - min)) * 100

  return (
    <div>
      <div className="relative h-5">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line-2" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-green-600"
          style={{ left: `${loPct}%`, right: `${100 - hiPct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={lo}
          onChange={(event) => onChange([Math.min(Number(event.target.value), hi), hi])}
          className={`absolute inset-x-0 top-1/2 h-4 w-full -translate-y-1/2 cursor-pointer appearance-none bg-transparent ${THUMB_CLASSES}`}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={hi}
          onChange={(event) => onChange([lo, Math.max(Number(event.target.value), lo)])}
          className={`absolute inset-x-0 top-1/2 h-4 w-full -translate-y-1/2 cursor-pointer appearance-none bg-transparent ${THUMB_CLASSES}`}
        />
      </div>
      <div className="mt-2 flex justify-between text-[11.5px] font-semibold text-slate">
        <span>{formatLabel(lo)}</span>
        <span>{formatLabel(hi)}</span>
      </div>
    </div>
  )
}
