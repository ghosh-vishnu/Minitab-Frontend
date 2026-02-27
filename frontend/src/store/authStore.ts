import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { clearLicenseCheckPassed } from '../utils/licenseCheck'

export type UserType = 'SUPER' | 'CHILD' | 'COMPANY_ADMIN' | 'COMPANY_USER'

export interface Company {
  id: string
  name: string
  company_code: string
  email: string
  status: 'active' | 'inactive' | 'suspended' | 'pending'
  is_active: boolean
  /** Set when getMyCompany is fetched; used to filter modules/submodules by company access */
  module_access?: Record<string, string[]>
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

interface User {
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

/** Full company details from getMyCompany (includes effective_module_access for UI filtering) */
export interface CompanyDetail {
  id: string
  name: string
  company_code?: string
  email?: string
  status?: string
  is_active?: boolean
  module_access?: Record<string, string[]>
  /** Current user's effective access (company ∩ user restriction). Use for filtering UI. */
  effective_module_access?: Record<string, string[]>
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  /** Company with module_access; set when getMyCompany is fetched (dashboard / minitab) */
  companyDetail: CompanyDetail | null
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  logout: () => void
  updateUser: (user: User) => void
  setCompanyDetail: (company: CompanyDetail | null) => void
  // Helper methods
  isSuperAdmin: () => boolean
  isCompanyAdmin: () => boolean
  isCompanyUser: () => boolean
  hasPermission: (codename: string) => boolean
  hasRole: (roleName: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      companyDetail: null,
      setAuth: (user, accessToken, refreshToken) => {
        // Normalize user type for backward compatibility
        if (user && user.user_type === 'CHILD' as any) {
          user.user_type = 'COMPANY_ADMIN'
        }
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        })
      },
      logout: () => {
        clearLicenseCheckPassed()
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          companyDetail: null,
        })
      },
      updateUser: (user) => set({ user }),
      setCompanyDetail: (company) => set({ companyDetail: company }),
      
      // Helper methods
      isSuperAdmin: () => {
        const { user } = get()
        return user?.is_superuser === true || user?.is_staff === true || user?.user_type === 'SUPER'
      },
      
      isCompanyAdmin: () => {
        const { user } = get()
        if (!user || !user.company) return false
        // Check if user is primary admin of their company or has admin role
        return user.user_type === 'COMPANY_ADMIN' || user.user_type === 'CHILD' || user.roles?.some(role => 
          role.name.toLowerCase().includes('admin') && role.scope === 'company'
        ) || false
      },
      
      isCompanyUser: () => {
        const { user } = get()
        if (!user || !user.company) return false
        return user.user_type === 'COMPANY_USER'
      },
      
      hasPermission: (codename: string) => {
        const { user } = get()
        if (!user) return false
        // Super admin has all permissions
        if (get().isSuperAdmin()) return true
        // Company admin has all permissions (matches backend)
        if (get().isCompanyAdmin()) return true
        if (user.permissions?.some(p => p.codename === codename)) return true
        // Company user with no roles (empty permissions): default viewer access so dashboard loads
        const defaultViewer = ['view_spreadsheet', 'export_spreadsheet', 'view_analysis', 'view_chart', 'access_statistical_software']
        if (user.company && (!user.permissions || user.permissions.length === 0) && defaultViewer.includes(codename)) return true
        return false
      },
      
      hasRole: (roleName: string) => {
        const { user } = get()
        if (!user) return false
        return user.roles?.some(r => r.name.toLowerCase() === roleName.toLowerCase()) || false
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: any, _version: number) => {
        // Handle migration of old user types
        if (persistedState?.user?.user_type === 'CHILD') {
          persistedState.user.user_type = 'COMPANY_ADMIN'
        }
        return persistedState
      },
    }
  )
)

