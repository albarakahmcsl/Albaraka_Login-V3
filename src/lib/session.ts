import { supabase } from './supabase'
import { userProfileApi } from './dataFetching'
import { withTimeout, retryWithBackoff } from '../utils/helpers'
import type { Session } from '@supabase/supabase-js'
import type { User } from '../types/auth'

const PROFILE_FETCH_TIMEOUT = 10000 // Temporarily reduced for testing timeout scenarios (REVERT TO 15000 after testing)

/**
 * Gets the active Supabase session.
 * If no session, or if it's expired, attempts to refresh it once.
 * Returns the session or null.
 */
export const ensureFreshSession = async (): Promise<Session | null> => {
  console.log('[session] ensureFreshSession START')
  try {
    let { data: { session }, error: getSessionError } = await supabase.auth.getSession()

    if (getSessionError) {
      console.error('[session] Error getting session:', getSessionError)
      return null
    }

    if (!session) {
      console.log('[session] No active session found, attempting to refresh...')
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
      if (refreshError) {
        console.error('[session] Error refreshing session:', refreshError)
        return null
      }
      session = refreshedSession
    }

    console.log('[session] ensureFreshSession SUCCESS - session:', !!session)
    return session

  } catch (error) {
    console.error('[session] Unexpected error in ensureFreshSession:', error)
    return null
  }
}

/**
 * Fetches the user profile from the database, with retry and timeout.
 */
export const fetchUserProfile = async (userId: string): Promise<User | null> => {
  console.log('[session] fetchUserProfile START - userId:', userId)
  try {
    const profile = await withTimeout(
      retryWithBackoff(
        () => userProfileApi.fetchUserProfile(userId),
        10, // max retries
        1000 // base delay in ms
      ),
      PROFILE_FETCH_TIMEOUT,
      'Profile fetch timed out'
    )
    console.log('[session] fetchUserProfile SUCCESS - profile:', !!profile)
    return profile
  } catch (error) {
    console.error('[session] fetchUserProfile ERROR:', error)
    throw error // Re-throw to be caught by AuthContext for error state
  }
}