import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { authApi, userProfileApi } from '../lib/dataFetching'
import { queryClient, queryKeys } from '../lib/queryClient'
import { clearPermissionCache } from '../utils/permissions'
import { withTimeout, deepEqual } from '../utils/helpers'

// Local storage key for caching user profile
const USER_PROFILE_CACHE_KEY = 'user_profile_cache'

// Inactivity timeout duration (15 minutes in milliseconds)
const INACTIVITY_TIMEOUT = 15 * 60 * 1000

// Helper functions for localStorage operations
const saveUserToCache = (user: any) => {
  try {
    localStorage.setItem(USER_PROFILE_CACHE_KEY, JSON.stringify(user))
  } catch (error) {
    console.error('[AuthContext] Failed to save user to cache:', error)
  }
}

const getUserFromCache = (): any | null => {
  try {
    const cached = localStorage.getItem(USER_PROFILE_CACHE_KEY)
    if (cached) {
      const user = JSON.parse(cached)
      // Only return cached user if account is active
      if (user && user.is_active) {
        return user
      }
    }
  } catch (error) {
    console.error('[AuthContext] Failed to load user from cache:', error)
  }
  return null
}

const clearUserFromCache = () => {
  try {
    localStorage.removeItem(USER_PROFILE_CACHE_KEY)
  } catch (error) {
    console.error('[AuthContext] Failed to clear user from cache:', error)
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
  const [user, setUser] = useState<any | null>(null)
  const [loading, setLoading] = useState(true) // Start with true for initial session check
  const [error, setError] = useState<string | null>(null)
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Resets the inactivity timer. Called whenever user activity is detected.
   */
  const resetInactivityTimer = useCallback(() => {
    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
      inactivityTimerRef.current = null
    }

    // Only set timer if user is logged in
    if (user) {
      console.log('[AuthContext] resetInactivityTimer - Setting 15-minute inactivity timer')
      inactivityTimerRef.current = setTimeout(() => {
        console.log('[AuthContext] Inactivity timeout reached - logging out user')
        signOut()
      }, INACTIVITY_TIMEOUT)
    }
  }, [user]) // Dependencies: user

  /**
   * Fetches extra profile data from your custom `users` table
   * (since Supabase default auth only stores minimal info).
   */
  const fetchUserProfile = async (userId: string) => {
    console.log('[AuthContext] fetchUserProfile START - userId:', userId)
    
    try {
      const user = await userProfileApi.fetchUserProfile(userId)
      console.log('[AuthContext] fetchUserProfile SUCCESS - user:', user)
      return user
    } catch (err) {
      console.error('[AuthContext] fetchUserProfile CATCH ERROR:', err)
      throw err
    }
  }

  /**
   * On app start, check if a user session already exists (e.g., from cookies/localStorage).
   * If so, load their profile from the DB and set it into state.
   * Also subscribe to auth state changes (login/logout/password change).
   */
  useEffect(() => {
    console.log('[AuthContext] useEffect INIT START')
    
    const init = async () => {
      console.log('[AuthContext] init - Checking localStorage cache...')
      
      // First, try to load user from localStorage for immediate UI display
      const cachedUser = getUserFromCache()
      if (cachedUser) {
        console.log('[AuthContext] init - Found cached user, setting immediately:', cachedUser)
        setUser(cachedUser)
        clearPermissionCache()
        setLoading(false) // Set loading to false immediately for cached data
      } else {
        console.log('[AuthContext] init - No cached user found')
        setLoading(true)
      }
      
      try {
        console.log('[AuthContext] init - Getting session...')
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('[AuthContext] init - Session error:', sessionError)
          setUser(null)
          clearUserFromCache()
          // Clear any invalid tokens
          await supabase.auth.signOut()
          setLoading(false)
          return
        }
        
        if (!session?.user) {
          console.log('[AuthContext] init - No session found')
          setUser(null)
          clearUserFromCache()
          // Ensure clean state if no session
          await supabase.auth.signOut()
          setLoading(false)
        }
        
        // If we have a session but no cached user, we still need to set loading to false
        // The actual profile fetch will be handled by onAuthStateChange
        if (session?.user && !cachedUser) {
          console.log('[AuthContext] init - Session found but no cached user, will fetch via onAuthStateChange')
          setLoading(false)
        }
      } catch (err) {
        console.error('[AuthContext] init - CATCH ERROR:', err)
        setUser(null)
        clearUserFromCache()
        // Clear any invalid tokens on error
        await supabase.auth.signOut()
        setLoading(false)
      } finally {
        console.log('[AuthContext] init - Setting loading to false')
        setLoading(false)
      }
    }

    init()

    // Listen for sign in/out/password changes
    console.log('[AuthContext] Setting up auth state listener')
    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] Auth state change - event:', event, 'session:', !!session)
      
      try {
        if (session?.user) {
          console.log('[AuthContext] Auth state change - Fetching profile for user:', session.user.id)
          
          // Use React Query to fetch and cache user profile with timeout
          const freshProfile = await withTimeout(
            queryClient.fetchQuery({
              queryKey: queryKeys.userProfile(session.user.id),
              queryFn: () => fetchUserProfile(session.user.id),
              staleTime: Infinity, // Data never becomes stale automatically
              gcTime: Infinity, // Keep in cache indefinitely
            }),
            5000,
            'Profile fetch timed out during auth state change'
          )
          
          // Check if user account is active
          if (!freshProfile?.is_active) {
            console.log('[AuthContext] Auth state change - User account is inactive, signing out')
            setUser(null)
            clearUserFromCache()
            queryClient.removeQueries({ queryKey: queryKeys.userProfile(session.user.id) })
            await supabase.auth.signOut()
            return
          }
          
          // Compare with current user state to avoid unnecessary updates
          if (!deepEqual(user, freshProfile)) {
            console.log('[AuthContext] Auth state change - Profile changed, updating state and cache')
            setUser(freshProfile)
            saveUserToCache(freshProfile)
            clearPermissionCache()
            resetInactivityTimer() // Reset timer when user profile is updated
          } else {
            console.log('[AuthContext] Auth state change - Profile unchanged, keeping current state')
            resetInactivityTimer() // Still reset timer to maintain activity
          }
        } else {
          console.log('[AuthContext] Auth state change - No session, clearing user')
          setUser(null)
          clearUserFromCache()
          // Clear user profile from React Query cache when signing out
          if (user?.id) {
            queryClient.removeQueries({ queryKey: queryKeys.userProfile(user.id) })
          }
        }
        
        // Set loading to false after auth state change is processed
        if (loading) {
          setLoading(false)
        }
      } catch (err) {
        console.error('[AuthContext] Auth state change - ERROR:', err)
        // For auth state changes, be more graceful with errors
        if (err instanceof Error && err.message.includes('timed out')) {
          setError('Profile refresh timed out. Using existing session data.')
        } else {
          setError('Failed to refresh user profile. Some features may not work correctly.')
        }
        // Ensure loading is set to false even on error
        if (loading) {
          setLoading(false)
        }
      }
    })

    // Set up activity listeners for inactivity detection
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    const handleActivity = () => {
      resetInactivityTimer()
    }

    // Add event listeners for user activity
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    return () => {
      console.log('[AuthContext] Cleaning up auth state listener')
      subscription.subscription.unsubscribe()
      
      // Clean up activity listeners
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
      
      // Clear inactivity timer
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
        inactivityTimerRef.current = null
      }
    }
  }
  )

  /**
   * Signs in a user with email + password using Supabase auth.
   * If successful, fetches their extended profile and saves it locally.
   */
  const signIn = useCallback(async (email: string, password: string) => {
    console.log('[AuthContext] signIn START - email:', email)
    setLoading(true)
    setError(null)
    
    try {
      console.log('[AuthContext] signIn - Calling Supabase auth...')
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      
      if (error) {
        console.error('[AuthContext] signIn - Auth error:', error)
        throw error
      }

      if (data.user) {
        console.log('[AuthContext] signIn - Auth successful, fetching profile...')
        const profile = await withTimeout(
          fetchUserProfile(data.user.id),
          5000,
          'Profile fetch timed out during sign in'
        )

        // prevent inactive accounts from signing in
        if (!profile?.is_active) {
          console.error('[AuthContext] signIn - Account is inactive')
          await supabase.auth.signOut()
          throw new Error('Account is inactive')
        }

        setUser(profile)
        clearPermissionCache()
        saveUserToCache(profile)
        resetInactivityTimer() // Start inactivity timer after successful login
        console.log('[AuthContext] signIn SUCCESS - user set:', profile)
      }
    } catch (err: any) {
      console.error('[AuthContext] signIn ERROR:', err)
      setError(err.message)
      throw err
    } finally {
      console.log('[AuthContext] signIn - Setting loading to false')
      setLoading(false)
    }
  }, [resetInactivityTimer])

  /**
   * Logs the user out from Supabase and clears local state.
   */
  const signOut = useCallback(async () => {
    console.log('[AuthContext] signOut START')
    
    // Clear inactivity timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
      inactivityTimerRef.current = null
    }
    
    // Clear user profile from React Query cache
    if (user?.id) {
      queryClient.removeQueries({ queryKey: queryKeys.userProfile(user.id) })
    }
    
    // Clear cached user profile from localStorage
    clearUserFromCache()
    
    // Immediately clear user state and cache for instant UI feedback
    setUser(null)
    setError(null)
    console.log('[AuthContext] signOut - User state cleared immediately')
    
    try {
      console.log('[AuthContext] signOut - Calling Supabase auth signOut...')
      // Perform actual signout in background
      await supabase.auth.signOut()
      console.log('[AuthContext] signOut SUCCESS')
    } catch (err: any) {
      console.error('[AuthContext] signOut ERROR:', err)
      // Don't show error for signout failures - user is already logged out from UI perspective
    }
  }, [user])

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
      await refreshUser()
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
  const refreshUser = useCallback(async () => {
    console.log('[AuthContext] refreshUser START')
    
    if (!user) {
      console.log('[AuthContext] refreshUser - No user to refresh')
      return
    }
    
    try {
      console.log('[AuthContext] refreshUser - Getting current user...')
      const { data: { user: sessionUser }, error } = await supabase.auth.getUser()
      
      if (error) {
        console.error('[AuthContext] refreshUser - Error getting user:', error)
        return
      }
      
      if (sessionUser) {
        console.log('[AuthContext] refreshUser - Fetching fresh profile...')
        try {
          // Invalidate existing cache to force fresh fetch
          queryClient.invalidateQueries({ queryKey: queryKeys.userProfile(sessionUser.id) })
          
          // Use React Query to fetch fresh user profile
          const profile = await queryClient.fetchQuery({
            queryKey: queryKeys.userProfile(sessionUser.id),
            queryFn: () => fetchUserProfile(sessionUser.id),
            staleTime: Infinity, // Data never becomes stale automatically
            gcTime: Infinity, // Keep in cache indefinitely
          })
          
          // Check if user account is still active
          if (!profile?.is_active) {
            console.log('[AuthContext] refreshUser - User account is inactive, signing out')
            setUser(null)
            queryClient.removeQueries({ queryKey: queryKeys.userProfile(sessionUser.id) })
            await supabase.auth.signOut()
            return
          }
          
          setUser(profile)
          clearPermissionCache()
          saveUserToCache(profile)
          resetInactivityTimer() // Reset timer after successful refresh
          console.log('[AuthContext] refreshUser SUCCESS - profile updated:', profile)
        } catch (timeoutErr) {
          console.error('[AuthContext] refreshUser - TIMEOUT during refresh:', timeoutErr)
          setError('Profile refresh timed out. Using existing data.')
        }
      } else {
        console.log('[AuthContext] refreshUser - No session user found')
        setUser(null)
        clearUserFromCache()
        if (user?.id) {
          queryClient.removeQueries({ queryKey: queryKeys.userProfile(user.id) })
        }
      }
    } catch (err) {
      console.error('[AuthContext] refreshUser ERROR:', err)
      setError('Failed to refresh user profile. Using existing data.')
    }
  }, [user, resetInactivityTimer])

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

  console.log('[AuthContext] Render - user:', !!user, 'loading:', loading, 'error:', error)

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, // Show loading during initial session check
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