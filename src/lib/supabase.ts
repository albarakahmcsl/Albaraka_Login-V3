import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { queryClient } from './queryClient'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

/**
 * Get the current access token safely.
 * If the session is expired or missing, returns null instead of throwing.
 */
export const getAccessToken = async (): Promise<string | null> => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.access_token) return session.access_token

    return null
  } catch (err) {
    console.error('Failed to get Supabase access token:', err)
    return null
  }
}

// Helper function to get auth headers for API calls
export const getAuthHeaders = async () => {
  const token = await getAccessToken()
  if (!token) throw new Error('No active session. Please log in again.')

  // Get current user session to retrieve user ID
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id

  // Get user roles from cache
  let userRoles: string[] = []
  if (userId) {
    const cachedProfile = queryClient.getQueryData(['userProfile', userId]) as any
    if (cachedProfile?.roles) {
      userRoles = cachedProfile.roles.map((role: any) => role.name)
    }
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'x-user-roles': JSON.stringify(userRoles),
  }
}
