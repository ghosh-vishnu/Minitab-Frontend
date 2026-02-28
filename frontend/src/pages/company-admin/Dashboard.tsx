import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { companiesAPI, CompanyStats, Company, ProductModule } from '../../api/companies'
import { usersAPI } from '../../api/users'
import { useAuthStore } from '../../store/authStore'
import CompanySuspendedScreen from '../../components/CompanySuspendedScreen'

export default function CADashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<CompanyStats | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [productModules, setProductModules] = useState<ProductModule[]>([])
  const [recentUsers, setRecentUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [statsRes, companyRes, modulesRes, usersRes] = await Promise.all([
        user?.company ? companiesAPI.getCompanyStats() : Promise.resolve(null),
        user?.company ? companiesAPI.getMyCompany().catch(() => null) : Promise.resolve(null),
        companiesAPI.getProductModules().catch(() => []),
        usersAPI.listCompanyUsers({ ordering: '-date_joined', page_size: 5 }).catch(() => ({ results: [] })),
      ])
      setStats(statsRes)
      setCompany(companyRes ?? null)
      setProductModules(Array.isArray(modulesRes) ? modulesRes : [])
      setRecentUsers(usersRes.results.slice(0, 5))
    } catch (err) {
      console.error('Failed to load dashboard data', err)
    } finally {
      setLoading(false)
    }
  }

  if (user?.company?.status === 'suspended') {
    return <CompanySuspendedScreen />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const userLimitPercentage = stats ? (stats.total_users / stats.user_limit) * 100 : 0

  return (
    <div className="space-y-6">
      {/* User Limit Progress */}
      {stats && (
        <div className={`rounded-xl p-5 ${
          userLimitPercentage >= 90 
            ? 'bg-red-50 border border-red-200' 
            : userLimitPercentage >= 75 
            ? 'bg-amber-50 border border-amber-200'
            : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                userLimitPercentage >= 90 ? 'bg-red-100' : 
                userLimitPercentage >= 75 ? 'bg-amber-100' : 'bg-blue-100'
              }`}>
                <svg className={`w-5 h-5 ${
                  userLimitPercentage >= 90 ? 'text-red-600' : 
                  userLimitPercentage >= 75 ? 'text-amber-600' : 'text-blue-600'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600">User Limit</p>
                <p className="text-lg font-bold text-gray-900">
                  {stats.total_users} / {stats.user_limit} users
                </p>
              </div>
            </div>
            {stats.subscription_end_date && (
              <div className="text-right">
                <p className="text-sm text-gray-600">License Expires</p>
                <p className="font-semibold text-gray-900">
                  {new Date(stats.subscription_end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${
                userLimitPercentage >= 90 ? 'bg-red-500' : 
                userLimitPercentage >= 75 ? 'bg-amber-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(userLimitPercentage, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total_users ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.active_users ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Spreadsheets</p>
              <p className="text-2xl font-bold text-gray-900">-</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-xl">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Analyses</p>
              <p className="text-2xl font-bold text-gray-900">-</p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Modules */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Modules</h2>
          {!company?.module_access || Object.keys(company.module_access).length === 0 ? (
            <p className="text-sm text-gray-500">No modules assigned. Contact your administrator.</p>
          ) : (
            <ul className="space-y-3">
              {productModules
                .filter((m) => m.id in (company.module_access ?? {}))
                .map((m) => {
                  const subIds = company.module_access![m.id] ?? []
                  const subNames = m.submodules.filter((s) => subIds.includes(s.id)).map((s) => s.name)
                  return (
                    <li key={m.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{m.name}</p>
                        <p className="text-sm text-gray-500">
                          {subNames.length > 0 ? subNames.join(', ') : 'All submodules'}
                        </p>
                      </div>
                    </li>
                  )
                })}
            </ul>
          )}
        </div>

        {/* Recent Users */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Users</h2>
            <Link to="/company-admin/users" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All →
            </Link>
          </div>
          {recentUsers.length === 0 ? (
            <p className="text-sm text-gray-500">No users yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentUsers.map((u) => (
                <li key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {(u.full_name || u.username || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{u.full_name || u.username}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/company-admin/users"
            className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div className="p-3 bg-blue-100 rounded-xl">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">Add User</span>
          </Link>

          <Link
            to="/company-admin/spreadsheets"
            className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div className="p-3 bg-green-100 rounded-xl">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">New Spreadsheet</span>
          </Link>

          <Link
            to="/company-admin/roles"
            className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div className="p-3 bg-purple-100 rounded-xl">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">Manage Roles</span>
          </Link>

          <Link
            to="/company-admin/company"
            className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div className="p-3 bg-amber-100 rounded-xl">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">Company Info</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
