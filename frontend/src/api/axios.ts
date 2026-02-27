import axios from 'axios'
import { useAuthStore } from '../store/authStore'

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
  (error) => {
    return Promise.reject(error)
  }
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

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Skip 401 handling for auth endpoints: wrong password returns 401, not expired token.
    // Running refresh/redirect here causes page reload instead of showing error toast.
    if (isAuthCredentialRequest(originalRequest)) {
      return Promise.reject(error)
    }

    // Only retry on 401 (token expired) for authenticated API calls
    if (error.response?.status === 401 && !originalRequest._retry) {
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
        } catch (refreshError) {
          logout()
          window.location.href = '/login'
          return Promise.reject(refreshError)
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

