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

  // Ensure user profile with roles is fetched and cached
  let userRoles: string[] = []
  if (userId) {
    try {
      const userProfile = await queryClient.fetchQuery({
        queryKey: ['userProfile', userId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('users')
            .select(`
              *,
              user_roles(
                roles(
                  id,
                  name,
                  description
                )
              )
            `)
            .eq('id', userId)
            .single()

          if (error) throw error

          return {
            ...data,
            roles: data.user_roles?.map((ur: any) => ur.roles) || []
          }
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
      })

      if (userProfile?.roles) {
        userRoles = userProfile.roles.map((role: any) => role.name)
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
      // Continue with empty roles array
    }
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'x-user-roles': JSON.stringify(userRoles),
  }
}
