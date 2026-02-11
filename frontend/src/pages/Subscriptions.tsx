/**
 * Subscriptions Page
 * Main page for managing subscriptions and viewing available plans
 */

import React, { useState, useEffect } from 'react'
import {
  CreditCard,
  Package,
  History,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import subscriptionsService from '../api/subscriptions'
import type { Subscription, SubscriptionPlan } from '../types/subscription'
import SubscriptionDetailsCard from '../components/SubscriptionDetailsCard'
import PlanCard from '../components/PlanCard'

type TabType = 'overview' | 'plans' | 'history'

const Subscriptions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null)
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const tabs = [
    { id: 'overview' as TabType, name: 'Overview', icon: CreditCard },
    { id: 'plans' as TabType, name: 'Available Plans', icon: Package },
    { id: 'history' as TabType, name: 'History', icon: History },
  ]

  const fetchData = async () => {
    try {
      setError(null)
      setLoading(true)

      // Fetch current subscription
      const subscriptionPromise = subscriptionsService
        .getActiveSubscription()
        .catch(() => null)

      // Fetch available plans
      const plansPromise = subscriptionsService.plans.getPublicPlans()

      const [subscription, plans] = await Promise.all([subscriptionPromise, plansPromise])

      setCurrentSubscription(subscription)
      setAvailablePlans(plans)
    } catch (err: any) {
      console.error('Error fetching subscription data:', err)
      setError(err.response?.data?.message || err.message || 'Failed to load subscription data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const handleSelectPlan = async (planId: string) => {
    try {
      // Here you would typically show a confirmation dialog or payment flow
      console.log('Selected plan:', planId)
      
      // For now, just show an alert
      alert('Plan selection feature will be implemented with payment integration')
      
      // Navigate to payment or confirmation flow
      // navigate(`/subscriptions/checkout/${planId}`)
    } catch (err: any) {
      console.error('Error selecting plan:', err)
      alert(err.response?.data?.message || 'Failed to select plan')
    }
  }

  const handleCancelSubscription = async () => {
    if (!currentSubscription) return

    const confirmed = window.confirm(
      'Are you sure you want to cancel your subscription? You will retain access until the end of your current billing period.'
    )

    if (!confirmed) return

    try {
      await subscriptionsService.cancelSubscription(currentSubscription.id)
      alert('Subscription cancelled successfully')
      fetchData()
    } catch (err: any) {
      console.error('Error cancelling subscription:', err)
      alert(err.response?.data?.message || 'Failed to cancel subscription')
    }
  }

  const handleRenewSubscription = async () => {
    if (!currentSubscription) return

    const confirmed = window.confirm('Do you want to renew your subscription?')

    if (!confirmed) return

    try {
      await subscriptionsService.renewSubscription(currentSubscription.id)
      alert('Subscription renewed successfully')
      fetchData()
    } catch (err: any) {
      console.error('Error renewing subscription:', err)
      alert(err.response?.data?.message || 'Failed to renew subscription')
    }
  }

  const handleUpgrade = () => {
    setActiveTab('plans')
  }

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading subscription data...</p>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }

    switch (activeTab) {
      case 'overview':
        return (
          <div>
            {currentSubscription ? (
              <SubscriptionDetailsCard
                subscription={currentSubscription}
                onCancel={handleCancelSubscription}
                onRenew={handleRenewSubscription}
                onUpgrade={handleUpgrade}
              />
            ) : (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Active Subscription
                </h3>
                <p className="text-gray-600 mb-6">
                  You don't have an active subscription. Choose a plan to get started.
                </p>
                <button
                  onClick={() => setActiveTab('plans')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  View Available Plans
                </button>
              </div>
            )}
          </div>
        )

      case 'plans':
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Available Plans</h2>
              <p className="text-gray-600">
                Choose the plan that best fits your needs. Upgrade or downgrade anytime.
              </p>
            </div>

            {availablePlans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {availablePlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    isCurrentPlan={currentSubscription?.plan === plan.id}
                    isPopular={plan.slug === 'professional' || plan.slug === 'pro'}
                    onSelectPlan={handleSelectPlan}
                    showFeatures={true}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Plans Available
                </h3>
                <p className="text-gray-600">
                  There are no subscription plans available at the moment.
                </p>
              </div>
            )}
          </div>
        )

      case 'history':
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Subscription History</h2>
              <p className="text-gray-600">View your past subscription changes and billing history.</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Coming Soon</h3>
              <p className="text-gray-600">
                Subscription history and billing information will be available here.
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Subscriptions</h1>
              <p className="text-gray-600 mt-1">Manage your subscription and billing</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors
                    ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </div>
    </div>
  )
}

export default Subscriptions
