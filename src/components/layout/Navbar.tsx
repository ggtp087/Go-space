import { NavLink } from 'react-router-dom'
import { BrandLockup } from '../brand/BrandLockup'
import { LanguageToggle } from '../LanguageToggle'
import { en } from '../../i18n/strings'

const NAV_LINKS = [
  { to: '/map', label: en.nav.map },
  { to: '/dashboard', label: en.nav.dashboard },
  { to: '/compare', label: en.nav.compare },
]

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-white/14 text-white font-semibold' : 'text-[#CFE3D6] hover:bg-white/8 hover:text-white'
  }`

type CurrentUser = {
  initials: string
  name: string
  role: string
}

type NavbarProps = {
  user: CurrentUser
}

export function Navbar({ user }: NavbarProps) {
  return (
    <header className="flex h-16 flex-none items-center gap-7 border-b border-green-900 bg-green-800 px-5">
      <BrandLockup />

      <nav className="flex items-center gap-1">
        {NAV_LINKS.map((link) => (
          <NavLink key={link.to} to={link.to} className={navLinkClass}>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="relative max-w-[420px] flex-1">
        <svg
          className="pointer-events-none absolute left-2.5 top-2.5 text-[#A9C4B4]"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder={en.search.placeholder}
          className="h-9 w-full rounded-lg border border-white/14 bg-white/8 pl-9 pr-3 text-[13.5px] text-white placeholder-[#A9C4B4] outline-none focus:border-white/30"
        />
      </div>

      <div className="ml-auto flex flex-none items-center gap-3.5">
        <LanguageToggle variant="dark" />

        <button type="button" className="flex items-center gap-2 border-none bg-transparent text-white">
          <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-accent-500 text-xs font-bold text-white">
            {user.initials}
          </span>
          <span className="text-left leading-tight">
            <span className="block text-[13px] font-medium">{user.name}</span>
            <span className="block text-[10.5px] text-[#A9C4B4]">{user.role}</span>
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CFE3D6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
    </header>
  )
}
