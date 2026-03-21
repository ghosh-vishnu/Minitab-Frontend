import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { rbacAPI, User, Role, Permission } from '../api/rbac'
import { authAPI } from '../api/auth'
import toast from 'react-hot-toast'
import ActivityLogs from '../components/ActivityLogs'
import { UserCircle, Activity, Users, Shield, Pencil, Mail } from 'lucide-react'

const Profile = () => {
  const { user: currentUser, updateUser } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'roles' | 'activity'>('profile')
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [editName, setEditName] = useState({ first_name: '', last_name: '' })

  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    is_active: true,
    role_ids: [] as string[],
  })

  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    is_active: true,
    permission_ids: [] as string[],
  })

  const isSuperAdmin = currentUser?.is_super_admin || currentUser?.is_superuser

  const getInitials = () => {
    if (currentUser?.first_name && currentUser?.last_name) {
      return `${currentUser.first_name[0]}${currentUser.last_name[0]}`.toUpperCase()
    }
    if (currentUser?.username) {
      return currentUser.username.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  const loadCurrentUserData = async () => {
    if (!currentUser?.id) return
    try {
      const userData = await rbacAPI.getUser(currentUser.id)
      if (userData) {
        updateUser(userData as Parameters<typeof updateUser>[0])
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Failed to load user data:', error)
      }
    }
  }

  useEffect(() => {
    if (currentUser?.id) loadCurrentUserData()
    if (isSuperAdmin) {
      loadRoles()
      loadPermissions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (activeTab === 'users' && isSuperAdmin) loadUsers()
    if (activeTab === 'roles' && isSuperAdmin) {
      loadRoles()
      loadPermissions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isSuperAdmin])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await rbacAPI.getUsers()
      setUsers(data)
    } catch (error: any) {
      toast.error('Failed to load users')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const loadRoles = async () => {
    try {
      setLoading(true)
      const data = await rbacAPI.getRoles()
      setRoles(data)
    } catch (error: any) {
      toast.error('Failed to load roles')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const loadPermissions = async () => {
    try {
      const data = await rbacAPI.getPermissions()
      setPermissions(data)
    } catch (error: any) {
      console.error(error)
    }
  }

  const handleUpdateProfile = async () => {
    try {
      const profile = await authAPI.updateProfile({
        first_name: editName.first_name.trim(),
        last_name: editName.last_name.trim(),
      })
      updateUser(profile as Parameters<typeof updateUser>[0])
      setShowEditProfile(false)
      toast.success('Profile updated')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update profile')
    }
  }

  const handleCreateUser = async () => {
    if (!userForm.username || !userForm.email || !userForm.password) {
      toast.error('Please fill all required fields')
      return
    }
    try {
      await rbacAPI.createUser(userForm)
      toast.success('User created successfully')
      setShowUserModal(false)
      setUserForm({ username: '', email: '', password: '', first_name: '', last_name: '', is_active: true, role_ids: [] })
      loadUsers()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create user')
    }
  }

  const handleUpdateUser = async () => {
    if (!selectedUser) return
    try {
      const { password, ...updateData } = userForm
      await rbacAPI.updateUser(selectedUser.id, updateData)
      toast.success('User updated successfully')
      setShowUserModal(false)
      setSelectedUser(null)
      loadUsers()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update user')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return
    try {
      await rbacAPI.deleteUser(userId)
      toast.success('User deactivated successfully')
      loadUsers()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to deactivate user')
    }
  }

  const handleCreateRole = async () => {
    if (!roleForm.name) {
      toast.error('Please enter role name')
      return
    }
    try {
      await rbacAPI.createRole(roleForm)
      toast.success('Role created successfully')
      setShowRoleModal(false)
      setRoleForm({ name: '', description: '', is_active: true, permission_ids: [] })
      loadRoles()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create role')
    }
  }

  const handleUpdateRole = async () => {
    if (!selectedRole) return
    try {
      await rbacAPI.updateRole(selectedRole.id, roleForm)
      toast.success('Role updated successfully')
      setShowRoleModal(false)
      setSelectedRole(null)
      loadRoles()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update role')
    }
  }

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return
    try {
      await rbacAPI.deleteRole(roleId)
      toast.success('Role deleted successfully')
      loadRoles()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete role')
    }
  }

  const openEditUser = (user: User) => {
    setSelectedUser(user)
    setUserForm({
      username: user.username,
      email: user.email,
      password: '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      is_active: user.is_active,
      role_ids: user.roles?.map(r => r.id) || [],
    })
    setShowUserModal(true)
  }

  const openEditRole = (role: Role) => {
    setSelectedRole(role)
    setRoleForm({
      name: role.name,
      description: role.description || '',
      is_active: role.is_active,
      permission_ids: role.permissions?.map(p => p.id) || [],
    })
    setShowRoleModal(true)
  }

  const openEditProfile = () => {
    setEditName({
      first_name: currentUser?.first_name || '',
      last_name: currentUser?.last_name || '',
    })
    setShowEditProfile(true)
  }

  const tabs = [
    { id: 'profile' as const, label: 'My Profile', icon: UserCircle },
    ...(isSuperAdmin ? [
      { id: 'users' as const, label: 'User Management', icon: Users },
      { id: 'roles' as const, label: 'Roles & Permissions', icon: Shield },
    ] : []),
    { id: 'activity' as const, label: 'Activity Logs', icon: Activity },
  ]

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Page Header */}
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Profile & Settings</h1>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {!currentUser ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-slate-600 mb-4" />
                <p className="text-slate-500">Loading profile...</p>
              </div>
            ) : (
              <div className="p-8">
                {/* Profile Hero */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8 pb-8 border-b border-slate-100">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-emerald-500/20">
                    {getInitials()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-slate-900 mb-1">
                      {currentUser.first_name || currentUser.last_name
                        ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim()
                        : currentUser.username || currentUser.email || 'Add your name'}
                    </h2>
                    {!(currentUser.first_name || currentUser.last_name) && (
                      <p className="text-xs text-slate-400 mb-1">Click Edit Profile to add your name</p>
                    )}
                    <p className="text-slate-500 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {currentUser.email}
                    </p>
                    <button
                      onClick={openEditProfile}
                      className="mt-3 flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit Profile
                    </button>
                  </div>
                </div>

                {/* Profile Details */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Username</label>
                    <p className="text-slate-900 font-medium">{currentUser.username || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Email</label>
                    <p className="text-slate-900 font-medium">{currentUser.email || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Roles</label>
                    <div className="flex flex-wrap gap-2">
                      {currentUser.roles && currentUser.roles.length > 0 ? (
                        currentUser.roles.map((role) => (
                          <span
                            key={role.id}
                            className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700"
                          >
                            {role.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-400">No roles assigned</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && isSuperAdmin && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-900">User Management</h2>
              <button
                onClick={() => {
                  setSelectedUser(null)
                  setUserForm({ username: '', email: '', password: '', first_name: '', last_name: '', is_active: true, role_ids: [] })
                  setShowUserModal(true)
                }}
                className="px-4 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
              >
                Create User
              </button>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-600 mx-auto" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Username</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Roles</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{user.username}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{user.email}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {user.roles?.map((r) => (
                              <span key={r.id} className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">{r.name}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${user.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 flex gap-2">
                          <button onClick={() => openEditUser(user)} className="text-sm font-medium text-slate-600 hover:text-slate-900">Edit</button>
                          <button onClick={() => handleDeleteUser(user.id)} className="text-sm font-medium text-red-600 hover:text-red-700">Deactivate</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Roles Tab */}
        {activeTab === 'roles' && isSuperAdmin && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-900">Roles & Permissions</h2>
              <button
                onClick={() => {
                  setSelectedRole(null)
                  setRoleForm({ name: '', description: '', is_active: true, permission_ids: [] })
                  setShowRoleModal(true)
                }}
                className="px-4 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
              >
                Create Role
              </button>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-600 mx-auto" />
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {roles.map((role) => (
                  <div key={role.id} className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-900">{role.name}</h3>
                      <p className="text-sm text-slate-500 mt-1">{role.description}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {role.permissions?.map((p) => (
                          <span key={p.id} className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">{p.name}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => openEditRole(role)} className="px-3 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800">Edit</button>
                      <button onClick={() => handleDeleteRole(role.id)} className="px-3 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Activity Logs Tab */}
        {activeTab === 'activity' && (
          <div className="rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm">
            <ActivityLogs />
          </div>
        )}

        {/* Edit Profile Modal */}
        {showEditProfile && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Edit Profile</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={editName.first_name}
                    onChange={(e) => setEditName({ ...editName, first_name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editName.last_name}
                    onChange={(e) => setEditName({ ...editName, last_name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3 justify-end">
                <button onClick={() => setShowEditProfile(false)} className="px-4 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button onClick={handleUpdateProfile} className="px-4 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800">
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Modal */}
        {showUserModal && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl">
              <h3 className="text-lg font-semibold mb-4">{selectedUser ? 'Edit User' : 'Create User'}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Username *</label>
                  <input
                    type="text"
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl"
                    disabled={!!selectedUser}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                {!selectedUser && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                    <input
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={userForm.first_name}
                    onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={userForm.last_name}
                    onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Roles</label>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-3 space-y-2">
                    {roles.map((role) => (
                      <label key={role.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={userForm.role_ids.includes(role.id)}
                          onChange={(e) => {
                            if (e.target.checked) setUserForm({ ...userForm, role_ids: [...userForm.role_ids, role.id] })
                            else setUserForm({ ...userForm, role_ids: userForm.role_ids.filter(id => id !== role.id) })
                          }}
                          className="mr-2 rounded"
                        />
                        <span className="text-sm">{role.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <label className="flex items-center">
                  <input type="checkbox" checked={userForm.is_active} onChange={(e) => setUserForm({ ...userForm, is_active: e.target.checked })} className="mr-2 rounded" />
                  <span className="text-sm font-medium text-slate-700">Active</span>
                </label>
              </div>
              <div className="mt-6 flex gap-3 justify-end">
                <button onClick={() => { setShowUserModal(false); setSelectedUser(null) }} className="px-4 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                <button onClick={selectedUser ? handleUpdateUser : handleCreateUser} className="px-4 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800">{selectedUser ? 'Update' : 'Create'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Role Modal */}
        {showRoleModal && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
              <h3 className="text-lg font-semibold mb-4">{selectedRole ? 'Edit Role' : 'Create Role'}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role Name *</label>
                  <input
                    type="text"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    value={roleForm.description}
                    onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Permissions</label>
                  <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl p-3">
                    {Object.entries(
                      permissions.reduce((acc, p) => {
                        if (!acc[p.category]) acc[p.category] = []
                        acc[p.category].push(p)
                        return acc
                      }, {} as Record<string, Permission[]>)
                    ).map(([cat, perms]) => (
                      <div key={cat} className="mb-4">
                        <h4 className="font-medium text-sm text-slate-700 mb-2 capitalize">{cat}</h4>
                        <div className="space-y-1">
                          {perms.map((p) => (
                            <label key={p.id} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={roleForm.permission_ids.includes(p.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setRoleForm({ ...roleForm, permission_ids: [...roleForm.permission_ids, p.id] })
                                  else setRoleForm({ ...roleForm, permission_ids: roleForm.permission_ids.filter(id => id !== p.id) })
                                }}
                                className="mr-2 rounded"
                              />
                              <span className="text-sm">{p.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex gap-3 justify-end">
                <button onClick={() => { setShowRoleModal(false); setSelectedRole(null) }} className="px-4 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                <button onClick={selectedRole ? handleUpdateRole : handleCreateRole} className="px-4 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800">{selectedRole ? 'Update' : 'Create'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile
