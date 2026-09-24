import { Outlet } from 'react-router-dom'
import { BrandLockup } from '../brand/BrandLockup'
import { LanguageToggle } from '../LanguageToggle'
import { useLanguage } from '../../i18n/LanguageContext'

/**
 * Shell for the signed-out flows (login, register, reset password): a fixed
 * green brand panel on the left, and a centered form slot on the right.
 *
 * The panel's background texture is a generic decorative pattern, not real
 * district geometry — actual map boundaries come later once real data exists.
 */
export function AuthLayout() {
  const { t } = useLanguage()
  return (
    <div className="flex min-h-screen">
      <aside className="relative hidden w-[620px] flex-none flex-col overflow-hidden bg-gradient-to-br from-green-800 to-green-900 p-12 lg:flex">
        <DecorativeTexture />

        <BrandLockup size="lg" className="relative z-10" />

        <div className="relative z-10 my-auto max-w-[440px]">
          <h1 className="mb-4 text-[34px] font-bold leading-[1.28] text-white">{t.brand.title}</h1>
          <p className="max-w-[400px] text-[14.5px] leading-[1.7] text-[#CFE3D6]">{t.brand.text}</p>
          <div className="mt-6 flex gap-2.5">
            <span className="rounded-full border border-white/14 bg-white/8 px-3.5 py-1.5 text-[11.5px] font-semibold text-green-100">
              {t.brand.badgeIndicator}
            </span>
            <span className="rounded-full border border-white/14 bg-white/8 px-3.5 py-1.5 text-[11.5px] font-semibold text-green-100">
              {t.brand.badgeCoverage}
            </span>
          </div>
        </div>

        <p className="relative z-10 text-[11.5px] leading-relaxed text-[#9DBBA9]">
          {t.brand.footLine1}
          <br />
          {t.brand.footLine2}
        </p>
      </aside>

      <div className="relative flex flex-1 flex-col items-center justify-center bg-white px-6 py-16">
        <LanguageToggle variant="light" className="absolute right-6 top-7 sm:right-10" />
        <div className="w-full max-w-[380px]">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

/** Soft, non-geographic texture — stands in for the brand panel's artwork. */
function DecorativeTexture() {
  return (
    <svg
      className="pointer-events-none absolute -bottom-24 -right-32 h-[640px] w-[560px] opacity-90"
      viewBox="0 0 560 640"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="360" cy="420" r="220" fill="#ffffff" opacity="0.06" />
      <circle cx="300" cy="360" r="150" fill="#ffffff" opacity="0.05" />
      <circle cx="420" cy="300" r="90" fill="#ffffff" opacity="0.07" />
      <path
        d="M60 40 C120 120 90 220 160 280 C230 340 260 420 210 500 C170 565 220 610 260 640"
        stroke="#ffffff"
        strokeOpacity="0.12"
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
