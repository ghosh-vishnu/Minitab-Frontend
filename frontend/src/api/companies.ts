import api from './axios'

export interface Company {
  id: string
  name: string
  company_code: string
  /** Software license key (LICENSE ID) from License Server, e.g. Y2R680FJJRZ. Distinct from company_code. */
  license_key?: string | null
  /** Total user access (licensed user limit) from License Server. */
  total_user_access?: number | null
  /** License expiration date (ISO string). */
  license_expiration_date?: string | null
  /** Company license / business ID (GST No, CIN). Not a system-generated license key. */
  GST_NO?: string | null
  email: string
  phone?: string
  address?: string
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
  website?: string
  status: 'active' | 'inactive' | 'suspended' | 'pending'
  is_active: boolean
  /** Present when fetched with ?view=minimal (View Company modal). */
  time_zone?: string | null
  primary_admin?: {
    id: string
    username: string
    email: string
    full_name?: string
  }
  /** Active users count (from Backend). */
  active_users_count?: number
  subscription?: {
    id: string
    plan: {
      id: string
      name: string
      tier?: string
    }
    status: string
    start_date: string
    end_date: string
    is_active: boolean
    user_limit?: number
    current_users?: number
    max_users?: number | null
    max_spreadsheets?: number | null
    max_storage_mb?: number | null
  }
  settings?: Record<string, any>
  module_access?: Record<string, string[]>
  effective_module_access?: Record<string, string[]>
  created_at: string
  updated_at: string
}

/** Create Company payload for Super Admin dashboard (matches Create Company modal). */
export interface CreateCompanyData {
  /** Company name */
  name: string
  /** Company email */
  email: string
  /** Mobile number */
  phone?: string
  /** Location / address */
  address?: string
  /** Region (maps to state) */
  state?: string
  /** Country */
  country?: string
  /** IANA time zone e.g. Asia/Kolkata */
  time_zone?: string
  /** Company GST No / CIN (sent as GST_NO to API). */
  tax_id?: string
  website?: string
  max_users: number
  /** If omitted, backend derives from admin_email */
  admin_username?: string
  admin_email: string
  admin_password: string
  /** Must match admin_password */
  admin_confirm_password: string
  admin_first_name?: string
  admin_last_name?: string
  subscription_duration_months?: number
  subscription_end_date?: string
  module_access?: Record<string, string[]>
}

export interface UpdateCompanyData {
  name?: string
  email?: string
  phone?: string
  address?: string
  state?: string
  country?: string
  website?: string
  GST_NO?: string
  status?: 'active' | 'inactive' | 'suspended' | 'pending'
  is_active?: boolean
  settings?: Record<string, any>
  module_access?: Record<string, string[]>
  /** Reset primary admin password. Both required to reset. */
  admin_new_password?: string
  admin_confirm_password?: string
}

export interface AssignSubscriptionData {
  plan_id: string
  start_date?: string
  end_date?: string
}

export interface UpdateSubscriptionFeaturesData {
  max_users: number
  max_spreadsheets?: number | null
  max_storage_mb?: number | null
}

export interface CompanyStats {
  total_users: number
  active_users: number
  subscription_status?: string
  user_limit: number
  remaining_slots?: number
  inactive_users?: number
  subscription_days_remaining?: number
  subscription_end_date?: string | null
}

export const companiesAPI = {
  // List all companies (Super Admin only)
  listCompanies: async (params?: {
    page?: number
    page_size?: number
    search?: string
    status?: string
    ordering?: string
  }) => {
    const response = await api.get<{
      count: number
      next: string | null
      previous: string | null
      results: Company[]
    }>('/companies/', { params })
    return response.data
  },

  // Get single company details. Pass { view: 'minimal' } for View Company modal (fewer fields).
  getCompany: async (id: string, params?: { view?: 'minimal' }) => {
    const response = await api.get<Company>(`/companies/${id}/`, { params })
    return response.data
  },

  // Create new company (Super Admin only)
  createCompany: async (data: CreateCompanyData) => {
    const response = await api.post<Company>('/companies/', data)
    return response.data
  },

  // Update company
  updateCompany: async (id: string, data: UpdateCompanyData) => {
    const response = await api.patch<Company>(`/companies/${id}/`, data)
    return response.data
  },

  // Delete company (soft delete)
  deleteCompany: async (id: string) => {
    await api.delete(`/companies/${id}/`)
  },

  // Assign subscription to company
  assignSubscription: async (companyId: string, data: AssignSubscriptionData) => {
    const response = await api.post(`/companies/${companyId}/assign-subscription/`, data)
    return response.data
  },

  // Update subscription features (e.g. licensed user count)
  updateSubscriptionFeatures: async (
    companyId: string,
    data: UpdateSubscriptionFeaturesData
  ): Promise<Company> => {
    const response = await api.post<Company>(
      `/companies/${companyId}/update-subscription-features/`,
      data
    )
    return response.data
  },

  // Get company statistics (uses current user's company; no companyId in URL)
  getCompanyStats: async () => {
    const response = await api.get<CompanyStats>('/companies/stats/')
    return response.data
  },

  // Suspend company
  suspendCompany: async (companyId: string, reason?: string) => {
    const response = await api.post(`/companies/${companyId}/suspend/`, { reason })
    return response.data
  },

  // Activate company
  activateCompany: async (companyId: string) => {
    const response = await api.post(`/companies/${companyId}/activate/`)
    return response.data
  },

  // Get current user's company (for company admins/users)
  getMyCompany: async () => {
    const response = await api.get<Company>('/companies/my-company/')
    return response.data
  },

  // Get product modules and submodules for company create/edit (Super Admin)
  getProductModules: async () => {
    const response = await api.get<ProductModule[]>('/companies/product-modules/')
    return response.data
  },
}

export interface ProductSubmodule {
  id: string
  name: string
}

export interface ProductModule {
  id: string
  name: string
  description?: string
  submodules: ProductSubmodule[]
}
