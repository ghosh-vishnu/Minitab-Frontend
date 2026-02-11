import api from './axios'

export interface Company {
  id: string
  name: string
  company_code: string
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
  primary_admin?: {
    id: string
    username: string
    email: string
    full_name?: string
  }
  subscription?: {
    id: string
    plan: {
      id: string
      name: string
      tier: string
    }
    status: string
    start_date: string
    end_date: string
    is_active: boolean
  }
  settings?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface CreateCompanyData {
  name: string
  email: string
  phone?: string
  address?: string
  website?: string
  max_users: number
  admin_username: string
  admin_email: string
  admin_password: string
  admin_first_name?: string
  admin_last_name?: string
}

export interface UpdateCompanyData {
  name?: string
  email?: string
  phone?: string
  address?: string
  website?: string
  status?: 'active' | 'inactive' | 'suspended' | 'pending'
  is_active?: boolean
  settings?: Record<string, any>
}

export interface AssignSubscriptionData {
  plan_id: string
  start_date?: string
  end_date?: string
}

export interface CompanyStats {
  total_users: number
  active_users: number
  total_spreadsheets: number
  storage_used_mb: number
  subscription_status: string
  user_limit: number
  spreadsheet_limit: number
  storage_limit_mb: number
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

  // Get single company details
  getCompany: async (id: string) => {
    const response = await api.get<Company>(`/companies/${id}/`)
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

  // Get company statistics
  getCompanyStats: async (companyId: string) => {
    const response = await api.get<CompanyStats>(`/companies/${companyId}/stats/`)
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
}
