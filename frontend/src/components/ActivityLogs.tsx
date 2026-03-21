import { useState, useEffect } from 'react'
import { rbacAPI, ActivityLog, User } from '../api/rbac'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

const ActivityLogs = () => {
  const { user: currentUser } = useAuthStore()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    user: '',
    action_type: '',
    model_name: '',
    days: 7,
  })
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [users, setUsers] = useState<User[]>([])

  const isSuperAdmin = currentUser?.is_super_admin || currentUser?.is_superuser
  
  // Ensure logs is always an array (defensive programming)
  const safeLogs = Array.isArray(logs) ? logs : []

  useEffect(() => {
    loadLogs()
    if (isSuperAdmin) {
      loadUsers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, selectedUserId, isSuperAdmin])

  const loadUsers = async () => {
    try {
      const data = await rbacAPI.getUsers()
      setUsers(data)
    } catch (error) {
      console.error('Failed to load users:', error)
    }
  }

  const loadLogs = async () => {
    try {
      setLoading(true)
      let data: ActivityLog[] | any

      if (filters.days > 0) {
        data = await rbacAPI.getRecentActivityLogs(filters.days)
      } else if (selectedUserId) {
        data = await rbacAPI.getActivityLogsByUser(selectedUserId)
      } else {
        const params: any = {}
        if (filters.user) params.user = filters.user
        if (filters.action_type) params.action_type = filters.action_type
        if (filters.model_name) params.model_name = filters.model_name
        data = await rbacAPI.getActivityLogs(params)
      }

      // Ensure data is always an array
      if (Array.isArray(data)) {
        setLogs(data)
      } else if (data && Array.isArray(data.results)) {
        // Handle paginated response
        setLogs(data.results)
      } else if (data && Array.isArray(data.data)) {
        // Handle nested data response
        setLogs(data.data)
      } else {
        console.warn('Activity logs API returned non-array data:', data)
        setLogs([])
      }
    } catch (error: any) {
      console.error('Failed to load activity logs:', error)
      // Don't show error toast for 404 or empty responses
      if (error.response?.status !== 404) {
        toast.error('Failed to load activity logs')
      }
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'create':
        return 'bg-green-100 text-green-800'
      case 'update':
        return 'bg-blue-100 text-blue-800'
      case 'delete':
        return 'bg-red-100 text-red-800'
      case 'login':
        return 'bg-purple-100 text-purple-800'
      case 'logout':
        return 'bg-gray-100 text-gray-800'
      case 'export':
        return 'bg-yellow-100 text-yellow-800'
      case 'import':
        return 'bg-indigo-100 text-indigo-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="bg-white">
      <div className="p-6 border-b border-slate-100">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Activity Logs</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {isSuperAdmin && (
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">User</label>
              <select
                value={selectedUserId}
                onChange={(e) => {
                  setSelectedUserId(e.target.value)
                  if (e.target.value) setFilters({ ...filters, user: e.target.value, days: 0 })
                  else setFilters({ ...filters, user: '', days: 7 })
                }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">All Users</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Action Type</label>
            <select
              value={filters.action_type}
              onChange={(e) => setFilters({ ...filters, action_type: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="export">Export</option>
              <option value="import">Import</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Model</label>
            <select
              value={filters.model_name}
              onChange={(e) => setFilters({ ...filters, model_name: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">All Models</option>
              <option value="Spreadsheet">Spreadsheet</option>
              <option value="Cell">Cell</option>
              <option value="User">User</option>
              <option value="Role">Role</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Last N Days</label>
            <select
              value={filters.days}
              onChange={(e) => {
                setFilters({ ...filters, days: parseInt(e.target.value) })
                setSelectedUserId('')
              }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="1">Last 1 Day</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="0">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-600" />
        </div>
      ) : safeLogs.length === 0 ? (
        <div className="p-12 text-center text-slate-500">No activity logs found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Model</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {safeLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatDate(log.created_at)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{log.user_username || log.user_email || 'System'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${getActionColor(log.action_type)}`}>
                      {log.action_type_display || log.action_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{log.model_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-900">{log.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{log.ip_address || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ActivityLogs

