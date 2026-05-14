import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useRef, useState } from 'react'

const NAV = [
  { to: '/',         icon: '🏠', label: 'Home'      },
  { to: '/mealplan', icon: '📅', label: 'Meal Plan' },
  { to: '/log',      icon: '🍽', label: 'Diary'     },
  { to: '/progress', icon: '📊', label: 'Progress'  },
  { to: '/profile',  icon: '👤', label: 'Profile'   },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Layout() {
  const { user }                      = useAuth()
  const navigate                      = useNavigate()
  const mainRef                       = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled]       = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const displayName = user?.username || user?.email?.split('@')[0] || 'there'

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
  }, [])

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

        {/* notification bell */}
        <div className="relative">
          <button
            className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors active:scale-95"
            onClick={() => navigate('/notifications')}
          >
            <span className="text-lg">🔔</span>
          </button>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-primary-600 flex items-center justify-center">
              <span className="text-white text-[9px] font-extrabold px-0.5">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            </span>
          )}
        </div>
      </header>

      {/* Page content */}
      <main ref={mainRef} className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>

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
                  isActive ? 'bg-primary-100 scale-105' : 'scale-100'
                }`}>
                  <span className={`text-lg transition-transform duration-150 active:scale-75 ${isActive ? 'scale-110' : ''}`}>
                    {item.icon}
                  </span>
                </div>
                <span className={`text-[10px] font-bold transition-all ${isActive ? 'text-primary-600' : 'text-gray-400'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute top-1 w-1 h-1 rounded-full bg-primary-600" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}