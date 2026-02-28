import { useState, useEffect } from 'react'
import { usersAPI, User, CreateUserData } from '../../api/users'
import { rbacAPI, Role } from '../../api/rbac'
import { companiesAPI, CompanyStats } from '../../api/companies'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

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

export default function UserManagement() {
  const { user } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [stats, setStats] = useState<CompanyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [usersRes, rolesRes, statsRes] = await Promise.all([
        usersAPI.listCompanyUsers({ ordering: '-date_joined' }),
        rbacAPI.getRoles().then(roles => ({
          results: Array.isArray(roles) ? roles.filter(r => r.scope === 'company' || !r.scope) : [],
        })),
        user?.company ? companiesAPI.getCompanyStats() : Promise.resolve(null),
      ])
      setUsers(usersRes.results)
      setRoles(rolesRes.results)
      setStats(statsRes)
    } catch (err: any) {
      toast.error('Failed to load users')
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
      toast.success('User created successfully')
      loadData()
    } catch (err: any) {
      const msg = formatApiError(err)
      toast.error(msg)
      throw new Error(msg)
    }
  }

  const handleDeactivateUser = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return
    try {
      await usersAPI.deactivateUser(userId)
      toast.success('User deactivated')
      loadData()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to deactivate user')
    }
  }

  const handleActivateUser = async (userId: string) => {
    try {
      await usersAPI.activateUser(userId)
      toast.success('User activated')
      loadData()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to activate user')
    }
  }

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const isUserLimitReached = stats ? stats.total_users >= stats.user_limit : false

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Users</h2>
          <p className="text-sm text-gray-500">
            {stats ? `${stats.total_users} of ${stats.user_limit} users` : 'Manage your team members'}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={isUserLimitReached}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add User
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search users by name, email, or username..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Roles</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  {searchTerm ? 'No users found matching your search.' : 'No users yet. Create your first user.'}
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-medium">
                          {(u.full_name || u.username || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{u.full_name || u.username}</p>
                        <p className="text-sm text-gray-500">@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                  <td className="px-6 py-4">
                    {u.roles && u.roles.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r: any) => (
                          <span
                            key={r.id || r.name}
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              r.name === 'Admin' || r.name === 'Super Admin'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {r.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No roles</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Edit
                      </button>
                      {u.is_active ? (
                        <button
                          onClick={() => handleDeactivateUser(u.id)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivateUser(u.id)}
                          className="text-green-600 hover:text-green-700 text-sm font-medium"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
          onClose={() => setSelectedUser(null)}
          onSave={() => {
            setSelectedUser(null)
            loadData()
          }}
        />
      )}
    </div>
  )
}

function CreateUserModal({
  roles,
  onClose,
  onSubmit,
}: {
  roles: Role[]
  onClose: () => void
  onSubmit: (data: CreateUserData) => Promise<void>
}) {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    password_confirm: '',
    full_name: '',
    role_ids: [] as string[],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.password_confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onSubmit({
        email: formData.email,
        username: formData.username,
        password: formData.password,
        first_name: formData.full_name.split(' ')[0] || formData.full_name,
        last_name: formData.full_name.split(' ').slice(1).join(' ') || '',
        role_ids: formData.role_ids,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Create New User</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm *</label>
              <input
                type="password"
                required
                value={formData.password_confirm}
                onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Roles</label>
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200">
                  <input
                    type="checkbox"
                    checked={formData.role_ids.includes(r.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, role_ids: [...formData.role_ids, r.id] })
                      } else {
                        setFormData({ ...formData, role_ids: formData.role_ids.filter((id) => id !== r.id) })
                      }
                    }}
                    className="rounded text-blue-600"
                  />
                  <span className="text-sm">{r.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditUserModal({
  user,
  roles,
  onClose,
  onSave,
}: {
  user: User
  roles: Role[]
  onClose: () => void
  onSave: () => void
}) {
  const [formData, setFormData] = useState({
    full_name: user.full_name || '',
    role_ids: user.roles?.map((r: any) => r.id) || [],
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await usersAPI.updateUser(user.id, {
        first_name: formData.full_name.split(' ')[0] || formData.full_name,
        last_name: formData.full_name.split(' ').slice(1).join(' ') || '',
        role_ids: formData.role_ids,
      })
      toast.success('User updated')
      onSave()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Edit User</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Roles</label>
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200">
                  <input
                    type="checkbox"
                    checked={formData.role_ids.includes(r.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, role_ids: [...formData.role_ids, r.id] })
                      } else {
                        setFormData({ ...formData, role_ids: formData.role_ids.filter((id) => id !== r.id) })
                      }
                    }}
                    className="rounded text-blue-600"
                  />
                  <span className="text-sm">{r.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
