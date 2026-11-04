import { Outlet, useLocation } from 'react-router-dom'
import { BrandLockup } from '../brand/BrandLockup'
import { LanguageToggle } from '../LanguageToggle'
import { useLanguage } from '../../i18n/LanguageContext'
import { mockDistrictBoundaries, mockSubDistrictBoundaries } from '../../mock/mapBoundaries'

/**
 * Shell for the signed-out flows (login, register, reset password): a fixed
 * green brand panel on the left, and a centered form slot on the right.
 *
 * The panel's background texture is a generic decorative pattern, not real
 * district geometry — actual map boundaries come later once real data exists.
 */
export function AuthLayout() {
  const { t } = useLanguage()
  const { pathname } = useLocation()
  const brandCopy = pathname.startsWith('/register')
    ? t.auth.register
    : pathname.startsWith('/reset-password')
      ? t.auth.resetPassword
      : t.auth.login

  // Read straight from the real boundary data so the chip can never drift
  // from the counts the rest of the app (Map/Dashboard/Compare) uses.
  const coverageBadge = t.brand.badgeCoverageTemplate
    .replace('{districts}', String(mockDistrictBoundaries.features.length))
    .replace('{subdistricts}', String(mockSubDistrictBoundaries.features.length))

  return (
    <div className="flex min-h-screen">
      <aside className="relative hidden w-[620px] flex-none flex-col overflow-hidden bg-gradient-to-br from-green-800 to-green-900 p-12 lg:flex">
        <DecorativeTexture />

        <BrandLockup size="lg" className="relative z-10" />

        <div className="relative z-10 my-auto max-w-[440px]">
          <h1 className="mb-4 text-[34px] font-bold leading-[1.28] text-white">{brandCopy.brandTitle}</h1>
          <p className="max-w-[400px] text-[14.5px] leading-[1.7] text-[#CFE3D6]">{brandCopy.brandText}</p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <span className="rounded-full border border-white/14 bg-white/8 px-3.5 py-1.5 text-[11.5px] font-semibold text-green-100">
              {t.brand.badgeIndicator}
            </span>
            <span className="rounded-full border border-white/14 bg-white/8 px-3.5 py-1.5 text-[11.5px] font-semibold text-green-100">
              {coverageBadge}
            </span>
            <span className="rounded-full border border-white/14 bg-white/8 px-3.5 py-1.5 text-[11.5px] font-semibold text-green-100">
              {t.brand.badgeYears}
            </span>
          </div>
          <p className="mt-3 text-[11px] text-[#9DBBA9]">{t.common.sampleDataTag}</p>
        </div>

        <p className="relative z-10 text-[11.5px] leading-relaxed">
          <span className="font-semibold text-white/90">{t.brand.footLine1}</span>
          <br />
          <span className="text-[10.5px] text-[#9DBBA9]">{t.brand.footLine2}</span>
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

/**
 * Soft, non-geographic texture — stands in for the brand panel's artwork.
 * Pinned tight to the bottom-right corner (not stretched toward the
 * vertically-centered headline/paragraph block above it) so the brand copy
 * always sits on a plain background.
 */
function DecorativeTexture() {
  return (
    <svg className="pointer-events-none absolute bottom-0 right-0 h-56 w-56 opacity-50" viewBox="0 0 220 220" fill="none" aria-hidden="true">
      <circle cx="190" cy="190" r="90" fill="#ffffff" opacity="0.07" />
      <circle cx="155" cy="155" r="55" fill="#ffffff" opacity="0.06" />
      <path
        d="M35 215 C75 185 95 155 145 145 C178 138 195 118 195 85"
        stroke="#ffffff"
        strokeOpacity="0.12"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
