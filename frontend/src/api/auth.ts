import api from './axios'

export type UserType = 'SUPER' | 'CHILD' | 'COMPANY_ADMIN' | 'COMPANY_USER'

export interface Company {
  id: string
  name: string
  company_code: string
  email: string
  status: 'active' | 'inactive' | 'suspended' | 'pending'
  is_active: boolean
}

export interface Role {
  id: string
  name: string
  description?: string
  scope: 'global' | 'company'
}

export interface Permission {
  id: string
  name: string
  codename: string
  category: string
}

export interface LoginCredentials {
  username?: string
  email?: string
  password: string
}

export interface RegisterData {
  username: string
  email: string
  password: string
  password_confirm: string
  first_name?: string
  last_name?: string
}

export interface AuthResponse {
  user: {
    id: string
    username: string
    email: string
    first_name?: string
    last_name?: string
    full_name?: string
    is_super_admin?: boolean
    is_superuser?: boolean
    is_staff?: boolean
    user_type?: UserType
    company?: Company | null
    roles?: Role[]
    permissions?: Permission[]
  }
  access: string
  refresh: string
}

export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login/', credentials)
    return response.data
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register/', data)
    return response.data
  },

  logout: async (refreshToken: string): Promise<void> => {
    await api.post('/auth/logout/', { refresh: refreshToken })
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile/')
    return response.data
  },
}

