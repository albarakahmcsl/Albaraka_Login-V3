import type { User } from '../types/auth'

const USER_CACHE_KEY = 'auth_user_profile'
const CACHE_TIMESTAMP_KEY = 'auth_cache_timestamp'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Safely get cached user data from localStorage.
 * Includes a TTL mechanism.
 */
export const getCachedUser = (): User | null => {
  try {
    // Check if localStorage is available (e.g., not in SSR environments)
    if (typeof localStorage === 'undefined') {
      console.warn('[profileCache] localStorage is not available.')
      return null
    }

    const cachedUser = localStorage.getItem(USER_CACHE_KEY)
    const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)

    if (!cachedUser || !cacheTimestamp) {
      return null
    }

    const timestamp = parseInt(cacheTimestamp, 10)
    const now = Date.now()

    // Check if cache is still valid (within CACHE_DURATION)
    if (now - timestamp > CACHE_DURATION) {
      console.log('[profileCache] Cache expired, clearing...')
      localStorage.removeItem(USER_CACHE_KEY)
      localStorage.removeItem(CACHE_TIMESTAMP_KEY)
      return null
    }

    const user = JSON.parse(cachedUser)
    console.log('[profileCache] Using cached user from localStorage.')
    return user
  } catch (error) {
    console.error('[profileCache] Error reading cached user from localStorage:', error)
    // Clear potentially corrupted cache
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(USER_CACHE_KEY)
      localStorage.removeItem(CACHE_TIMESTAMP_KEY)
    }
    return null
  }
}

/**
 * Safely cache user data to localStorage.
 */
export const setCachedUser = (user: User | null) => {
  try {
    // Check if localStorage is available
    if (typeof localStorage === 'undefined') {
      console.warn('[profileCache] localStorage is not available, cannot cache user.')
      return
    }

    if (user) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user))
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
      console.log('[profileCache] User cached successfully to localStorage.')
    } else {
      localStorage.removeItem(USER_CACHE_KEY)
      localStorage.removeItem(CACHE_TIMESTAMP_KEY)
      console.log('[profileCache] User cache cleared from localStorage.')
    }
  } catch (error) {
    console.error('[profileCache] Error caching user to localStorage:', error)
  }
}