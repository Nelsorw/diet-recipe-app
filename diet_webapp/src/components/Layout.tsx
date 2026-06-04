import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useRef, useState } from 'react'
import ChatWidget from './ChatWidget'
import { getProfile, fixImageUrl } from '../services/api'

const NAV = [
  { to: '/',         label: 'Home',      activeColor: 'text-primary-600',  bgColor: 'bg-primary-100',  icon: (active: boolean) => (
    <svg className={`w-5 h-5 ${active ? 'text-primary-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )},
  { to: '/mealplan', label: 'Meal Plan', activeColor: 'text-blue-600',     bgColor: 'bg-blue-100',     icon: (active: boolean) => (
    <svg className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )},
  { to: '/log',      label: 'Diary',     activeColor: 'text-orange-500',   bgColor: 'bg-orange-100',   icon: (active: boolean) => (
    <svg className={`w-5 h-5 ${active ? 'text-orange-500' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )},
  { to: '/progress', label: 'Progress',  activeColor: 'text-purple-600',   bgColor: 'bg-purple-100',   icon: (active: boolean) => (
    <svg className={`w-5 h-5 ${active ? 'text-purple-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )},
  { to: '/more',     label: 'More',      activeColor: 'text-gray-700',     bgColor: 'bg-gray-200',     icon: (active: boolean) => (
    <svg className={`w-5 h-5 ${active ? 'text-gray-700' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )},
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Layout() {
  const { user, logout }              = useAuth()
  const navigate                      = useNavigate()
  const mainRef                       = useRef<HTMLDivElement>(null)
  const dropdownRef                   = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled]       = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profile, setProfile]         = useState<any>(null)

  const displayName = user?.username || user?.email?.split('@')[0] || 'there'

  // fetch active profile for avatar + full name
  useEffect(() => {
    getProfile()
      .then(res => setProfile(res.data.profile))
      .catch(() => {})
  }, [user?.active_profile_id])

  // close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const handler = () => setScrolled(el.scrollTop > 10)
    el.addEventListener('scroll', handler)
    return () => el.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const { getNotifications } = await import('../services/api')
        const res = await getNotifications()
        setUnreadCount(res.data.unread_count || 0)
      } catch (_) {}
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 60000)
    return () => clearInterval(interval)
  }, [user?.active_profile_id])

  return (
    <div className="flex flex-col h-screen bg-gray-50">

      {/* Top header */}
      <header className={`bg-primary-600 text-white px-4 py-3 flex items-center justify-between flex-shrink-0 transition-shadow duration-300 ${scrolled ? 'shadow-xl' : 'shadow-sm'}`}>
        <div className="flex items-center gap-2">
          <img
            src="/logo-icon.png"
            alt="Diet and Recipe"
            style={{ width: '36px', height: '36px', minWidth: '36px', minHeight: '36px', objectFit: 'cover', borderRadius: '50%', flexShrink: 0 }}
          />
          <div>
            <span className="font-extrabold text-base leading-none">Diet & Recipe</span>
            <p className="text-primary-200 text-[10px] leading-none mt-0.5">
              {getGreeting()}, <span className="font-bold text-white">{displayName}</span>
            </p>
          </div>
        </div>

        {/* Right side: bell + profile avatar */}
        <div className="flex items-center gap-2">

          {/* notification bell */}
          <div className="relative">
            <button
              className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors active:scale-95"
              onClick={() => navigate('/notifications')}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-primary-600 flex items-center justify-center">
                <span className="text-white text-[9px] font-extrabold px-0.5">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              </span>
            )}
          </div>

          {/* profile avatar with dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProfileOpen(o => !o)}
              className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/30 hover:border-white/60 transition-all active:scale-95 flex-shrink-0"
            >
              {profile?.profile_image_url ? (
                <img
                  src={fixImageUrl(profile.profile_image_url)!}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-white/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                  </svg>
                </div>
              )}
            </button>

            {/* Dropdown */}
            {profileOpen && (
              <div className="absolute right-0 top-11 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                {/* Profile info header */}
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <p className="text-xs text-gray-400 font-medium">Signed in as</p>
                  <p className="text-sm font-bold text-gray-800 truncate mt-0.5">
                    {profile?.full_name || displayName}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">{profile?.profile_name || 'My Profile'}</p>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <button
                    onClick={() => { setProfileOpen(false); navigate('/more/switch') }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Switch Profile
                  </button>
                  <button
                    onClick={() => { setProfileOpen(false); navigate('/more/password') }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Change Password
                  </button>
                </div>

                <div className="border-t border-gray-100 py-1">
                  <button
                    onClick={() => { setProfileOpen(false); logout() }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors text-left"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Page content */}
      <main ref={mainRef} className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>

      {/* Floating chat widget */}
      <ChatWidget />

      {/* Bottom navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-50 shadow-lg"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-all duration-150 relative
              ${isActive ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'}`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`relative flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200 ${
                  isActive ? `${item.bgColor} scale-105` : 'scale-100'
                }`}>
                  {item.icon(isActive)}
                </div>
                <span className={`text-[10px] font-bold transition-all ${isActive ? item.activeColor : 'text-gray-400'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className={`absolute top-1 w-1 h-1 rounded-full ${item.activeColor.replace('text-', 'bg-')}`} />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}