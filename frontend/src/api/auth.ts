import api from './axios'
import { licenseServerApi } from './licenseServerApi'

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
  /** Required for company login (Company Admin / Company User). Must match a SoftwareLicense for their company. Ignored for Super Admin. */
  license_key?: string
}

export interface RegisterData {
  username: string
  email: string
  password: string
  password_confirm: string
  first_name?: string
  last_name?: string
}

/** Login API response: token + access timing. Use access token for Create Company and other APIs. */
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
  /** JWT access token – send in Authorization: Bearer <access> for Create Company etc. */
  access: string
  /** JWT refresh token – use to get new access token when expired */
  refresh: string
  /** When the access token expires (ISO datetime). Shown in UI / used for refresh logic. */
  access_expires_at?: string | null
  /** Access token validity in seconds (e.g. 3600 for 1 hour). */
  expires_in?: number | null
}

export const authAPI = {
  /**
   * Login: 1) License Server (company admin) -> sync to Backend.
   * 2) If License Server 401, try Backend company-user-login (users created by company admin).
   * Returns Backend JWT for all subsequent API calls.
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const lsRes = await licenseServerApi.post<AuthResponse>('/auth/login/', credentials)
      const lsData = lsRes.data
      const backendRes = await api.post<AuthResponse>('/auth/sync-license-session/', {
        access: lsData.access,
      })
      return backendRes.data
    } catch (lsErr: any) {
      if (lsErr.response?.status === 401 && credentials.email && credentials.license_key) {
        const backendRes = await api.post<AuthResponse>('/auth/company-user-login/', {
          email: credentials.email,
          password: credentials.password,
          license_key: credentials.license_key,
        })
        return backendRes.data
      }
      throw lsErr
    }
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

