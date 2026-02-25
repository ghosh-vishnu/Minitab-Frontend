import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { authAPI } from '../api/auth'
import toast from 'react-hot-toast'
import { useState } from 'react'
import { DialogProvider } from '../context/DialogContext'
import { DialogContainer } from './StatDialogs'
import CompanySuspendedScreen from './CompanySuspendedScreen'

const Layout = () => {
  const { user, logout: logoutStore, refreshToken, updateUser } = useAuthStore()
  const navigate = useNavigate()
  const [showSidebar, setShowSidebar] = useState(true)

  // Refresh profile so we have latest company status (e.g. if company was suspended after user logged in)
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

  // Get user initials for avatar
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
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* App Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 transform rotate-45 flex items-center justify-center">
                <div className="w-4 h-4 bg-white transform -rotate-45"></div>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Venturing Digitally Pvt Ltd.</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* User Profile */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/profile')}
                className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                aria-label="Open profile"
              >
                {getUserInitials()}
              </button>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Main Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar */}
          {showSidebar && (
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
              {/* Sidebar Toggle Button */}
              <div className="p-4 border-b border-gray-200">
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded w-full flex items-center justify-between"
                  aria-label="Hide sidebar"
                >
                  <span className="text-sm font-medium">Navigation</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
              </div>

              <nav className="flex-1 p-4 space-y-2">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-3 px-3 py-2 rounded-md bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
                    />
                  </svg>
                  <span>Home</span>
                </Link>

                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                    />
                  </svg>
                  <span>Untitled</span>
                </button>

                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" 
                    />
                  </svg>
                  <span>Learn</span>
                </button>

                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M13 10V3L4 14h7v7l9-11h-7z" 
                    />
                  </svg>
                  <span>Discover</span>
                </button>
              </nav>

              {/* Sidebar Footer */}
             
            </aside>
          )}

          {/* Sidebar Toggle Button (when hidden) */}
          {!showSidebar && (
            <button
              onClick={() => setShowSidebar(true)}
              className="fixed left-0 top-1/2 -translate-y-1/2 bg-white border border-gray-200 rounded-r-md p-2 shadow-md hover:bg-gray-50 z-10"
              aria-label="Show sidebar"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col overflow-hidden bg-white">
            <Outlet />
          </main>
        </div>

        {/* Dialog Container */}
        <DialogContainer />
      </div>
    </DialogProvider>
  )
}

export default Layout