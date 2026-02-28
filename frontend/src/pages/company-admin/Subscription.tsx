import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { subscriptionsAPI, Subscription } from '../../api/subscriptions'
import { companiesAPI, CompanyStats } from '../../api/companies'

export default function SubscriptionPage() {
  const { user } = useAuthStore()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [stats, setStats] = useState<CompanyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    // Always refresh from License Server on mount to get latest data
    refreshAndLoad()
  }, [])

  // Refresh subscription from License Server, then load all data
  const refreshAndLoad = async () => {
    try {
      setLoading(true)
      // First, sync with License Server to get latest license data
      await subscriptionsAPI.refreshSubscription().catch(() => null)
      // Then load all data
      const [subRes, statsRes] = await Promise.all([
        subscriptionsAPI.getActiveSubscription().catch(() => null),
        companiesAPI.getCompanyStats().catch(() => null),
      ])
      setSubscription(subRes)
      setStats(statsRes)
    } catch (err) {
      // Ignore
    } finally {
      setLoading(false)
    }
  }

  // Manual refresh button handler
  const handleRefresh = async () => {
    setRefreshing(true)
    await refreshAndLoad()
    setRefreshing(false)
  }

  const company = user?.company

  // Calculate days remaining - include today as a valid day
  const getDaysRemaining = () => {
    const expiryDate = subscription?.end_date || stats?.subscription_end_date
    if (!expiryDate) return null
    // Set both dates to start of day for accurate comparison
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiry = new Date(expiryDate)
    expiry.setHours(23, 59, 59, 999) // End of expiry day
    const diff = expiry.getTime() - today.getTime()
    // Return days including today if it's the same day
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const daysRemaining = getDaysRemaining()
  // Subscription is active if status is active OR if there are days remaining (including today)
  const isActive = subscription?.status === 'active' || company?.status === 'active'
  // Only truly expired if not active AND days remaining is negative
  const isExpired = !isActive && daysRemaining !== null && daysRemaining < 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const planName = subscription?.plan_name || 'Standard'
  const userSlots = stats?.user_limit || 0
  const usedSlots = stats?.total_users || 0

  // Helper to display days remaining text
  const getDaysRemainingText = () => {
    if (daysRemaining === null) return null
    if (isExpired) return 'Expired'
    if (daysRemaining <= 0) return 'Expires Today'
    if (daysRemaining === 1) return '1 day remaining'
    return `${daysRemaining} days remaining`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Subscription</h2>
          <p className="text-sm text-gray-500">Manage your license and subscription details</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg 
            className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Current Plan Card */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-blue-100 text-sm mb-1">Current Plan</p>
            <h3 className="text-3xl font-bold mb-2">{planName}</h3>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                isActive ? 'bg-green-400/20 text-green-100' : 'bg-red-400/20 text-red-100'
              }`}>
                {isActive ? 'Active' : 'Inactive'}
              </span>
              {getDaysRemainingText() && (
                <span className={`text-sm ${
                  isExpired ? 'text-red-200' : 
                  daysRemaining !== null && daysRemaining <= 7 ? 'text-yellow-200' : 'text-blue-100'
                }`}>
                  {getDaysRemainingText()}
                </span>
              )}
            </div>
          </div>
          <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{usedSlots} / {userSlots}</p>
          <p className="text-sm text-gray-500">User Slots Used</p>
          <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                usedSlots >= userSlots ? 'bg-red-500' : 
                usedSlots >= userSlots * 0.8 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min((usedSlots / userSlots) * 100, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.active_users ?? 0}</p>
          <p className="text-sm text-gray-500">Active Users</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {daysRemaining === null ? 'N/A' : 
             isExpired ? 'Expired' :
             daysRemaining <= 0 ? 'Today' : daysRemaining}
          </p>
          <p className="text-sm text-gray-500">
            {isExpired ? 'License Status' : daysRemaining !== null && daysRemaining <= 0 ? 'Expires' : 'Days Remaining'}
          </p>
        </div>
      </div>

      {/* Subscription Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Subscription Details</h3>
        <div className="space-y-4">
          {subscription && (
            <>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-500">Plan Name</span>
                <span className="font-medium text-gray-900">{subscription.plan_name || 'Standard'}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-500">Status</span>
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                  subscription.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {subscription.status}
                </span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-500">Start Date</span>
                <span className="font-medium text-gray-900">
                  {new Date(subscription.start_date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-500">End Date</span>
                <span className="font-medium text-gray-900">
                  {new Date(subscription.end_date).toLocaleDateString()}
                </span>
              </div>
            </>
          )}

          {stats?.subscription_end_date && (
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-500">License Expiry</span>
              <span className="font-medium text-gray-900">
                {new Date(stats.subscription_end_date).toLocaleDateString()}
              </span>
            </div>
          )}

          <div className="flex justify-between py-3">
            <span className="text-gray-500">Company</span>
            <span className="font-medium text-gray-900">{company?.name || '—'}</span>
          </div>
        </div>
      </div>

      {/* Warning if expiring soon - only show if active and not today */}
      {isActive && daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 30 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-6 h-6 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h4 className="font-semibold text-yellow-800">Subscription Expiring Soon</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Your subscription expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}. Contact your administrator to renew.
            </p>
          </div>
        </div>
      )}

      {/* Expires today warning */}
      {isActive && daysRemaining !== null && daysRemaining <= 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-6 h-6 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-semibold text-orange-800">Subscription Expires Today</h4>
            <p className="text-sm text-orange-700 mt-1">
              Your subscription expires today. Contact your administrator to renew before it expires.
            </p>
          </div>
        </div>
      )}

      {/* Expired warning - only show when actually expired */}
      {isExpired && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-semibold text-red-800">Subscription Expired</h4>
            <p className="text-sm text-red-700 mt-1">
              Your subscription has expired. Contact your administrator to renew access.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
