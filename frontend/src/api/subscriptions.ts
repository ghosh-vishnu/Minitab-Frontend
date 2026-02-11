/**
 * Subscriptions API service
 * Handles all subscription and plan related API calls
 */

import api from './axios'
import type {
  Subscription,
  SubscriptionPlan,
  CreateSubscriptionData,
  UpdateSubscriptionData,
  SubscriptionStatusResponse,
  CreatePlanData,
  UpdatePlanData,
  SubscriptionHistory,
} from '../types/subscription'

export interface ListSubscriptionsParams {
  company?: string
  plan?: string
  status?: string
  page?: number
  page_size?: number
}

export interface ListPlansParams {
  is_active?: boolean
  is_public?: boolean
  page?: number
  page_size?: number
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

/**
 * Subscriptions API
 */
export const subscriptionsAPI = {
  /**
   * List all subscriptions (with optional filters)
   */
  listSubscriptions: async (
    params?: ListSubscriptionsParams
  ): Promise<PaginatedResponse<Subscription>> => {
    const response = await api.get<PaginatedResponse<Subscription>>('/subscriptions/', { params })
    return response.data
  },

  /**
   * Get active subscription for the current company
   */
  getActiveSubscription: async (): Promise<Subscription> => {
    const response = await api.get<Subscription>('/subscriptions/active/')
    return response.data
  },

  /**
   * Get subscription by ID
   */
  getSubscription: async (id: string): Promise<Subscription> => {
    const response = await api.get<Subscription>(`/subscriptions/${id}/`)
    return response.data
  },

  /**
   * Create a new subscription (Super Admin only)
   */
  createSubscription: async (data: CreateSubscriptionData): Promise<Subscription> => {
    const response = await api.post<Subscription>('/subscriptions/', data)
    return response.data
  },

  /**
   * Update a subscription
   */
  updateSubscription: async (id: string, data: UpdateSubscriptionData): Promise<Subscription> => {
    const response = await api.put<Subscription>(`/subscriptions/${id}/`, data)
    return response.data
  },

  /**
   * Partially update a subscription
   */
  patchSubscription: async (id: string, data: Partial<UpdateSubscriptionData>): Promise<Subscription> => {
    const response = await api.patch<Subscription>(`/subscriptions/${id}/`, data)
    return response.data
  },

  /**
   * Cancel a subscription
   */
  cancelSubscription: async (id: string, reason?: string): Promise<Subscription> => {
    const response = await api.post<Subscription>(`/subscriptions/${id}/cancel/`, {
      reason,
    })
    return response.data
  },

  /**
   * Renew a subscription
   */
  renewSubscription: async (
    id: string,
    data?: { duration_days?: number; plan?: string }
  ): Promise<Subscription> => {
    const response = await api.post<Subscription>(`/subscriptions/${id}/renew/`, data || {})
    return response.data
  },

  /**
   * Check subscription status
   */
  checkStatus: async (id: string): Promise<SubscriptionStatusResponse> => {
    const response = await api.get<SubscriptionStatusResponse>(`/subscriptions/${id}/status/`)
    return response.data
  },

  /**
   * Get subscription history
   */
  getHistory: async (subscriptionId: string): Promise<SubscriptionHistory[]> => {
    const response = await api.get<SubscriptionHistory[]>(`/subscriptions/${subscriptionId}/history/`)
    return response.data
  },
}

/**
 * Plans API
 */
export const plansAPI = {
  /**
   * List all available subscription plans
   */
  listPlans: async (params?: ListPlansParams): Promise<PaginatedResponse<SubscriptionPlan>> => {
    const response = await api.get<PaginatedResponse<SubscriptionPlan>>('/subscriptions/plans/', {
      params,
    })
    return response.data
  },

  /**
   * Get public plans (for plan selection/upgrade)
   */
  getPublicPlans: async (): Promise<SubscriptionPlan[]> => {
    const response = await api.get<PaginatedResponse<SubscriptionPlan>>('/subscriptions/plans/', {
      params: { is_public: true, is_active: true, page_size: 100 },
    })
    return response.data.results
  },

  /**
   * Get plan by ID
   */
  getPlan: async (id: string): Promise<SubscriptionPlan> => {
    const response = await api.get<SubscriptionPlan>(`/subscriptions/plans/${id}/`)
    return response.data
  },

  /**
   * Create a new plan (Super Admin only)
   */
  createPlan: async (data: CreatePlanData): Promise<SubscriptionPlan> => {
    const response = await api.post<SubscriptionPlan>('/subscriptions/plans/', data)
    return response.data
  },

  /**
   * Update a plan (Super Admin only)
   */
  updatePlan: async (id: string, data: UpdatePlanData): Promise<SubscriptionPlan> => {
    const response = await api.put<SubscriptionPlan>(`/subscriptions/plans/${id}/`, data)
    return response.data
  },

  /**
   * Delete a plan (Super Admin only)
   */
  deletePlan: async (id: string): Promise<void> => {
    await api.delete(`/subscriptions/plans/${id}/`)
  },
}

/**
 * Combined export
 */
const subscriptionsService = {
  ...subscriptionsAPI,
  plans: plansAPI,
}

export default subscriptionsService
