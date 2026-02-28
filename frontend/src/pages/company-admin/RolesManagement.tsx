import { useState, useEffect } from 'react'
import { rbacAPI, Role, Permission, CreateRoleData } from '../../api/rbac'
import toast from 'react-hot-toast'

export default function RolesManagement() {
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [rolesRes, permsRes] = await Promise.all([
        rbacAPI.getRoles(),
        rbacAPI.getPermissions(),
      ])
      const companyRoles = Array.isArray(rolesRes) 
        ? rolesRes.filter(r => r.scope === 'company' || !r.scope)
        : []
      setRoles(companyRoles)
      setPermissions(Array.isArray(permsRes) ? permsRes : (permsRes as any).results || [])
    } catch (err: any) {
      toast.error('Failed to load roles')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRole = async (data: CreateRoleData) => {
    try {
      await rbacAPI.createRole(data)
      toast.success('Role created successfully')
      setShowCreateModal(false)
      loadData()
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.name?.[0] || 'Failed to create role'
      toast.error(msg)
      throw new Error(msg)
    }
  }

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role? Users with this role will lose their permissions.')) return
    try {
      await rbacAPI.deleteRole(roleId)
      toast.success('Role deleted')
      loadData()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete role')
    }
  }

  // Group permissions by category
  const permissionsByResource = permissions.reduce((acc, p) => {
    const resource = p.category || 'Other'
    if (!acc[resource]) acc[resource] = []
    acc[resource].push(p)
    return acc
  }, {} as Record<string, Permission[]>)

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
          <h2 className="text-lg font-semibold text-gray-900">Roles & Permissions</h2>
          <p className="text-sm text-gray-500">Define access levels for your team</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Role
        </button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
            No roles created yet. Create your first role to define permissions.
          </div>
        ) : (
          roles.map((role) => (
            <div key={role.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{role.name}</h3>
                  {role.description && (
                    <p className="text-sm text-gray-500 mt-1">{role.description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setSelectedRole(role)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  {!(role as any).is_system_role && (
                    <button
                      onClick={() => handleDeleteRole(role.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {(role as any).is_system_role && (
                <span className="inline-block px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full mb-3">
                  System Role
                </span>
              )}

              <div className="border-t border-gray-100 pt-3 mt-3">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Permissions</p>
                {role.permissions && role.permissions.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.slice(0, 5).map((p: any) => (
                      <span key={p.id || p.codename} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                        {p.name || p.codename}
                      </span>
                    ))}
                    {role.permissions.length > 5 && (
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded">
                        +{role.permissions.length - 5} more
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">No permissions assigned</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Permissions Overview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Permissions</h3>
        <div className="space-y-4">
          {Object.entries(permissionsByResource).map(([resource, perms]) => (
            <div key={resource}>
              <h4 className="text-sm font-medium text-gray-700 mb-2">{resource}</h4>
              <div className="flex flex-wrap gap-2">
                {perms.map((p) => (
                  <span key={p.id} className="px-2.5 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg">
                    {p.name || p.codename}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <RoleModal
          permissions={permissions}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateRole}
        />
      )}

      {/* Edit Modal */}
      {selectedRole && (
        <RoleModal
          role={selectedRole}
          permissions={permissions}
          onClose={() => setSelectedRole(null)}
          onSubmit={async (data) => {
            try {
              await rbacAPI.updateRole(selectedRole.id, data)
              toast.success('Role updated')
              setSelectedRole(null)
              loadData()
            } catch (err: any) {
              toast.error(err.response?.data?.detail || 'Failed to update role')
              throw err
            }
          }}
        />
      )}
    </div>
  )
}

function RoleModal({
  role,
  permissions,
  onClose,
  onSubmit,
}: {
  role?: Role
  permissions: Permission[]
  onClose: () => void
  onSubmit: (data: CreateRoleData) => Promise<void>
}) {
  const [formData, setFormData] = useState({
    name: role?.name || '',
    description: role?.description || '',
    permission_ids: role?.permissions?.map((p: any) => p.id) || [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Group permissions by category
  const permissionsByResource = permissions.reduce((acc, p) => {
    const resource = p.category || 'Other'
    if (!acc[resource]) acc[resource] = []
    acc[resource].push(p)
    return acc
  }, {} as Record<string, Permission[]>)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSubmit({
        name: formData.name,
        description: formData.description,
        permission_ids: formData.permission_ids,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const togglePermission = (permId: string) => {
    if (formData.permission_ids.includes(permId)) {
      setFormData({ ...formData, permission_ids: formData.permission_ids.filter(id => id !== permId) })
    } else {
      setFormData({ ...formData, permission_ids: [...formData.permission_ids, permId] })
    }
  }

  const toggleResource = (perms: Permission[]) => {
    const allSelected = perms.every(p => formData.permission_ids.includes(p.id))
    if (allSelected) {
      setFormData({ ...formData, permission_ids: formData.permission_ids.filter(id => !perms.find(p => p.id === id)) })
    } else {
      const newIds = [...formData.permission_ids]
      perms.forEach(p => {
        if (!newIds.includes(p.id)) newIds.push(p.id)
      })
      setFormData({ ...formData, permission_ids: newIds })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">{role ? 'Edit Role' : 'Create New Role'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role Name *</label>
            <input
              type="text"
              required
              disabled={(role as any)?.is_system_role}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              placeholder="e.g., Data Analyst"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Describe what this role can do..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Permissions</label>
            <div className="space-y-4 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
              {Object.entries(permissionsByResource).map(([resource, perms]) => {
                const allSelected = perms.every(p => formData.permission_ids.includes(p.id))
                const someSelected = perms.some(p => formData.permission_ids.includes(p.id))
                return (
                  <div key={resource} className="border-b border-gray-100 pb-3 last:border-0">
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => el && (el.indeterminate = someSelected && !allSelected)}
                        onChange={() => toggleResource(perms)}
                        className="rounded text-blue-600"
                      />
                      <span className="font-medium text-gray-800">{resource}</span>
                      <span className="text-xs text-gray-400">({perms.length})</span>
                    </label>
                    <div className="ml-6 flex flex-wrap gap-2">
                      {perms.map((p) => (
                        <label key={p.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permission_ids.includes(p.id)}
                            onChange={() => togglePermission(p.id)}
                            className="rounded text-blue-600"
                          />
                          <span className="text-gray-600">{p.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {formData.permission_ids.length} permissions selected
            </p>
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
              {loading ? 'Saving...' : role ? 'Update Role' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
