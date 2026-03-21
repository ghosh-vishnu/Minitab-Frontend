import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { authAPI } from '../api/auth'
import toast from 'react-hot-toast'
import { useState } from 'react'
import { DialogProvider } from '../context/DialogContext'
import { DialogContainer } from './StatDialogs'
import CompanySuspendedScreen from './CompanySuspendedScreen'

const menuItems = [
  {
    section: 'Home',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    ],
  },
  {
    section: 'Product',
    items: [
      { name: 'Excel® Statistical Software', path: '/dashboard', icon: 'chart' },
    ],
  },
  {
    section: 'Account',
    items: [
      { name: 'My Profile', path: '/profile', icon: 'user' },
    ],
  },
]

const iconMap: Record<string, JSX.Element> = {
  dashboard: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  chart: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  user: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
}

const Layout = () => {
  const { user, logout: logoutStore, refreshToken, updateUser } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Refresh profile so we have latest company status
  useEffect(() => {
    if (!user?.company) return
    authAPI.getProfile()
      .then((profile) => updateUser(profile))
      .catch(() => {})
  }, [user?.company?.id, updateUser])

  if (user?.company?.status === 'suspended') {
    return <CompanySuspendedScreen />
  }

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await authAPI.logout(refreshToken)
      }
      logoutStore()
      navigate('/login')
      toast.success('Logged out successfully')
    } catch (error) {
      console.error('Logout error:', error)
      logoutStore()
      navigate('/login')
    }
  }

  const getUserInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    }
    if (user?.username) {
      return user.username.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  return (
    <DialogProvider>
      <div className="min-h-screen bg-slate-50 flex">
        {/* Dark Sidebar - Image 1 style */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-20'
          } bg-slate-900 text-white flex flex-col transition-all duration-300 fixed h-full z-30`}
        >
          {/* Logo / Brand */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700">
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">M</span>
                </div>
                <span className="font-semibold text-lg">Minitab</span>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label={sidebarOpen ? 'Collapse menu' : 'Expand menu'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {sidebarOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" />
                )}
              </svg>
            </button>
          </div>

          {/* User Profile Section */}
          <div className="px-4 py-3 border-b border-slate-700">
            <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">{getUserInitials()}</span>
              </div>
              {sidebarOpen && (
                <div className="overflow-hidden min-w-0">
                  <p className="font-medium text-sm truncate">{user?.username || user?.email}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            {menuItems.map((section, idx) => (
              <div key={idx} className="mb-4">
                {sidebarOpen && (
                  <h3 className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    {section.section}
                  </h3>
                )}
                <ul className="space-y-1 px-2">
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/')
                    return (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                            isActive
                              ? 'bg-emerald-600 text-white'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          } ${!sidebarOpen && 'justify-center'}`}
                          title={!sidebarOpen ? item.name : undefined}
                        >
                          {iconMap[item.icon]}
                          {sidebarOpen && <span className="text-sm font-medium">{item.name}</span>}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-slate-700">
            <button
              onClick={handleLogout}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-slate-300 hover:bg-red-600 hover:text-white transition-colors ${
                !sidebarOpen && 'justify-center'
              }`}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {sidebarOpen && <span className="text-sm font-medium">Logout</span>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 flex flex-col ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`}>
          {/* Top Header */}
          <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
            <h1 className="text-xl font-semibold text-slate-900">
              Venturing Digitally Pvt Ltd.
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600 hidden sm:inline">
                Welcome, <span className="font-medium">{user?.username || user?.first_name || 'User'}</span>
              </span>
              <Link
                to="/profile"
                className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 text-sm font-medium hover:bg-slate-300 transition-colors"
              >
                {getUserInitials()}
              </Link>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 overflow-auto bg-slate-50/50">
            <Outlet />
          </div>
        </main>

        <DialogContainer />
      </div>
    </DialogProvider>
  )
}

export default Layout