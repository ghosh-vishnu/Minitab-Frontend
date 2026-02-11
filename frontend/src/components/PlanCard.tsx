/**
 * PlanCard Component
 * Displays a subscription plan with features and pricing
 */

import React from 'react'
import { Check, X, Crown, Zap, Building2 } from 'lucide-react'
import type { SubscriptionPlan } from '../types/subscription'

interface PlanCardProps {
  plan: SubscriptionPlan
  isCurrentPlan?: boolean
  isPopular?: boolean
  onSelectPlan: (planId: string) => void
  disabled?: boolean
  showFeatures?: boolean
}

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  isCurrentPlan = false,
  isPopular = false,
  onSelectPlan,
  disabled = false,
  showFeatures = true,
}) => {
  const getPlanIcon = () => {
    const slug = plan.slug.toLowerCase()
    if (slug.includes('enterprise')) return <Building2 className="w-6 h-6" />
    if (slug.includes('professional') || slug.includes('pro'))
      return <Crown className="w-6 h-6" />
    if (slug.includes('basic')) return <Zap className="w-6 h-6" />
    return <Check className="w-6 h-6" />
  }

  const formatPrice = () => {
    const price = parseFloat(plan.price)
    if (price === 0) return 'Free'
    return `${plan.currency} ${price.toFixed(2)}`
  }

  const formatStorageLimit = (mb: number) => {
    if (mb === -1) return 'Unlimited'
    if (mb >= 1024) return `${(mb / 1024).toFixed(0)} GB`
    return `${mb} MB`
  }

  const formatLimit = (limit: number, unit: string) => {
    if (limit === -1) return `Unlimited ${unit}`
    return `${limit} ${unit}`
  }

  // Extract key features from plan features object
  const getKeyFeatures = (): Array<{ name: string; included: boolean }> => {
    const featuresList = [
      { key: 'advanced_analytics', name: 'Advanced Analytics' },
      { key: 'custom_charts', name: 'Custom Charts' },
      { key: 'api_access', name: 'API Access' },
      { key: 'priority_support', name: 'Priority Support' },
      { key: 'data_export', name: 'Data Export' },
      { key: 'collaboration', name: 'Team Collaboration' },
      { key: 'custom_branding', name: 'Custom Branding' },
      { key: 'sso', name: 'Single Sign-On (SSO)' },
      { key: 'audit_logs', name: 'Audit Logs' },
    ]

    return featuresList.map((feature) => ({
      name: feature.name,
      included: plan.features[feature.key] === true,
    }))
  }

  const keyFeatures = getKeyFeatures()

  return (
    <div
      className={`
        relative flex flex-col rounded-lg border-2 transition-all duration-300
        ${isCurrentPlan ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'}
        ${isPopular ? 'shadow-lg scale-105' : 'shadow-md hover:shadow-lg'}
        ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {/* Popular Badge */}
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
          <span className="inline-flex items-center px-4 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            Most Popular
          </span>
        </div>
      )}

      {/* Current Plan Badge */}
      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
          <span className="inline-flex items-center px-4 py-1 rounded-full text-xs font-semibold bg-green-600 text-white">
            Current Plan
          </span>
        </div>
      )}

      <div className="p-6">
        {/* Plan Header */}
        <div className="flex items-center justify-center mb-4">
          <div className={`p-3 rounded-full ${isPopular ? 'bg-gradient-to-br from-blue-100 to-purple-100' : 'bg-gray-100'}`}>
            {getPlanIcon()}
          </div>
        </div>

        <h3 className="text-2xl font-bold text-center text-gray-900 mb-2">
          {plan.name}
        </h3>

        {plan.description && (
          <p className="text-sm text-gray-600 text-center mb-4">{plan.description}</p>
        )}

        {/* Pricing */}
        <div className="text-center mb-6">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold text-gray-900">{formatPrice()}</span>
            {parseFloat(plan.price) > 0 && (
              <span className="text-gray-600 text-sm">/{plan.billing_cycle}</span>
            )}
          </div>
        </div>

        {/* Limits */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Users</span>
            <span className="font-semibold text-gray-900">
              {formatLimit(plan.max_users, 'users')}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Spreadsheets</span>
            <span className="font-semibold text-gray-900">
              {formatLimit(plan.max_spreadsheets, 'sheets')}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Storage</span>
            <span className="font-semibold text-gray-900">
              {formatStorageLimit(plan.max_storage_mb)}
            </span>
          </div>
        </div>

        {/* Features List */}
        {showFeatures && (
          <div className="space-y-2 mb-6">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Features
            </div>
            {keyFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                {feature.included ? (
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-gray-300 flex-shrink-0" />
                )}
                <span className={feature.included ? 'text-gray-900' : 'text-gray-400'}>
                  {feature.name}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={() => !disabled && onSelectPlan(plan.id)}
          disabled={disabled || isCurrentPlan}
          className={`
            w-full py-3 px-4 rounded-lg font-semibold text-sm transition-colors
            ${isCurrentPlan
              ? 'bg-green-100 text-green-700 cursor-default'
              : isPopular
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }
            ${disabled && !isCurrentPlan ? 'opacity-50 cursor-not-allowed' : ''}
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
        </button>
      </div>
    </div>
  )
}

export default PlanCard
