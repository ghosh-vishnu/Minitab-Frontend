/**
 * API client for License Server - used for login only.
 * All other API calls go to Backend (api/axios.ts).
 */
import axios from 'axios'

const LICENSE_API_BASE = import.meta.env.VITE_LICENSE_SERVER_API_URL || '/license-api'

export const licenseServerApi = axios.create({
  baseURL: LICENSE_API_BASE,
  headers: { 'Content-Type': 'application/json' },
})
