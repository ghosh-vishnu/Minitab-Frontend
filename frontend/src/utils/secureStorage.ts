/**
 * Secure token storage strategy.
 * Uses sessionStorage to limit token exposure:
 * - Cleared on tab/window close
 * - Not shared across tabs (reduces XSS impact)
 * Backend is the authority; frontend storage is UX only.
 * Never log tokens.
 */

const PREFIX = 'ved_'

export function getSecureItem(key: string): string | null {
  try {
    return sessionStorage.getItem(PREFIX + key)
  } catch {
    return null
  }
}

export function setSecureItem(key: string, value: string): void {
  try {
    sessionStorage.setItem(PREFIX + key, value)
  } catch {
    // Quota or security error - fail silently
  }
}

export function removeSecureItem(key: string): void {
  try {
    sessionStorage.removeItem(PREFIX + key)
  } catch {
    /* no-op */
  }
}

export function clearSecureAuth(): void {
  const keys: string[] = []
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      if (k?.startsWith(PREFIX)) keys.push(k)
    }
    keys.forEach((k) => sessionStorage.removeItem(k))
  } catch {
    /* no-op */
  }
}
