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

/** Login API response: token + access timing + optional full company. Use access token for Create Company and other APIs. */
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
    /** Permissions - login returns [{codename}] only; profile may return full. */
    permissions?: { codename: string }[] | Permission[]
  }
  /** Full company details (license_key, total_user_access, etc.) when user has company. */
  company?: Record<string, unknown> | null
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
   * Step 1: Verify email and password only (without license key).
   * Returns success if credentials are valid.
   */
  verifyCredentials: async (email: string, password: string): Promise<{
    valid: boolean
    user_type: string
    email: string
    company_name?: string
    message: string
  }> => {
    const response = await api.post('/auth/verify-credentials/', { email, password })
    return response.data
  },

  /**
   * Login (2-step): use user_type from verify-credentials to choose flow.
   *
   * - userType === 'backend'  → direct Backend company-user-login.
   * - otherwise (license_server / unknown) → try License Server login, and if that
   *   returns 401 then automatically fall back to Backend company-user-login.
   *
   * Returns Backend JWT for all subsequent API calls.
   */
  login: async (
    credentials: LoginCredentials,
    userType?: string
  ): Promise<AuthResponse> => {
    const hasLicenseKey = Boolean(credentials.license_key)
    const email = credentials.email ?? ''
    const password = credentials.password ?? ''

    // Company user branch – never hit License Server
    if (userType === 'backend' && hasLicenseKey) {
      const backendRes = await api.post<AuthResponse>('/auth/company-user-login/', {
        email,
        password,
        license_key: credentials.license_key,
      })
      return backendRes.data
    }

    // Default / license_server branch – try License Server then fall back to Backend
    try {
      const lsRes = await licenseServerApi.post<AuthResponse>('/auth/login/', {
        email,
        password,
        license_key: credentials.license_key,
      })
      const backendRes = await api.post<AuthResponse>('/auth/sync-license-session/', {
        access: lsRes.data.access,
      })
      return backendRes.data
    } catch (lsErr: any) {
      if (lsErr.response?.status === 401 && hasLicenseKey) {
        const backendRes = await api.post<AuthResponse>('/auth/company-user-login/', {
          email,
          password,
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

