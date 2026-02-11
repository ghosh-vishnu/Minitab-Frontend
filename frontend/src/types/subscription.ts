/**
 * Subscription and Plan types for the application
 */

export type PlanType = 'FREE' | 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE'

export type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'cancelled' | 'suspended'

export type BillingCycle = 'monthly' | 'quarterly' | 'yearly' | 'custom'

export interface PlanFeatures {
  advanced_analytics?: boolean
  custom_charts?: boolean
  api_access?: boolean
  priority_support?: boolean
  data_export?: boolean
  collaboration?: boolean
  custom_branding?: boolean
  sso?: boolean
  audit_logs?: boolean
  [key: string]: boolean | undefined
}

export interface SubscriptionPlan {
  id: string
  name: string
  slug: string
  description?: string
  max_users: number
  max_spreadsheets: number
  max_storage_mb: number
  features: PlanFeatures
  price: string
  currency: string
  billing_cycle: BillingCycle
  is_active: boolean
  is_public: boolean
  display_order: number
  active_subscriptions_count?: number
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  company: string
  company_name?: string
  company_code?: string
  plan: string
  plan_name?: string
  status: SubscriptionStatus
  start_date: string
  end_date: string
  trial_end_date?: string | null
  max_users?: number | null
  max_spreadsheets?: number | null
  max_storage_mb?: number | null
  custom_features?: PlanFeatures
  effective_limits?: {
    max_users: number
    max_spreadsheets: number
    max_storage_mb: number
    features: PlanFeatures
  }
  amount_paid: string
  currency: string
  payment_reference?: string | null
  auto_renew: boolean
  notes?: string | null
  created_by?: string | null
  created_by_username?: string
  days_remaining?: number
  is_active_subscription?: boolean
  created_at: string
  updated_at: string
  activated_at?: string | null
  cancelled_at?: string | null
}

export interface SubscriptionHistory {
  id: string
  subscription: string
  action: 'created' | 'updated' | 'upgraded' | 'downgraded' | 'cancelled' | 'renewed' | 'expired'
  old_plan?: string | null
  old_plan_name?: string
  new_plan?: string | null
  new_plan_name?: string
  notes?: string
  performed_by?: string | null
  performed_by_username?: string
  metadata?: Record<string, any>
  created_at: string
}

export interface CreateSubscriptionData {
  company: string
  plan: string
  status?: SubscriptionStatus
  start_date: string
  end_date: string
  trial_end_date?: string | null
  max_users?: number | null
  max_spreadsheets?: number | null
  max_storage_mb?: number | null
  custom_features?: PlanFeatures
  amount_paid?: string
  currency?: string
  payment_reference?: string | null
  auto_renew?: boolean
  notes?: string | null
}

export interface UpdateSubscriptionData {
  plan?: string
  status?: SubscriptionStatus
  start_date?: string
  end_date?: string
  trial_end_date?: string | null
  max_users?: number | null
  max_spreadsheets?: number | null
  max_storage_mb?: number | null
  custom_features?: PlanFeatures
  amount_paid?: string
  currency?: string
  payment_reference?: string | null
  auto_renew?: boolean
  notes?: string | null
}

export interface SubscriptionStatusResponse {
  subscription_id: string
  is_active: boolean
  status: SubscriptionStatus
  days_remaining: number
  plan_name: string
  message: string
}

export interface CreatePlanData {
  name: string
  slug: string
  description?: string
  max_users: number
  max_spreadsheets?: number
  max_storage_mb?: number
  features?: PlanFeatures
  price: string
  currency?: string
  billing_cycle?: BillingCycle
  is_active?: boolean
  is_public?: boolean
  display_order?: number
}

export interface UpdatePlanData extends Partial<CreatePlanData> {}
