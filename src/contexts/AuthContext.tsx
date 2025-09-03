import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { authApi } from '../lib/dataFetching'
import { ensureFreshSession, fetchUserProfile } from '../lib/session'
import { getCachedUser, setCachedUser } from '../utils/profileCache'
import { clearPermissionCache } from '../utils/permissions'

/**
 * Clears all Supabase authentication tokens from local storage.
 * This is a failsafe to ensure tokens are removed when signOut() doesn't fully clear them.
 */
const clearSupabaseTokens = () => {
  try {
    if (typeof localStorage === 'undefined') return
    
    console.log('[AuthContext] Clearing Supabase tokens from local storage...')
    
    // Get all keys from localStorage
    const keys = Object.keys(localStorage)
    
    // Remove all Supabase-related authentication keys
    keys.forEach(key => {
      // Supabase typically stores auth data with keys like:
      // - sb-[project-ref]-auth-token
      // - sb-[project-ref]-auth-token-code-verifier
      // - supabase.auth.token
      if (key.includes('sb-') && (key.includes('auth-token') || key.includes('auth-pkce'))) {
        localStorage.removeItem(key)
        console.log('[AuthContext] Removed token key:', key)
      } else if (key.startsWith('supabase.auth.')) {
        localStorage.removeItem(key)
        console.log('[AuthContext] Removed supabase auth key:', key)
      }
    })
    
    console.log('[AuthContext] Supabase token cleanup completed')
  } catch (error) {
    console.error('[AuthContext] Error clearing Supabase tokens:', error)
  }
}

/**
 * Defines the shape of the AuthContext.
 * This is what all components using `useAuth()` will have access to.
 */
interface AuthContextType {
  user: any | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  changePassword: (newPassword: string, clearNeedsPasswordReset?: boolean) => Promise<void>
  sendPasswordResetEmail: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  // Initialize user from cache if available
  const initialCachedUser = getCachedUser()
  const [user, setUser] = useState<any | null>(initialCachedUser)
  // Set loading to true only if no cached user, otherwise assume initialized
  const [loading, setLoading] = useState(!initialCachedUser)
  const [error, setError] = useState<string | null>(null)
  // isInitialized helps prevent showing a spinner if we have cached data
  const [isInitialized, setIsInitialized] = useState(!!initialCachedUser)

  /**
   * Handles the process of fetching and setting the user profile.
   * Includes checks for active status and updates cache.
   * @param userId The ID of the user whose profile to fetch.
   * @param isBackgroundRefresh Flag to indicate if this is a non-critical background refresh.
   * @returns The fetched user profile or null if an error occurred.
   */
  const processAndSetUser = async (userId: string, isBackgroundRefresh: boolean = false) => {
    try {
      const profile = await fetchUserProfile(userId)

      // Prevent inactive accounts from signing in/staying signed in
      if (!profile?.is_active) {
        console.log('[AuthContext] User account is inactive, signing out')
        setUser(null)
        setCachedUser(null)
        await supabase.auth.signOut()
        setError('Your account is inactive. Please contact an administrator.')
        return null
      }

      // Only update if data has changed to avoid unnecessary re-renders
      if (JSON.stringify(profile) !== JSON.stringify(user)) {
        setUser(profile)
        setCachedUser(profile)
        clearPermissionCache() // Clear permission cache when user data changes
        console.log('[AuthContext] User profile updated:', profile)
      } else {
        console.log('[AuthContext] User profile is up-to-date, no change needed.')
      }
      setError(null) // Clear any previous errors
      return profile
    } catch (err: any) {
      console.error('[AuthContext] Error processing and setting user:', err)
      if (isBackgroundRefresh) {
        // For background refresh, don't clear user, just show a warning
        setError(err.message || 'Unable to refresh profile data. Some features may not work correctly.')
      } else {
        // For initial load or explicit sign-in, clear user on critical error
        setUser(null)
        setCachedUser(null)
        
        try {
          // Always attempt to sign out to clear session
          console.log('[AuthContext] Attempting to sign out due to critical profile fetch error')
          await supabase.auth.signOut()
          console.log('[AuthContext] Sign out completed')
        } catch (signOutError) {
          console.error('[AuthContext] Error during sign out:', signOutError)
        }
        
        // Failsafe: Explicitly clear Supabase tokens from local storage
        // This ensures tokens are removed even if signOut() doesn't fully clear them
        clearSupabaseTokens()
        
        // Clear permission cache
        clearPermissionCache()
        
        setError(err.message || 'Failed to load user profile. Please try logging in again.')
      }
      return null
    }
  }

  /**
   * Enhanced sign out function that ensures all authentication data is cleared
   */
  const signOut = async () => {
    console.log('[AuthContext] signOut START')

    // Immediately clear user state and cache for instant UI feedback
    setUser(null)
    setCachedUser(null)
    setError(null)
    console.log('[AuthContext] signOut - User state cleared immediately')

    try {
      console.log('[AuthContext] signOut - Calling Supabase auth signOut...')
      await supabase.auth.signOut()
      console.log('[AuthContext] signOut SUCCESS')
    } catch (err: any) {
      console.error('[AuthContext] signOut ERROR:', err)
      // Don't show error for signout failures - user is already logged out from UI perspective
    }
    
    // Failsafe: Always clear Supabase tokens after signOut attempt
    clearSupabaseTokens()
    
    // Clear permission cache
    clearPermissionCache()
  }

  /**
   * Enhanced sign in function with better error handling
   */
  const signIn = async (email: string, password: string) => {
    console.log('[AuthContext] signIn START - email:', email)
    setLoading(true)
    setError(null)

    try {
      // Clear any existing tokens before attempting new sign in
      clearSupabaseTokens()
      
      console.log('[AuthContext] signIn - Calling Supabase auth...')
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

      if (authError) {
        console.error('[AuthContext] signIn - Auth error:', authError)
        throw authError
      }

      if (data.user) {
        console.log('[AuthContext] signIn - Auth successful, processing profile...')
        const profile = await processAndSetUser(data.user.id)
        if (!profile) {
          throw new Error('Failed to load user profile after sign-in.')
        }
        console.log('[AuthContext] signIn SUCCESS - user set:', profile)
      }
    } catch (err: any) {
      console.error('[AuthContext] signIn ERROR:', err)
      // Clear tokens on sign-in failure as well
      clearSupabaseTokens()
      setError(err.message)
      throw err
    } finally {
      console.log('[AuthContext] signIn - Setting loading to false')
      setLoading(false)
    }
  }

  /**
   * On app start, check if a user session already exists (e.g., from cookies/localStorage).
   * If so, load their profile from the DB and set it into state.
   * Also subscribe to auth state changes (login/logout/password change).
   */
  useEffect(() => {
    console.log('[AuthContext] useEffect INIT START')

    const handleInitialLoad = async () => {
      if (initialCachedUser) {
        console.log('[AuthContext] Initialized with cached user. Performing background refresh.')
        // Background refresh for cached user
        try {
          const session = await ensureFreshSession()
          if (session?.user) {
            await processAndSetUser(session.user.id, true) // isBackgroundRefresh = true
          } else {
            console.log('[AuthContext] No fresh session in background, clearing cached user.')
            setUser(null)
            setCachedUser(null)
            await signOut() // Use enhanced signOut function
          }
        } catch (err) {
          console.error('[AuthContext] Background refresh failed:', err)
          setError('Background profile refresh failed. Data might be outdated.')
        } finally {
          setIsInitialized(true) // Ensure initialized even if background refresh fails
        }
      } else {
        console.log('[AuthContext] No cached user. Performing full initial load.')
        setLoading(true) // Show spinner for full initial load
        try {
          const session = await ensureFreshSession()
          if (session?.user) {
            await processAndSetUser(session.user.id)
          } else {
            console.log('[AuthContext] No session found on initial load.')
            setUser(null)
            setCachedUser(null)
            await signOut() // Use enhanced signOut function
                  } catch (err) {
          console.error('[AuthContext] Full initial load failed:', err)
          setError('Failed to establish session. Please try again.')
        } finally {
          setLoading(false) // Always turn off loading after initial attempt
          setIsInitialized(true)
        }
              }
          }
    }

    handleInitialLoad()

    // Listen for sign in/out/password changes
    console.log('[AuthContext] Setting up auth state listener')
    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] Auth state change - event:', event, 'session:', !!session)
      setLoading(true) // Show loading during auth state change processing
      try {
        if (session?.user) {
          await processAndSetUser(session.user.id)
        } else {
          console.log('[AuthContext] Auth state change - No session, clearing user')
          setUser(null)
          setCachedUser(null)
          clearSupabaseTokens() // Ensure tokens are cleared
          await signOut() // Use enhanced signOut function
        }
      } catch (err) {
        console.error('[AuthContext] Auth state change handler ERROR:', err)
        setError('Failed to process auth state change. Please refresh.')
      } finally {
        setLoading(false) // Always turn off loading after auth state change
        setIsInitialized(true)
      }
    })

    return () => {
      console.log('[AuthContext] Cleaning up auth state listener')
      subscription.subscription.unsubscribe()
    }
  }, []) // Empty dependency array ensures this runs only once on mount

  /**
   * Changes the user's password using the secure Edge Function approach.
   * @param newPassword - The new password to set
   * @param clearNeedsPasswordReset - Whether to clear the needs_password_reset flag (default: false)
   */
  const changePassword = async (newPassword: string, clearNeedsPasswordReset: boolean = false) => {
    console.log("[AuthContext] changePassword START", { newPassword: !!newPassword, clearNeedsPasswordReset })
    setLoading(true)
    setError(null)

    try {
      console.log("[AuthContext] changePassword - Calling Edge Function...")
      const result = await authApi.updatePassword(newPassword, clearNeedsPasswordReset)
      console.log("[AuthContext] changePassword - Edge Function completed successfully", result)

      // Refresh user profile to get updated data
      console.log("[AuthContext] changePassword - Refreshing user profile...")
      // Ensure we have a session before trying to refresh profile
      const session = await ensureFreshSession()
      if (session?.user) {
        await processAndSetUser(session.user.id)
      } else {
        // If no session after password change, force sign out
        await signOut()
        throw new Error('Session lost after password change. Please log in again.')
      }

      console.log("[AuthContext] changePassword SUCCESS")
      return result
    } catch (err: any) {
      console.error("[AuthContext] changePassword ERROR:", err)
      setError(err.message || "Failed to change password")
      throw err
    } finally {
      console.log("[AuthContext] changePassword - Setting loading to false")
      setLoading(false)
    }
  }

  /**
   * Force refresh the current user profile from the DB.
   * Useful after updating roles or other user data.
   */
  const refreshUser = async () => {
    console.log('[AuthContext] refreshUser START')

    if (!user) {
      console.log('[AuthContext] refreshUser - No user to refresh')
      return
    }

    setLoading(true) // Show loading for manual refresh
    try {
      console.log('[AuthContext] refreshUser - Ensuring fresh session...')
      const session = await ensureFreshSession()

      if (session?.user) {
        await processAndSetUser(session.user.id)
      } else {
        console.log('[AuthContext] refreshUser - No session found, clearing user')
        setUser(null)
        setCachedUser(null)
        await supabase.auth.signOut() // Ensure session is cleared
      }
    } catch (err) {
      console.error('[AuthContext] refreshUser ERROR:', err)
      setError('Failed to refresh user profile. Using existing data.')
    } finally {
      setLoading(false) // Always turn off loading after manual refresh
    }
  }

  /**
   * Sends a password reset email with a redirect URL.
   * User will click link → be redirected → enter new password.
   */
  const sendPasswordResetEmail = async (email: string) => {
    console.log('[AuthContext] sendPasswordResetEmail START - email:', email)
    setLoading(true)
    setError(null)

    try {
      console.log('[AuthContext] sendPasswordResetEmail - Calling Supabase...')
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) {
        console.error('[AuthContext] sendPasswordResetEmail - Error:', error)
        throw error
      }

      console.log('[AuthContext] sendPasswordResetEmail SUCCESS')
    } catch (err: any) {
      console.error('[AuthContext] sendPasswordResetEmail ERROR:', err)
      setError(err.message)
      throw err
    } finally {
      console.log('[AuthContext] sendPasswordResetEmail - Setting loading to false')
      setLoading(false)
    }
  }

  console.log('[AuthContext] Render - user:', !!user, 'loading:', loading, 'error:', error, 'isInitialized:', isInitialized)

  return (
    <AuthContext.Provider value={{
      user,
      loading: loading && !isInitialized, // Only show loading if not initialized and no cached data
      error,
      signIn,
      signOut,
      refreshUser,
      changePassword,
      sendPasswordResetEmail
    }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Custom hook for consuming AuthContext.
 * Throws if used outside an AuthProvider.
 */
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}