import { LogoMark } from './LogoMark'
import { useLanguage } from '../../i18n/LanguageContext'

type BrandLockupProps = {
  size?: 'sm' | 'lg'
  className?: string
}

/** Logo mark + "GO SPAce" wordmark, used in the navbar and the auth panel. */
export function BrandLockup({ size = 'sm', className = '' }: BrandLockupProps) {
  const { t } = useLanguage()
  const isLarge = size === 'lg'
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={isLarge ? 36 : 30} />
      <div>
        <div className={`font-bold text-white ${isLarge ? 'text-xl' : 'text-[17px]'}`}>
          {t.brand.word}
        </div>
        <div className={`font-medium text-[#BFD8C9] ${isLarge ? 'text-[10.5px]' : 'text-[10px] mt-px'}`}>
          {t.brand.sub}
        </div>
      </div>
    </div>
  )
}
