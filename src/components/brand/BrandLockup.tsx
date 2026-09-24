import { LogoMark } from './LogoMark'
import { en } from '../../i18n/strings'

type BrandLockupProps = {
  size?: 'sm' | 'lg'
  className?: string
}

/** Logo mark + "GO SPAce" wordmark, used in the navbar and the auth panel. */
export function BrandLockup({ size = 'sm', className = '' }: BrandLockupProps) {
  const isLarge = size === 'lg'
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={isLarge ? 36 : 30} />
      <div>
        <div className={`font-bold text-white ${isLarge ? 'text-xl' : 'text-[17px]'}`}>
          {en.brand.word}
        </div>
        <div className={`font-medium text-[#BFD8C9] ${isLarge ? 'text-[10.5px]' : 'text-[10px] mt-px'}`}>
          {en.brand.sub}
        </div>
      </div>
    </div>
  )
}
