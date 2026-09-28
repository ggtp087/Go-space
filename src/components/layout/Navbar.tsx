import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { BrandLockup } from '../brand/BrandLockup'
import { LanguageToggle } from '../LanguageToggle'
import { useLanguage } from '../../i18n/LanguageContext'
import { useArea } from '../../state/AreaContext'
import { districtSeeds } from '../../mock/districts'
import { subDistrictSeeds } from '../../mock/subdistricts'
import { publicSpaces } from '../../mock/nearbySpaces'

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
  const { t } = useLanguage()

  const navLinks = [
    { to: '/map', label: t.nav.map },
    { to: '/dashboard', label: t.nav.dashboard },
    { to: '/compare', label: t.nav.compare },
  ]

  return (
    <header className="flex h-16 flex-none items-center gap-7 border-b border-green-900 bg-green-800 px-5">
      <BrandLockup />

      <nav className="flex items-center gap-1">
        {navLinks.map((link) => (
          <NavLink key={link.to} to={link.to} className={navLinkClass}>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <SearchBox />

      <div className="ml-auto flex flex-none items-center gap-3.5">
        <LanguageToggle variant="dark" />
        <UserMenu user={user} />
      </div>
    </header>
  )
}

function SearchBox() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { setLevel, setDistrictId, setSubDistrictId } = useArea()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    const matchesQuery = (name: string) => name.toLowerCase().includes(q)
    return {
      parks: publicSpaces.filter((space) => matchesQuery(space.name)).slice(0, 5),
      districts: districtSeeds.filter((seed) => matchesQuery(seed.name)).slice(0, 5),
      subDistricts: subDistrictSeeds.filter((seed) => matchesQuery(seed.name)).slice(0, 5),
    }
  }, [query])

  const hasResults = !!results && (results.parks.length > 0 || results.districts.length > 0 || results.subDistricts.length > 0)

  function goToDistrict(districtId: string) {
    setLevel('district')
    setDistrictId(districtId)
    navigate('/map')
    setQuery('')
    setIsOpen(false)
  }

  function goToSubDistrict(subDistrictId: string) {
    setLevel('sub-district')
    setSubDistrictId(subDistrictId)
    navigate('/map')
    setQuery('')
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative max-w-[420px] flex-1">
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
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={t.search.placeholder}
        className="h-9 w-full rounded-lg border border-white/14 bg-white/8 pl-9 pr-3 text-[13.5px] text-white placeholder-[#A9C4B4] outline-none focus:border-white/30"
      />

      {isOpen && results && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-20 max-h-[360px] w-full overflow-y-auto rounded-lg border border-line bg-white py-1.5 shadow-card-lg">
          {!hasResults && <p className="px-3.5 py-2.5 text-[13px] text-slate">{t.search.noResults}</p>}

          {results.parks.length > 0 && (
            <SearchGroup title={t.search.groupParks}>
              {results.parks.map((space) => (
                <button
                  key={space.id}
                  type="button"
                  onClick={() => goToDistrict(space.districtId)}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] text-ink hover:bg-green-50"
                >
                  <span className="text-slate">{space.name}</span>
                  <span className="ml-auto text-[11px] text-mist">{space.type}</span>
                </button>
              ))}
            </SearchGroup>
          )}

          {results.districts.length > 0 && (
            <SearchGroup title={t.search.groupDistricts}>
              {results.districts.map((seed) => (
                <button
                  key={seed.id}
                  type="button"
                  onClick={() => goToDistrict(seed.id)}
                  className="flex w-full items-center px-3.5 py-2 text-left text-[13px] font-medium text-ink hover:bg-green-50"
                >
                  {seed.name}
                </button>
              ))}
            </SearchGroup>
          )}

          {results.subDistricts.length > 0 && (
            <SearchGroup title={t.search.groupSubDistricts}>
              {results.subDistricts.map((seed) => (
                <button
                  key={seed.id}
                  type="button"
                  onClick={() => goToSubDistrict(seed.id)}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-medium text-ink hover:bg-green-50"
                >
                  {seed.name}
                  <span className="ml-auto text-[11px] font-normal text-mist">
                    {districtSeeds.find((d) => d.id === seed.parentId)?.name}
                  </span>
                </button>
              ))}
            </SearchGroup>
          )}
        </div>
      )}
    </div>
  )
}

function SearchGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-line py-1 first:border-t-0">
      <div className="px-3.5 py-1 text-[10.5px] font-bold uppercase tracking-[.4px] text-mist">{title}</div>
      {children}
    </div>
  )
}

function UserMenu({ user }: { user: CurrentUser }) {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex items-center gap-2 border-none bg-transparent text-white"
      >
        <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-accent-500 text-xs font-bold text-white">
          {user.initials}
        </span>
        <span className="text-left leading-tight">
          <span className="block text-[13px] font-medium">{user.name}</span>
          <span className="block text-[10.5px] text-[#A9C4B4]">{user.role}</span>
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#CFE3D6"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] w-48 rounded-lg border border-line bg-white py-1.5 shadow-card-lg"
        >
          <Link
            to="/account"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="block px-3.5 py-2 text-[13px] font-medium text-ink hover:bg-green-50"
          >
            {t.user.accountSettings}
          </Link>
          <Link
            to="/login"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="block px-3.5 py-2 text-[13px] font-medium text-ink hover:bg-green-50"
          >
            {t.user.signOut}
          </Link>
        </div>
      )}
    </div>
  )
}
