import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/admin',         label: 'Dashboard',    icon: '📊', end: true },
  { to: '/admin/users',   label: 'Users',         icon: '👥' },
  { to: '/admin/recipes', label: 'Recipes',       icon: '🥗' },
  { to: '/admin/stats',   label: 'Recipe Stats',  icon: '📈' },
  { to: '/admin/system',  label: 'System',        icon: '⚙️' },
]

export default function AdminLayout() {
  const { user, logout }    = useAuth()
  const navigate            = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const NavItems = ({ onClose }: { onClose?: () => void }) => (
    <>
      {NAV.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`
          }
        >
          <span className="text-base flex-shrink-0">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-56 bg-gray-900 flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-gray-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-lg flex-shrink-0">🥗</div>
            <div>
              <p className="text-white font-bold text-sm leading-none">NutriGuide</p>
              <p className="text-gray-400 text-[10px] mt-0.5">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavItems />
        </nav>

        <div className="px-3 py-4 border-t border-gray-700">
          <div className="flex items-center gap-2.5 px-3 py-2 mb-2">
            <div className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.username}</p>
              <p className="text-gray-500 text-[10px]">Administrator</p>
            </div>
          </div>
          <button onClick={() => navigate('/')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white text-xs font-medium transition-all mb-1">
            <span>🏠</span> Back to App
          </button>
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-400 hover:bg-red-900/30 text-xs font-medium transition-all">
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          {/* drawer */}
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-gray-900 flex flex-col shadow-2xl">
            <div className="px-5 py-5 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-lg">🥗</div>
                <div>
                  <p className="text-white font-bold text-sm leading-none">NutriGuide</p>
                  <p className="text-gray-400 text-[10px] mt-0.5">Admin Panel</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              <NavItems onClose={() => setSidebarOpen(false)} />
            </nav>

            <div className="px-3 py-4 border-t border-gray-700">
              <div className="flex items-center gap-2.5 px-3 py-2 mb-2">
                <div className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {user?.username?.[0]?.toUpperCase() || 'A'}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-xs font-semibold truncate">{user?.username}</p>
                  <p className="text-gray-500 text-[10px]">Administrator</p>
                </div>
              </div>
              <button onClick={() => { navigate('/'); setSidebarOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white text-xs font-medium transition-all mb-1">
                <span>🏠</span> Back to App
              </button>
              <button onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-400 hover:bg-red-900/30 text-xs font-medium transition-all">
                <span>🚪</span> Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile top bar */}
        <header className="md:hidden bg-gray-900 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center text-white hover:bg-gray-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary-600 rounded-lg flex items-center justify-center text-sm">🥗</div>
            <span className="text-white font-bold text-sm">Admin Panel</span>
          </div>
          <div className="w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {user?.username?.[0]?.toUpperCase() || 'A'}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
