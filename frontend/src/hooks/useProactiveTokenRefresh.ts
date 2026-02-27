/**
 * Proactive token refresh: refresh before expiry to reduce 401s.
 * Decodes JWT exp and schedules refresh ~60s before expiry.
 * Never logs tokens.
 */
import { useEffect, useRef } from 'react'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
const REFRESH_BEFORE_SEC = 60

function getExpFromToken(token: string): number | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1]))
    return payload.exp ?? null
  } catch {
    return null
  }
}

export function useProactiveTokenRefresh(): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const { accessToken, refreshToken, setAuth, user } = useAuthStore.getState()
    if (!accessToken || !refreshToken || !user) return

    const exp = getExpFromToken(accessToken)
    if (!exp) return

    const nowSec = Math.floor(Date.now() / 1000)
    const ttlSec = exp - nowSec
    const refreshAtSec = ttlSec - REFRESH_BEFORE_SEC

    if (refreshAtSec <= 0) {
      // Already close to expiry – refresh immediately
      axios
        .post(`${API_BASE_URL}/auth/token/refresh/`, { refresh: refreshToken })
        .then((res) => {
          useAuthStore.getState().setAuth(user, res.data.access, refreshToken)
        })
        .catch(() => {
          useAuthStore.getState().logout()
          window.location.href = '/login'
        })
      return
    }

    timerRef.current = setTimeout(() => {
      axios
        .post(`${API_BASE_URL}/auth/token/refresh/`, {
          refresh: useAuthStore.getState().refreshToken,
        })
        .then((res) => {
          const state = useAuthStore.getState()
          if (state.user) {
            state.setAuth(state.user, res.data.access, state.refreshToken!)
          }
        })
        .catch(() => {
          useAuthStore.getState().logout()
          window.location.href = '/login'
        })
    }, refreshAtSec * 1000)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])
}
