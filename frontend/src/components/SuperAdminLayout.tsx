import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { authAPI } from '../api/auth'
import toast from 'react-hot-toast'

type NavItem =
  | { path: string; label: string; icon: string; children?: never }
  | {
      label: string
      icon: string
      path?: never
      children: { path: string; label: string; icon: string }[]
    }

const sidebarNav: NavItem[] = [
  { path: '/super-admin', label: 'Dashboard', icon: 'dashboard' },
  {
    label: 'Company',
    icon: 'company',
    children: [
      { path: '/super-admin/company/all-company', label: 'All Company', icon: 'building' },
      { path: '/super-admin/company/user-license', label: 'User License', icon: 'user' },
    ],
  },
  { path: '/super-admin/plans', label: 'Plans', icon: 'document' },
  { path: '/super-admin/subscriptions', label: 'Subscriptions', icon: 'stack' },
  { path: '/super-admin/transactions', label: 'Transactions', icon: 'transaction' },
  { path: '/super-admin/settings', label: 'Settings', icon: 'settings' },
]

function Icon({ name }: { name: string }) {
  const cls = 'w-5 h-5 flex-shrink-0'
  switch (name) {
    case 'dashboard':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
    case 'company':
    case 'building':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    case 'user':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    case 'document':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      )
    case 'stack':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    case 'transaction':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      )
    case 'settings':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    case 'chevronDown':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )
    case 'chevronUp':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      )
    case 'chevronLeft':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
      )
    default:
      return null
  }
}

export default function SuperAdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [companyOpen, setCompanyOpen] = useState(true)
  const [searchRecordType, setSearchRecordType] = useState('Record ID')
  const [searchValue, setSearchValue] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout: logoutStore, refreshToken } = useAuthStore()

  const handleLogout = async () => {
    try {
      if (refreshToken) await authAPI.logout(refreshToken)
      logoutStore()
      navigate('/login')
      toast.success('Logged out successfully')
    } catch {
      logoutStore()
      navigate('/login')
    }
  }

  const isActive = (path: string) => location.pathname === path
  const companyNav = sidebarNav.find((n) => 'children' in n && n.children?.length)
  const isCompanyActive = companyNav && 'children' in companyNav && (companyNav.children?.some((c) => isActive(c.path)) ?? false)

  const userInitial = user?.username?.charAt(0)?.toUpperCase() || 'R'

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-200 ${
          sidebarCollapsed ? 'w-16' : 'w-56'
        }`}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {!sidebarCollapsed && (
            <span className="text-base font-semibold text-gray-900">Super Admin</span>
          )}
          <button
            type="button"
            className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
            aria-label="Add"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          {sidebarNav.map((item) => {
            if ('children' in item && item.children && item.children.length > 0) {
              const open = item.label === 'Company' ? companyOpen : false
              return (
                <div key={item.label}>
                  <button
                    type="button"
                    onClick={() => item.label === 'Company' && setCompanyOpen(!companyOpen)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      isCompanyActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                    } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                  >
                    <Icon name={item.icon} />
                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1 text-sm font-medium">{item.label}</span>
                        <Icon name={open ? 'chevronUp' : 'chevronDown'} />
                      </>
                    )}
                  </button>
                  {!sidebarCollapsed && open && item.children && (
                    <div className="pl-4 pr-2 pb-1">
                      {item.children.map((child: { path: string; label: string; icon: string }) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm ${
                            isActive(child.path)
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <Icon name={child.icon} />
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            }
            if (!('path' in item) || !item.path) return null
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive(item.path) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon name={item.icon} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <button
          type="button"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-3 border-t border-gray-200 text-gray-500 hover:bg-gray-50 flex justify-center"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Icon name="chevronLeft" />
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 rounded bg-emerald-500 flex items-center justify-center">
                <span className="text-white text-xs font-bold">Ved</span>
              </div>
              <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">
                Venturing Digitally
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 flex-1 max-w-md">
              <select
                value={searchRecordType}
                onChange={(e) => setSearchRecordType(e.target.value)}
                className="border border-gray-300 rounded-l-lg px-3 py-2 text-sm bg-gray-50 text-gray-700"
              >
                <option>Record ID</option>
              </select>
              <input
                type="text"
                placeholder="Enter search value"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="flex-1 border border-gray-300 border-l-0 rounded-r-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600"
                aria-label="Search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
              aria-label="Notifications"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <button
              type="button"
              className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center text-sm hover:bg-blue-200"
              aria-label="Profile"
            >
              {userInitial}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-800 ml-1 hidden sm:block"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
