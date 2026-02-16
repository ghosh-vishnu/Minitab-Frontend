import api from './axios'

export interface User {
  id: string
  username: string
  email: string
  first_name?: string
  last_name?: string
  full_name?: string
  user_type: 'SUPER' | 'CHILD' | 'COMPANY_USER'
  is_active: boolean
  company?: {
    id: string
    name: string
    company_code: string
  }
  roles?: Array<{
    id: string
    name: string
    description?: string
    scope: string
  }>
  /** Per-user module/submodule restriction. Empty = full company access. */
  module_access?: Record<string, string[]>
  created_at: string
  last_login?: string
}

export interface CreateUserData {
  username: string
  email: string
  password: string
  first_name?: string
  last_name?: string
  role_ids?: string[]  // Array of role IDs
}

export interface UpdateUserData {
  first_name?: string
  last_name?: string
  email?: string
  is_active?: boolean
  role_ids?: string[]
  module_access?: Record<string, string[]>
}

export const usersAPI = {
  // List users in company (Company Admin view)
  listCompanyUsers: async (params?: {
    page?: number
    page_size?: number
    search?: string
    is_active?: boolean
    ordering?: string
  }) => {
    const response = await api.get<{
      count: number
      next: string | null
      previous: string | null
      results: User[]
    }>('/rbac/users/', { params })
    return response.data
  },

  // Get single user
  getUser: async (id: string) => {
    const response = await api.get<User>(`/rbac/users/${id}/`)
    return response.data
  },

  // Create user (Company Admin creates company user)
  createUser: async (data: CreateUserData) => {
    const response = await api.post<User>('/rbac/users/', data)
    return response.data
  },

  // Update user
  updateUser: async (id: string, data: UpdateUserData) => {
    const response = await api.patch<User>(`/rbac/users/${id}/`, data)
    return response.data
  },

  // Delete (deactivate) user
  deleteUser: async (id: string) => {
    await api.delete(`/rbac/users/${id}/`)
  },

  // Activate user
  activateUser: async (id: string) => {
    const response = await api.post(`/rbac/users/${id}/activate/`)
    return response.data
  },

  // Deactivate user
  deactivateUser: async (id: string) => {
    const response = await api.post(`/rbac/users/${id}/deactivate/`)
    return response.data
  },

  // Assign roles to user
  assignRoles: async (userId: string, roleIds: string[]) => {
    const response = await api.post(`/rbac/users/${userId}/assign-roles/`, { role_ids: roleIds })
    return response.data
  },
}
