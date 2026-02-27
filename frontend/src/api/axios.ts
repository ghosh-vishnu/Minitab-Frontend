import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

// Use environment variable or default to localhost:8000
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState()
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }

    // Don't force Content-Type for FormData - let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }

    return config
  },
  (error) => Promise.reject(error)
)

/**
 * Auth endpoints that can legitimately return 401 for invalid credentials.
 * We must NOT run token refresh or redirect when these fail - let the caller
 * handle the error (e.g. show toast). Otherwise wrong password causes page refresh.
 */
const AUTH_ENDPOINTS_401_OK = [
  '/auth/verify-credentials/',
  '/auth/company-user-login/',
  '/auth/unified-login/',
  '/auth/login/',
  '/auth/sync-license-session/',
  '/auth/register/',
]

function isAuthCredentialRequest(config: { url?: string; baseURL?: string }): boolean {
  const url = (config.url ?? '').toString()
  const baseURL = (config.baseURL ?? '').toString()
  const fullPath = url.startsWith('http')
    ? new URL(url).pathname
    : (baseURL.replace(/^https?:\/\/[^/]+/, '') + url).replace(/\/\/+/g, '/')
  return AUTH_ENDPOINTS_401_OK.some((endpoint) => fullPath.endsWith(endpoint) || fullPath.includes(endpoint))
}

/** Global error handler for 403 Forbidden */
function handle403(): void {
  toast.error('You do not have permission to perform this action.')
}

// Response interceptor: token refresh, global 401/403 handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status

    // Skip 401 handling for auth endpoints: wrong password returns 401, not expired token.
    if (isAuthCredentialRequest(originalRequest)) {
      return Promise.reject(error)
    }

    // Global 403 handler (caller can still handle if needed)
    if (status === 403) {
      handle403()
    }

    // 401: token expired – attempt refresh
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const { refreshToken, logout } = useAuthStore.getState()

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          })

          const { access } = response.data
          useAuthStore.getState().setAuth(
            useAuthStore.getState().user!,
            access,
            refreshToken
          )

          originalRequest.headers.Authorization = `Bearer ${access}`
          return api(originalRequest)
        } catch {
          logout()
          window.location.href = '/login'
          return Promise.reject(error)
        }
      } else {
        logout()
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api

