import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { usersAPI, User, CreateUserData } from '../api/users'

function formatApiError(err: any): string {
  const data = err.response?.data
  if (!data) return err.message || 'Request failed'
  if (typeof data.detail === 'string') return data.detail
  if (Array.isArray(data.detail)) return (data.detail as string[]).join('. ')
  const parts: string[] = []
  for (const [field, messages] of Object.entries(data)) {
    if (field === 'detail') continue
    if (Array.isArray(messages)) {
      parts.push(`${field}: ${(messages as string[]).join(', ')}`)
    } else if (typeof messages === 'string') {
      parts.push(messages)
    }
  }
  return parts.length ? parts.join('; ') : 'Validation failed'
}
import { companiesAPI, CompanyStats, Company, ProductModule } from '../api/companies'
import { rbacAPI, Role } from '../api/rbac'
import { useAuthStore } from '../store/authStore'
import { authAPI } from '../api/auth'
import CompanySuspendedScreen from '../components/CompanySuspendedScreen'
import toast from 'react-hot-toast'

export default function CompanyAdminDashboard() {
  const { user, logout: logoutStore, refreshToken } = useAuthStore()
  const navigate = useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [stats, setStats] = useState<CompanyStats | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [productModules, setProductModules] = useState<ProductModule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [usersRes, rolesRes, statsRes, companyRes, modulesRes] = await Promise.all([
        usersAPI.listCompanyUsers({ ordering: '-date_joined' }),
        rbacAPI.getRoles().then(roles => ({ results: roles.filter(r => r.scope === 'company') })),
        user?.company ? companiesAPI.getCompanyStats() : Promise.resolve(null),
        user?.company ? companiesAPI.getMyCompany().catch(() => null) : Promise.resolve(null),
        companiesAPI.getProductModules().catch(() => []),
      ])

      setUsers(usersRes.results)
      setRoles(rolesRes.results)
      setStats(statsRes)
      setCompany(companyRes ?? null)
      setProductModules(Array.isArray(modulesRes) ? modulesRes : [])
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (data: CreateUserData) => {
    try {
      if (stats && stats.total_users >= stats.user_limit) {
        throw new Error('User limit reached. Please upgrade your subscription.')
      }
      await usersAPI.createUser(data)
      setShowCreateModal(false)
      loadData()
    } catch (err: any) {
      const msg = formatApiError(err)
      throw new Error(msg)
    }
  }

  const handleDeactivateUser = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return

    try {
      setError(null)
      await usersAPI.deactivateUser(userId)
      toast.success('User deactivated successfully')
      loadData()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to deactivate user')
      toast.error(err.response?.data?.detail || 'Failed to deactivate user')
    }
  }

  const handleActivateUser = async (userId: string) => {
    try {
      await usersAPI.activateUser(userId)
      loadData()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to activate user')
    }
  }

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const userLimitPercentage = stats ? (stats.total_users / stats.user_limit) * 100 : 0
  const isUserLimitReached = stats ? stats.total_users >= stats.user_limit : false

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

  if (user?.company?.status === 'suspended') {
    return <CompanySuspendedScreen />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Company Admin Dashboard</h1>
              <p className="mt-1 text-sm text-gray-600">
                {user?.company?.name} - Manage your team
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/company-admin/profile"
                className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                disabled={isUserLimitReached}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title={isUserLimitReached ? 'User limit reached' : 'Create new user'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create User
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Limit & Subscription Expiry Alert */}
        {stats && (
          <div className={`mb-6 rounded-lg p-4 ${
            userLimitPercentage >= 90 
              ? 'bg-red-50 border border-red-200' 
              : userLimitPercentage >= 75 
              ? 'bg-yellow-50 border border-yellow-200'
              : 'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <svg className={`w-5 h-5 ${
                  userLimitPercentage >= 90 ? 'text-red-600' : 
                  userLimitPercentage >= 75 ? 'text-yellow-600' : 'text-blue-600'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className={`font-semibold ${
                  userLimitPercentage >= 90 ? 'text-red-900' : 
                  userLimitPercentage >= 75 ? 'text-yellow-900' : 'text-blue-900'
                }`}>
                  User Limit: {stats.total_users} / {stats.user_limit}
                </span>
              </div>
              {stats.subscription_end_date && (
                <span className="text-sm font-medium text-gray-700">
                  Subscription expires on: {new Date(stats.subscription_end_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                  {stats.subscription_days_remaining !== undefined && stats.subscription_days_remaining >= 0 && (
                    <span className="text-gray-500 ml-1">
                      ({stats.subscription_days_remaining} days left)
                    </span>
                  )}
                </span>
              )}
              {isUserLimitReached && (
                <span className="text-sm text-red-600 font-medium">Limit Reached - Upgrade to add more users</span>
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  userLimitPercentage >= 90 ? 'bg-red-600' : 
                  userLimitPercentage >= 75 ? 'bg-yellow-600' : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(userLimitPercentage, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_users}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active_users}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Product modules – company access (read-only) */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Product modules</h2>
          <p className="text-sm text-gray-600 mb-4">
            Modules and submodules your company has access to. Assigned by your administrator.
          </p>
          {!company?.module_access || Object.keys(company.module_access).length === 0 ? (
            <p className="text-sm text-gray-500">No modules assigned yet. Contact your administrator.</p>
          ) : productModules.length === 0 ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : (
            <ul className="space-y-2">
              {productModules
                .filter((m) => m.id in (company.module_access ?? {}))
                .map((m) => {
                  const subIds = company.module_access![m.id] ?? []
                  const subNames = m.submodules.filter((s) => subIds.includes(s.id)).map((s) => s.name)
                  return (
                    <li key={m.id} className="text-sm">
                      <span className="font-medium text-gray-900">{m.name}</span>
                      {m.submodules.length > 0 && (
                        <span className="text-gray-600">
                          {' — '}
                          {subNames.length ? subNames.join(', ') : 'No submodules selected'}
                        </span>
                      )}
                    </li>
                  )
                })}
            </ul>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Search */}
        <div className="mb-6 bg-white rounded-lg shadow p-6">
          <input
            type="text"
            placeholder="Search users by name, email, or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{u.full_name || u.username}</div>
                      <div className="text-sm text-gray-500">@{u.username}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {u.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {u.roles && u.roles.length > 0 ? (
                        u.roles.map(role => (
                          <span
                            key={role.id}
                            className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                          >
                            {role.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-400">No roles</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      u.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      {u.is_active ? (
                        <button
                          onClick={() => handleDeactivateUser(u.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivateUser(u.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try a different search term' : 'Get started by creating a new user.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          roles={roles}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateUser}
        />
      )}

      {/* Edit User Modal */}
      {selectedUser && (
        <EditUserModal
          user={selectedUser}
          roles={roles}
          company={company}
          productModules={productModules}
          onClose={() => setSelectedUser(null)}
          onUpdate={loadData}
        />
      )}
    </div>
  )
}

// Create User Modal Component
function CreateUserModal({
  roles,
  onClose,
  onSubmit,
}: {
  roles: Role[]
  onClose: () => void
  onSubmit: (data: CreateUserData) => Promise<void>
}) {
  const [formData, setFormData] = useState<CreateUserData>({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role_ids: [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      await onSubmit(formData)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleRole = (roleId: string) => {
    setFormData(prev => ({
      ...prev,
      role_ids: prev.role_ids?.includes(roleId)
        ? prev.role_ids.filter(id => id !== roleId)
        : [...(prev.role_ids || []), roleId]
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Create New User</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username*</label>
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email*</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password*</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assign Roles</label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-4">
              {roles.map((role) => (
                <label key={role.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={formData.role_ids?.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{role.name}</div>
                    {role.description && (
                      <div className="text-xs text-gray-500">{role.description}</div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Edit User Modal: Roles + Module Access (per-user restriction within company)
function EditUserModal({
  user,
  roles,
  company,
  productModules,
  onClose,
  onUpdate,
}: {
  user: User
  roles: Role[]
  company: Company | null
  productModules: ProductModule[]
  onClose: () => void
  onUpdate: () => void
}) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    user.roles?.map(r => r.id) || []
  )
  const [moduleAccessForm, setModuleAccessForm] = useState<Record<string, string[]>>(
    () => ({ ...(user.module_access || {}) })
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const companyModuleAccess = company?.module_access ?? {}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      await usersAPI.updateUser(user.id, {
        role_ids: selectedRoles,
        module_access: moduleAccessForm,
      })
      toast.success('User updated successfully')
      onUpdate()
      onClose()
    } catch (err: any) {
      const msg = err.response?.data?.module_access?.[0] ?? err.response?.data?.detail ?? 'Failed to update user'
      setError(typeof msg === 'string' ? msg : 'Failed to update user')
    } finally {
      setLoading(false)
    }
  }

  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev =>
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    )
  }

  const toggleModuleSub = (modId: string, subId: string) => {
    setModuleAccessForm((prev) => {
      const list = [...(prev[modId] ?? [])]
      const idx = list.indexOf(subId)
      if (idx === -1) list.push(subId)
      else list.splice(idx, 1)
      const next = { ...prev }
      next[modId] = list
      return next
    })
  }
  const setModuleSubs = (modId: string, subIds: string[]) => {
    setModuleAccessForm((prev) => ({ ...prev, [modId]: subIds }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Edit User — Roles &amp; Module Access</h2>
          <p className="text-sm text-gray-600 mt-1">{user.full_name || user.username}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-4">
              {roles.map((role) => (
                <label key={role.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{role.name}</div>
                    {role.description && (
                      <div className="text-xs text-gray-500">{role.description}</div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Module access</h3>
            <p className="text-xs text-gray-600 mb-3">
              Restrict this user to a subset of the company&apos;s modules. Leave a module unchecked to give full company access for that module.
            </p>
            {productModules
              .filter((m) => Object.prototype.hasOwnProperty.call(companyModuleAccess, m.id))
              .map((mod) => {
                const companySubs = companyModuleAccess[mod.id] ?? []
                const selectedSubs = moduleAccessForm[mod.id] ?? []
                const isRestricted = selectedSubs.length > 0 || (mod.submodules.length === 0 && mod.id in moduleAccessForm)
                const giveFullForModule = () => {
                  setModuleAccessForm((prev) => {
                    const next = { ...prev }
                    delete next[mod.id]
                    return next
                  })
                }
                const giveNoneForModule = () => setModuleAccessForm((prev) => ({ ...prev, [mod.id]: [] }))
                const giveAllCompanySubs = () => setModuleSubs(mod.id, [...companySubs])
                return (
                  <div key={mod.id} className="mb-4 border border-gray-200 rounded-lg p-3 bg-gray-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{mod.name}</span>
                      <div className="flex gap-2">
                        <button type="button" onClick={giveFullForModule} className="text-xs text-blue-600 hover:underline">
                          Full (company)
                        </button>
                        {mod.submodules.length > 0 && (
                          <>
                            <button type="button" onClick={giveAllCompanySubs} className="text-xs text-gray-600 hover:underline">
                              All
                            </button>
                            <button type="button" onClick={giveNoneForModule} className="text-xs text-gray-500 hover:underline">
                              None
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {mod.submodules.length === 0 ? (
                      <p className="text-xs text-gray-500">No submodules; access is per-module.</p>
                    ) : (
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {mod.submodules
                          .filter((s) => companySubs.includes(s.id))
                          .map((sub) => (
                            <label key={sub.id} className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedSubs.includes(sub.id)}
                                onChange={() => toggleModuleSub(mod.id, sub.id)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{sub.name}</span>
                            </label>
                          ))}
                      </div>
                    )}
                  </div>
                )
              })}
            {productModules.filter((m) => Object.prototype.hasOwnProperty.call(companyModuleAccess, m.id)).length === 0 && (
              <p className="text-sm text-gray-500">Company has no modules assigned.</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
