import { AxiosError } from 'axios'

/** Error response shapes from backend auth and API. */
interface AuthErrorData {
  error?: string
  detail?: string | string[]
  message?: string
  non_field_errors?: string[]
}

/**
 * Extract user-facing error message from API errors.
 * Handles network failures, timeout, and all backend response formats.
 */
export function extractAuthError(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback
  const err = error as AxiosError<AuthErrorData>
  const data = err.response?.data

  if (!data) {
    if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
      return 'Network error. Please check your connection and try again.'
    }
    if (err.code === 'ECONNABORTED') {
      return 'Request timed out. Please try again.'
    }
    return fallback
  }

  if (typeof data === 'string') return data
  if (data.error) return data.error
  if (data.non_field_errors?.length) return data.non_field_errors[0]
  if (Array.isArray(data.detail)) return data.detail[0] || fallback
  if (typeof data.detail === 'string') return data.detail
  if (data.message) return data.message
  return fallback
}
